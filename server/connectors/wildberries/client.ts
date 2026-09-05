/**
 * Низкоуровневый HTTP-клиент Wildberries.
 *
 * Отвечает только за транспорт: авторизация, выбор хоста по группе API,
 * лимитер на пару (магазин, группа), единый разбор ошибок.
 * Нормализация данных — этажом выше, в index.ts.
 */
import { httpJson } from '../../core/http';
import { rateLimiters } from '../../core/rateLimiter';
import { ConnectorError } from '../../core/errors';
import type { ConnectorContext } from '../types';
import { WB_API_GROUPS, WB_ENDPOINTS, buildPath, type WbEndpointName } from './endpoints';

const SOURCE = 'wildberries';

export interface WbCallOptions {
  /** Параметры для подстановки в путь: {warehouseId}. */
  pathParams?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

export class WildberriesClient {
  constructor(private readonly ctx: ConnectorContext) {}

  private get token(): string {
    const token = this.ctx.credentials.apiKey;
    if (!token) {
      throw new ConnectorError(SOURCE, 'У магазина не задан API-токен Wildberries.', { code: 'AUTH_ERROR' });
    }
    return token;
  }

  /**
   * Вызов метода WB по имени из карты эндпоинтов.
   * Именно через карту, а не по строке URL: так все пути видны в одном файле
   * и их можно разом сверить с документацией.
   */
  async call<T = unknown>(name: WbEndpointName, options: WbCallOptions = {}): Promise<T> {
    const endpoint = WB_ENDPOINTS[name];
    const group = WB_API_GROUPS[endpoint.group];
    const limiter = rateLimiters.get(`wb:${this.ctx.storeId}:${endpoint.group}`, group.rateLimit);

    const url = `${group.baseUrl}${buildPath(endpoint.path, options.pathParams)}`;

    const response = await httpJson<T>(url, {
      method: endpoint.method,
      // WB ожидает токен в Authorization без префикса Bearer. VERIFY по документации.
      headers: { Authorization: this.token },
      ...(options.query === undefined ? {} : { query: options.query }),
      ...(options.body === undefined ? {} : { body: options.body }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      ...(options.retries === undefined ? {} : { retries: options.retries }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      rateLimiter: limiter,
      source: SOURCE,
      operation: `wb.${name}`,
    });

    return response.data;
  }

  /**
   * Проба доступности и токена.
   *
   * Проверено запросом 05.09.2026: без валидного токена /ping отвечает 401,
   * а не 200. Значит это не проверка живости, а проверка авторизации —
   * и «не ответил» здесь означало бы неправду про недоступный хост.
   */
  async probe(): Promise<'ok' | 'unauthorized' | 'unreachable'> {
    try {
      await this.call('ping', { retries: 0, timeoutMs: 15_000 });
      return 'ok';
    } catch (error) {
      if (error instanceof ConnectorError) {
        if (error.code === 'AUTH_ERROR') return 'unauthorized';
        // 4xx с живого хоста — тоже связь есть, просто ответ не тот.
        if (error.httpStatusUpstream !== undefined) return 'unauthorized';
      }
      return 'unreachable';
    }
  }
}
