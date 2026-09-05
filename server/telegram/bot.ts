/**
 * Telegram-бот на grammY.
 *
 * Состояние: каркас, который реально запускается. Команды разобраны, локаль
 * определяется, ошибки не роняют процесс. Данные пока не подключены — команды,
 * которым нужен маркетплейс, отвечают честной заглушкой вместо выдуманных цифр.
 *
 * Режимы (TELEGRAM_MODE):
 *   disabled — бот не поднимается (по умолчанию, чтобы не дёргать API без нужды);
 *   polling  — long polling, для локальной разработки без публичного URL;
 *   webhook  — приём апдейтов на /api/telegram/webhook, для прода.
 *
 * Почему не одно и то же: два процесса в polling с одним токеном конфликтуют,
 * а webhook требует HTTPS и публичный APP_URL.
 */
import { Bot, GrammyError, HttpError } from 'grammy';
import { env } from '../config/env';
import { logger } from '../core/logger';
import { resolveLocale, type Locale } from '../i18n';
import { registerCommands } from './commands';
import { getPreferences } from './state';

export interface BotContextInfo {
  locale: Locale;
}

let bot: Bot | null = null;

export function isTelegramEnabled(): boolean {
  return env.TELEGRAM_MODE !== 'disabled' && Boolean(env.TELEGRAM_BOT_TOKEN);
}

/** Возвращает singleton-бота или null, если он не сконфигурирован. */
export function getBot(): Bot | null {
  if (bot) return bot;
  if (!isTelegramEnabled()) return null;

  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  bot = new Bot(token);

  bot.catch((err) => {
    const error = err.error;
    if (error instanceof GrammyError) {
      logger.error({ description: error.description, method: error.method }, 'Ошибка Telegram API');
    } else if (error instanceof HttpError) {
      logger.error({ err: error }, 'Сеть недоступна при обращении к Telegram');
    } else {
      logger.error({ err: error }, 'Необработанная ошибка в обработчике бота');
    }
  });

  registerCommands(bot);
  logger.info({ mode: env.TELEGRAM_MODE }, 'Telegram-бот сконфигурирован');
  return bot;
}

/** Локаль пользователя: сохранённая настройка → язык клиента Telegram → дефолт из env. */
export function localeFor(telegramUserId: number | undefined, languageCode: string | undefined): Locale {
  const saved = telegramUserId === undefined ? undefined : getPreferences(telegramUserId)?.locale;
  if (saved) return saved;
  return resolveLocale(languageCode, env.DEFAULT_LOCALE);
}

/**
 * Запуск бота. Для polling не блокирует: grammY сам крутит цикл.
 * Для webhook ничего не запускает — апдейты придут в express-роут.
 */
export async function startTelegramBot(): Promise<void> {
  const instance = getBot();
  if (!instance) {
    logger.info('Telegram-бот выключен (TELEGRAM_MODE=disabled или нет токена)');
    return;
  }

  await instance.api.setMyCommands([
    { command: 'start', description: 'Начать' },
    { command: 'help', description: 'Список команд' },
    { command: 'digest', description: 'Сводка за сутки' },
    { command: 'sales', description: 'Продажи и выручка' },
    { command: 'stocks', description: 'Остатки' },
    { command: 'problems', description: 'Что просело и почему' },
    { command: 'reviews', description: 'Новые отзывы' },
    { command: 'stores', description: 'Мои магазины' },
    { command: 'link', description: 'Привязать магазин' },
    { command: 'lang', description: 'Язык / Language' },
  ]);

  if (env.TELEGRAM_MODE === 'polling') {
    // Не await: start() резолвится только после остановки бота.
    void instance.start({
      onStart: (info) => logger.info({ username: info.username }, 'Telegram-бот запущен в режиме polling'),
    });
    return;
  }

  if (env.TELEGRAM_MODE === 'webhook') {
    if (!env.APP_URL || !env.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn('Webhook не установлен: нужны APP_URL и TELEGRAM_WEBHOOK_SECRET');
      return;
    }
    const url = new URL('/api/telegram/webhook', env.APP_URL).toString();
    await instance.api.setWebhook(url, { secret_token: env.TELEGRAM_WEBHOOK_SECRET });
    logger.info({ url }, 'Telegram webhook установлен');
  }
}

export async function stopTelegramBot(): Promise<void> {
  if (!bot) return;
  await bot.stop();
  bot = null;
  logger.info('Telegram-бот остановлен');
}
