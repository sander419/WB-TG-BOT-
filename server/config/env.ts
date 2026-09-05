/**
 * Типизированная загрузка окружения.
 *
 * Принципы:
 *  - Ни один секрет не хардкодится в коде и не попадает в git (.env в .gitignore).
 *  - Приложение поднимается даже без части секретов: неготовые подсистемы
 *    отключаются явно и говорят об этом в /api/platform/health, а не падают молча.
 *  - Обязателен только минимум, без которого не поднимается HTTP-слой.
 */
import 'dotenv/config';
import { z } from 'zod';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const boolean = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value.trim() === '' ? defaultValue : TRUE_VALUES.has(value.trim().toLowerCase()),
    );

/** Пустая строка в .env — это «не задано», а не значение. */
const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === '' ? undefined : trimmed;
  });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Публичный URL приложения. Нужен для Telegram-webhook и OAuth-редиректов. */
  APP_URL: optionalString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // --- Хранилище -----------------------------------------------------------
  DATABASE_URL: optionalString,
  DATABASE_SSL: boolean(false),
  DATABASE_MAX_POOL: z.coerce.number().int().positive().default(10),

  // --- Криптография --------------------------------------------------------
  /** base64 от 32 байт. Генерация: npm run gen:key */
  SECRETS_ENCRYPTION_KEY: optionalString,

  // --- AI ------------------------------------------------------------------
  GEMINI_API_KEY: optionalString,

  // --- Telegram ------------------------------------------------------------
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_MODE: z.enum(['disabled', 'polling', 'webhook']).default('disabled'),
  /** Проверяется в заголовке X-Telegram-Bot-Api-Secret-Token. Обязателен для webhook. */
  TELEGRAM_WEBHOOK_SECRET: optionalString,

  // --- Интернационализация -------------------------------------------------
  DEFAULT_LOCALE: z.enum(['ru', 'en']).default('ru'),
  DEFAULT_TIMEZONE: z.string().default('Europe/Moscow'),
  DEFAULT_CURRENCY: z.string().length(3).default('RUB'),

  // --- Фичефлаги -----------------------------------------------------------
  /** true — отдавать демо-данные из src/data/mockStore вместо реальных коннекторов. */
  USE_MOCK_DATA: boolean(true),
  /** Разрешить коннекторам писать в маркетплейс (цены, остатки). По умолчанию read-only. */
  ALLOW_MARKETPLACE_WRITES: boolean(false),
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Некорректное окружение. Проверь .env (образец — .env.example):\n${details}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Готовность подсистем. Источник правды для /api/platform/health и стартового лога. */
export interface SubsystemStatus {
  name: string;
  configured: boolean;
  /** Что именно не хватает, человекочитаемо. */
  missing: string[];
}

export function subsystemStatuses(): SubsystemStatus[] {
  const telegramMissing: string[] = [];
  if (!env.TELEGRAM_BOT_TOKEN) telegramMissing.push('TELEGRAM_BOT_TOKEN');
  if (env.TELEGRAM_MODE === 'webhook' && !env.TELEGRAM_WEBHOOK_SECRET) telegramMissing.push('TELEGRAM_WEBHOOK_SECRET');
  if (env.TELEGRAM_MODE === 'webhook' && !env.APP_URL) telegramMissing.push('APP_URL');
  if (env.TELEGRAM_MODE === 'disabled') telegramMissing.push('TELEGRAM_MODE (сейчас disabled)');

  return [
    {
      name: 'database',
      configured: Boolean(env.DATABASE_URL),
      missing: env.DATABASE_URL ? [] : ['DATABASE_URL'],
    },
    {
      name: 'secrets',
      configured: Boolean(env.SECRETS_ENCRYPTION_KEY),
      missing: env.SECRETS_ENCRYPTION_KEY ? [] : ['SECRETS_ENCRYPTION_KEY'],
    },
    {
      name: 'ai',
      configured: Boolean(env.GEMINI_API_KEY),
      missing: env.GEMINI_API_KEY ? [] : ['GEMINI_API_KEY'],
    },
    {
      name: 'telegram',
      configured: telegramMissing.length === 0,
      missing: telegramMissing,
    },
  ];
}

/**
 * Достаёт обязательное значение или бросает понятную ошибку.
 * Использовать в точке, где подсистема реально нужна, а не на старте процесса.
 */
export function requireEnv<K extends keyof Env>(key: K, hint?: string): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Не задана переменная окружения ${String(key)}.${hint ? ` ${hint}` : ''}`);
  }
  return value as NonNullable<Env[K]>;
}
