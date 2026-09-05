/**
 * Команды бота.
 *
 * Каждая команда, которой нужны данные маркетплейса, сейчас отвечает заглушкой
 * с пометкой. Это сознательно: показать выдуманные цифры продавцу — хуже,
 * чем сказать «ещё не подключено». Реализация — docs/ROADMAP.md, этап 3.
 */
import { InlineKeyboard, type Bot } from 'grammy';
import { logger } from '../core/logger';
import { t, type Locale } from '../i18n';
import { localeFor } from './bot';
import { hasLinkedStore, setPreferences } from './state';

/** Команды, которые ждут коннектора. Ответ — единый честный текст. */
const DATA_COMMANDS = ['digest', 'sales', 'stocks', 'problems', 'reviews', 'stores'] as const;

export function registerCommands(bot: Bot): void {
  bot.command('start', async (ctx) => {
    const locale = localeFor(ctx.from?.id, ctx.from?.language_code);
    if (ctx.from) setPreferences(ctx.from.id, { locale });
    await ctx.reply(t(locale, 'bot.start.greeting'));
  });

  bot.command('help', async (ctx) => {
    const locale = localeFor(ctx.from?.id, ctx.from?.language_code);
    await ctx.reply(`${t(locale, 'bot.help.title')}\n\n${t(locale, 'bot.help.body')}`);
  });

  bot.command('lang', async (ctx) => {
    const locale = localeFor(ctx.from?.id, ctx.from?.language_code);
    const keyboard = new InlineKeyboard().text('Русский', 'lang:ru').text('English', 'lang:en');
    await ctx.reply(t(locale, 'bot.lang.prompt'), { reply_markup: keyboard });
  });

  bot.callbackQuery(/^lang:(ru|en)$/, async (ctx) => {
    const chosen = ctx.match?.[1] as Locale | undefined;
    if (!chosen || !ctx.from) {
      await ctx.answerCallbackQuery();
      return;
    }
    setPreferences(ctx.from.id, { locale: chosen });
    await ctx.answerCallbackQuery();
    await ctx.reply(t(chosen, 'bot.lang.changed'));
  });

  bot.command('link', async (ctx) => {
    const locale = localeFor(ctx.from?.id, ctx.from?.language_code);
    const code = ctx.match?.trim();
    if (!code) {
      await ctx.reply(t(locale, 'bot.link.prompt'));
      return;
    }
    // TODO: проверить код в telegram_link_codes, привязать организацию и магазин.
    logger.info({ telegramUserId: ctx.from?.id }, 'Попытка привязки магазина (заглушка)');
    await ctx.reply(`${t(locale, 'bot.link.invalid')}\n\n${t(locale, 'bot.stub.notice')}`);
  });

  for (const command of DATA_COMMANDS) {
    bot.command(command, async (ctx) => {
      const locale = localeFor(ctx.from?.id, ctx.from?.language_code);
      if (ctx.from && !hasLinkedStore(ctx.from.id)) {
        await ctx.reply(t(locale, 'bot.error.no_store'));
        return;
      }
      await ctx.reply(t(locale, 'bot.not_implemented', { command: `/${command}` }));
    });
  }

  // Свободный текст пойдёт в AI-оркестратор, когда он будет подключён к реальным данным.
  bot.on('message:text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    const locale = localeFor(ctx.from?.id, ctx.from?.language_code);
    await ctx.reply(`${t(locale, 'bot.stub.notice')}\n\n${t(locale, 'bot.help.body')}`);
  });
}
