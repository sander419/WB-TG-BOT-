/**
 * Команды бота.
 *
 * Команды данных работают на настоящих цифрах из БД, когда магазин привязан.
 * Если БД нет или магазин не привязан — честная подсказка, а не выдуманные числа.
 * Команды, под которые ещё нет источника (позиции в поиске), так и говорят.
 */
import { InlineKeyboard, type Bot, type Context } from 'grammy';
import { toAppError } from '../core/errors';
import { logger } from '../core/logger';
import { t, type Locale } from '../i18n';
import { listStores } from '../db/repositories/stores';
import { buildDailyDigest, buildStockReport } from '../services/digest';
import { diagnoseStore } from '../services/diagnostics';
import { buildReviewFeed } from '../services/reviews';
import { requestSync } from '../services/stores';
import {
  formatDiagnosis,
  formatDigest,
  formatReviewFeed,
  formatStockReport,
  formatStores,
} from './format';
import { linkByCode, loadSession, rememberLocale, storeScope, type BotSession, type StoreScope } from './session';

async function sessionFor(ctx: Context): Promise<BotSession | undefined> {
  const from = ctx.from;
  const chatId = ctx.chat?.id;
  if (!from || chatId === undefined) return undefined;
  return loadSession(from.id, chatId, from.language_code);
}

/**
 * Общая обёртка: любая ошибка внутри команды превращается в понятный ответ.
 * Без неё падение запроса к БД оставляет пользователя без ответа вообще.
 */
function guard(handler: (ctx: Context, session: BotSession) => Promise<void>) {
  return async (ctx: Context): Promise<void> => {
    const session = await sessionFor(ctx);
    if (!session) return;

    try {
      await handler(ctx, session);
    } catch (error) {
      const appError = toAppError(error);
      logger.error({ err: appError, telegramUserId: session.telegramUserId }, 'Команда бота упала');
      await ctx.reply(t(session.locale, 'bot.error.generic'));
    }
  };
}

/** Проверяет, что магазин привязан; иначе отвечает подсказкой. */
async function requireStore(ctx: Context, session: BotSession): Promise<StoreScope | undefined> {
  const scope = storeScope(session);
  if (scope) return scope;
  await ctx.reply(t(session.locale, 'bot.error.no_store'));
  return undefined;
}

export function registerCommands(bot: Bot): void {
  bot.command(
    'start',
    guard(async (ctx, session) => {
      await rememberLocale(session, session.locale);
      const scope = storeScope(session);
      if (scope) {
        const stores = await listStores(scope.organizationId);
        const active = stores.find((store) => store.id === scope.activeStoreId);
        await ctx.reply(
          t(session.locale, 'bot.start.linked', {
            name: ctx.from?.first_name ?? '',
            store: active?.name ?? '—',
          }),
        );
        return;
      }
      await ctx.reply(t(session.locale, 'bot.start.greeting'));
    }),
  );

  bot.command(
    'help',
    guard(async (ctx, session) => {
      await ctx.reply(`${t(session.locale, 'bot.help.title')}\n\n${t(session.locale, 'bot.help.body')}`);
    }),
  );

  bot.command(
    'lang',
    guard(async (ctx, session) => {
      const keyboard = new InlineKeyboard().text('Русский', 'lang:ru').text('English', 'lang:en');
      await ctx.reply(t(session.locale, 'bot.lang.prompt'), { reply_markup: keyboard });
    }),
  );

  bot.callbackQuery(/^lang:(ru|en)$/, async (ctx) => {
    const chosen = ctx.match?.[1] as Locale | undefined;
    const session = await sessionFor(ctx);
    await ctx.answerCallbackQuery();
    if (!chosen || !session) return;

    await rememberLocale(session, chosen);
    await ctx.reply(t(chosen, 'bot.lang.changed'));
  });

  bot.command(
    'link',
    guard(async (ctx, session) => {
      // ctx.match для команды — строка аргументов; типы grammY допускают и массив.
      const code = typeof ctx.match === 'string' ? ctx.match.trim() : '';
      if (!code) {
        await ctx.reply(t(session.locale, 'bot.link.prompt'));
        return;
      }

      const outcome = await linkByCode(session, code);
      if (!outcome.ok) {
        await ctx.reply(t(session.locale, 'bot.link.invalid'));
        return;
      }

      const stores = outcome.organizationId ? await listStores(outcome.organizationId) : [];
      const linked = stores.find((store) => store.id === outcome.storeId);
      await ctx.reply(t(session.locale, 'bot.link.success', { store: linked?.name ?? '—' }));
    }),
  );

  bot.command(
    'stores',
    guard(async (ctx, session) => {
      if (!session.organizationId) {
        await ctx.reply(t(session.locale, 'bot.error.no_store'));
        return;
      }
      const stores = await listStores(session.organizationId);
      if (stores.length === 0) {
        await ctx.reply(t(session.locale, 'bot.error.no_store'));
        return;
      }
      await ctx.reply(formatStores(stores, session.locale));
    }),
  );

  // Сводка и продажи считаются одинаково; /sales — привычный синоним.
  for (const command of ['digest', 'sales'] as const) {
    bot.command(
      command,
      guard(async (ctx, session) => {
        const scope = await requireStore(ctx, session);
        if (!scope) return;

        const digest = await buildDailyDigest(scope.organizationId, scope.activeStoreId);
        await ctx.reply(formatDigest(digest, session.locale));
      }),
    );
  }

  bot.command(
    'stocks',
    guard(async (ctx, session) => {
      const scope = await requireStore(ctx, session);
      if (!scope) return;

      const report = await buildStockReport(scope.organizationId, scope.activeStoreId);
      await ctx.reply(formatStockReport(report, session.locale));
    }),
  );

  /** Разбор просадки: причины считает код, не модель. */
  bot.command(
    'problems',
    guard(async (ctx, session) => {
      const scope = await requireStore(ctx, session);
      if (!scope) return;

      const { storeName, report } = await diagnoseStore(scope.organizationId, scope.activeStoreId);
      await ctx.reply(formatDiagnosis(report, storeName, session.locale));
    }),
  );

  /** Отзывы без ответа, худшие сверху. */
  bot.command(
    'reviews',
    guard(async (ctx, session) => {
      const scope = await requireStore(ctx, session);
      if (!scope) return;

      const feed = await buildReviewFeed(scope.organizationId, scope.activeStoreId);
      await ctx.reply(formatReviewFeed(feed, session.locale));
    }),
  );

  /** Ручная синхронизация: ставит задачи в очередь, выполнит воркер. */
  bot.command(
    'sync',
    guard(async (ctx, session) => {
      const scope = await requireStore(ctx, session);
      if (!scope) return;

      const jobs = await requestSync(scope.organizationId, scope.activeStoreId);
      await ctx.reply(t(session.locale, 'bot.sync.queued', { count: jobs.length }));
    }),
  );

  // Свободный текст пойдёт в AI-оркестратор, когда он будет считать по данным из БД.
  bot.on('message:text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    const session = await sessionFor(ctx);
    if (!session) return;
    await ctx.reply(`${t(session.locale, 'bot.stub.notice')}\n\n${t(session.locale, 'bot.help.body')}`);
  });
}
