/**
 * Логгер. В dev — читаемый вывод, в проде — JSON-строки для сборщика логов.
 *
 * redact закрывает поля, в которых чаще всего утекают токены продавца.
 * Правило: секрет не логируем даже в debug — только имя переменной.
 */
import pino from 'pino';
import { env, isProduction } from '../config/env';

const REDACT_PATHS = [
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'Authorization',
  'password',
  'secret',
  'credentials',
  '*.token',
  '*.apiKey',
  '*.authorization',
  'headers.authorization',
  'headers.Authorization',
  'req.headers.authorization',
  'config.headers.Authorization',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: { service: 'commerceos' },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
        },
      }),
});

export type Logger = typeof logger;

/** Дочерний логгер с постоянным контекстом (tenant/store/marketplace). */
export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings) as Logger;
}

/** Маскирует токен для сообщений вида «использую ключ ab12…ef90». */
export function maskSecret(value: string | undefined): string {
  if (!value) return '(не задан)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
