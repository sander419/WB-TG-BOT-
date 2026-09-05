/**
 * Единая таксономия ошибок платформы.
 *
 * Зачем: коннекторы к разным маркетплейсам отдают несовместимые форматы ошибок.
 * Всё, что уходит выше слоя коннектора, приводится к этим типам — тогда ретраи,
 * алерты в Telegram и коды HTTP считаются в одном месте, а не в каждом клиенте.
 */

export type ErrorCode =
  | 'CONFIG_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

const HTTP_STATUS: Record<ErrorCode, number> = {
  CONFIG_ERROR: 503,
  NOT_IMPLEMENTED: 501,
  VALIDATION_ERROR: 400,
  AUTH_ERROR: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

export interface AppErrorOptions {
  code?: ErrorCode;
  /** Можно ли повторить запрос без изменения входных данных. */
  retryable?: boolean;
  /** Сколько подождать перед ретраем, мс (из Retry-After, если был). */
  retryAfterMs?: number;
  /** Произвольный контекст для логов. Секреты сюда класть нельзя. */
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;
  readonly context: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.context = options.context ?? {};
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }

  /** Безопасное представление для отдачи наружу: без stack и без cause. */
  toPublicJson(): { error: { code: ErrorCode; message: string; retryable: boolean } } {
    return { error: { code: this.code, message: this.message, retryable: this.retryable } };
  }
}

export class ConfigError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'CONFIG_ERROR', context: context ?? {} });
  }
}

/**
 * Метод каркаса, который ещё не реализован.
 * `docRef` — ссылка на раздел документации, где описано, что именно надо дописать.
 */
export class NotImplementedError extends AppError {
  constructor(what: string, docRef?: string) {
    super(`Не реализовано: ${what}.${docRef ? ` См. ${docRef}` : ''}`, {
      code: 'NOT_IMPLEMENTED',
      context: docRef ? { docRef } : {},
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'VALIDATION_ERROR', context: context ?? {} });
  }
}

/** Ошибка вызова внешнего API маркетплейса. */
export class ConnectorError extends AppError {
  readonly marketplace: string;
  readonly httpStatusUpstream: number | undefined;

  constructor(
    marketplace: string,
    message: string,
    options: AppErrorOptions & { httpStatusUpstream?: number } = {},
  ) {
    super(message, { ...options, context: { ...options.context, marketplace } });
    this.marketplace = marketplace;
    this.httpStatusUpstream = options.httpStatusUpstream;
  }
}

/** Классификация HTTP-ответа маркетплейса в наш код ошибки. */
export function classifyUpstreamStatus(status: number): { code: ErrorCode; retryable: boolean } {
  if (status === 401 || status === 403) return { code: 'AUTH_ERROR', retryable: false };
  if (status === 404) return { code: 'NOT_FOUND', retryable: false };
  if (status === 408) return { code: 'TIMEOUT', retryable: true };
  if (status === 429) return { code: 'RATE_LIMITED', retryable: true };
  if (status >= 500) return { code: 'UPSTREAM_ERROR', retryable: true };
  if (status >= 400) return { code: 'VALIDATION_ERROR', retryable: false };
  return { code: 'INTERNAL_ERROR', retryable: false };
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(error.message, { cause: error });
  }
  return new AppError(String(error));
}
