/**
 * HTTP-клиент для внешних API: таймаут, ретраи с экспоненциальной задержкой,
 * уважение Retry-After, единая классификация ошибок, лимитер.
 *
 * Весь трафик к маркетплейсам должен идти через него — тогда лимиты, ретраи
 * и логи считаются в одном месте, а не копипастятся в каждый коннектор.
 */
import { ConnectorError, classifyUpstreamStatus } from './errors';
import { logger } from './logger';
import type { RateLimiter } from './rateLimiter';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  /** Сколько раз повторить при временной ошибке. 0 — без ретраев. */
  retries?: number;
  rateLimiter?: RateLimiter;
  /** Для сообщений об ошибках и логов: 'wildberries' | 'ozon' | ... */
  source: string;
  /** Метка операции для логов, например 'content.cards.list'. */
  operation?: string;
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

function buildUrl(url: string, query: HttpRequestOptions['query']): string {
  if (!query) return url;
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}

function parseRetryAfter(headers: Headers): number | undefined {
  const raw = headers.get('retry-after');
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function backoffDelay(attempt: number): number {
  const base = Math.min(8_000, 500 * 2 ** attempt);
  return base + Math.random() * 250;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Выполняет запрос и разбирает JSON. Кидает ConnectorError на любой не-2xx.
 * Тело ошибки обрезается до 500 символов — в ответах маркетплейсов бывают простыни HTML.
 */
export async function httpJson<T = unknown>(url: string, options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    query,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    rateLimiter,
    source,
    operation,
    signal,
  } = options;

  const fullUrl = buildUrl(url, query);
  const log = logger.child({ source, operation: operation ?? `${method} ${new URL(fullUrl).pathname}` });

  let lastError: ConnectorError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (rateLimiter) await rateLimiter.acquire();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener('abort', onExternalAbort, { once: true });

    const startedAt = Date.now();
    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;
      const text = await response.text();
      let data: unknown = null;
      if (text.length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const { code, retryable } = classifyUpstreamStatus(response.status);
        const retryAfterMs = parseRetryAfter(response.headers);
        const snippet = text.slice(0, 500);
        lastError = new ConnectorError(source, `HTTP ${response.status} от ${source}: ${snippet || '(пустое тело)'}`, {
          code,
          retryable,
          ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
          httpStatusUpstream: response.status,
          context: { operation, durationMs },
        });

        if (retryable && attempt < retries) {
          const delay = retryAfterMs ?? backoffDelay(attempt);
          log.warn({ status: response.status, attempt, delay }, 'Временная ошибка внешнего API, повтор');
          await sleep(delay);
          continue;
        }
        throw lastError;
      }

      log.debug({ status: response.status, durationMs }, 'Внешний запрос выполнен');
      return { status: response.status, data: data as T, headers: response.headers };
    } catch (error) {
      if (error instanceof ConnectorError) {
        if (!error.retryable || attempt >= retries) throw error;
        lastError = error;
      } else {
        const aborted = error instanceof Error && error.name === 'AbortError';
        lastError = new ConnectorError(
          source,
          aborted ? `Таймаут ${timeoutMs} мс при обращении к ${source}` : `Сетевая ошибка при обращении к ${source}`,
          {
            code: aborted ? 'TIMEOUT' : 'UPSTREAM_ERROR',
            retryable: true,
            cause: error,
            context: { operation },
          },
        );
        if (attempt >= retries) throw lastError;
        await sleep(backoffDelay(attempt));
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError ?? new ConnectorError(source, `Запрос к ${source} не выполнен`);
}
