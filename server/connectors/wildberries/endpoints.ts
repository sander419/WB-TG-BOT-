/**
 * Карта API Wildberries: хосты, пути, лимиты.
 *
 * ⚠️ ВАЖНО. Значения ниже собраны по памяти о публичной документации WB и НЕ
 * проверены запросами. WB регулярно переносит методы между хостами и версиями.
 * Перед первым боевым вызовом каждый путь и лимит сверить с https://dev.wildberries.ru
 * и снять пометку VERIFY. Чек-лист сверки — docs/INTEGRATION-WILDBERRIES.md.
 *
 * Хосты вынесены отдельно потому, что WB считает лимиты на каждую группу API
 * независимо, и токен продавца выпускается под конкретный набор категорий.
 */
import type { RateLimitConfig } from '../../core/rateLimiter';

export type WbApiGroup =
  | 'common'
  | 'content'
  | 'prices'
  | 'marketplace'
  | 'statistics'
  | 'analytics'
  | 'advert'
  | 'feedbacks';

export interface WbApiGroupConfig {
  baseUrl: string;
  /** Категория доступа, которую нужно отметить при выпуске токена в ЛК продавца. */
  tokenScope: string;
  /** Лимит по документации. VERIFY — не подтверждён запросом. */
  rateLimit: RateLimitConfig;
  verified: boolean;
}

export const WB_API_GROUPS: Record<WbApiGroup, WbApiGroupConfig> = {
  common: {
    baseUrl: 'https://common-api.wildberries.ru',
    tokenScope: 'Любая категория',
    rateLimit: { capacity: 60, intervalMs: 60_000 },
    verified: false,
  },
  content: {
    baseUrl: 'https://content-api.wildberries.ru',
    tokenScope: 'Контент',
    rateLimit: { capacity: 100, intervalMs: 60_000 },
    verified: false,
  },
  prices: {
    baseUrl: 'https://discounts-prices-api.wildberries.ru',
    tokenScope: 'Цены и скидки',
    rateLimit: { capacity: 10, intervalMs: 6_000 },
    verified: false,
  },
  marketplace: {
    baseUrl: 'https://marketplace-api.wildberries.ru',
    tokenScope: 'Маркетплейс',
    rateLimit: { capacity: 300, intervalMs: 60_000 },
    verified: false,
  },
  statistics: {
    baseUrl: 'https://statistics-api.wildberries.ru',
    tokenScope: 'Статистика',
    rateLimit: { capacity: 1, intervalMs: 60_000 },
    verified: false,
  },
  analytics: {
    baseUrl: 'https://seller-analytics-api.wildberries.ru',
    tokenScope: 'Аналитика',
    rateLimit: { capacity: 3, intervalMs: 60_000 },
    verified: false,
  },
  advert: {
    baseUrl: 'https://advert-api.wildberries.ru',
    tokenScope: 'Продвижение',
    rateLimit: { capacity: 300, intervalMs: 60_000 },
    verified: false,
  },
  feedbacks: {
    baseUrl: 'https://feedbacks-api.wildberries.ru',
    tokenScope: 'Вопросы и отзывы',
    rateLimit: { capacity: 60, intervalMs: 60_000 },
    verified: false,
  },
};

export interface WbEndpoint {
  group: WbApiGroup;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  /** Краткое описание для логов и документации. */
  purpose: string;
  verified: boolean;
}

/**
 * Пути, которые нужны на первом этапе. Список намеренно короткий: сначала
 * поднимаем чтение (карточки, остатки, продажи, отзывы), запись — после того,
 * как чтение отработает на боевом токене хотя бы сутки.
 */
export const WB_ENDPOINTS = {
  ping: { group: 'common', method: 'GET', path: '/ping', purpose: 'Проверка живости API и токена', verified: false },
  sellerInfo: {
    group: 'common',
    method: 'GET',
    path: '/api/v1/seller-info',
    purpose: 'Имя продавца — подтверждает, что токен от нужного аккаунта',
    verified: false,
  },
  cardsList: {
    group: 'content',
    method: 'POST',
    path: '/content/v2/get/cards/list',
    purpose: 'Список карточек товаров с курсорной пагинацией',
    verified: false,
  },
  goodsFilter: {
    group: 'prices',
    method: 'GET',
    path: '/api/v2/list/goods/filter',
    purpose: 'Текущие цены и скидки по номенклатурам',
    verified: false,
  },
  pricesUpload: {
    group: 'prices',
    method: 'POST',
    path: '/api/v2/upload/task',
    purpose: 'Асинхронная установка цен и скидок',
    verified: false,
  },
  warehouses: {
    group: 'marketplace',
    method: 'GET',
    path: '/api/v3/warehouses',
    purpose: 'Склады продавца (FBS)',
    verified: false,
  },
  stocksBySku: {
    group: 'marketplace',
    method: 'POST',
    path: '/api/v3/stocks/{warehouseId}',
    purpose: 'Остатки FBS по складу',
    verified: false,
  },
  stocksUpdate: {
    group: 'marketplace',
    method: 'PUT',
    path: '/api/v3/stocks/{warehouseId}',
    purpose: 'Обновление остатков FBS',
    verified: false,
  },
  supplierStocks: {
    group: 'statistics',
    method: 'GET',
    path: '/api/v1/supplier/stocks',
    purpose: 'Остатки на складах WB (FBO)',
    verified: false,
  },
  supplierOrders: {
    group: 'statistics',
    method: 'GET',
    path: '/api/v1/supplier/orders',
    purpose: 'Заказы за период',
    verified: false,
  },
  supplierSales: {
    group: 'statistics',
    method: 'GET',
    path: '/api/v1/supplier/sales',
    purpose: 'Продажи и возвраты за период',
    verified: false,
  },
  feedbacks: {
    group: 'feedbacks',
    method: 'GET',
    path: '/api/v1/feedbacks',
    purpose: 'Отзывы покупателей',
    verified: false,
  },
  feedbackAnswer: {
    group: 'feedbacks',
    method: 'PATCH',
    path: '/api/v1/feedbacks',
    purpose: 'Ответ на отзыв',
    verified: false,
  },
  advertCampaigns: {
    group: 'advert',
    method: 'GET',
    path: '/adv/v1/promotion/count',
    purpose: 'Список рекламных кампаний',
    verified: false,
  },
} as const satisfies Record<string, WbEndpoint>;

export type WbEndpointName = keyof typeof WB_ENDPOINTS;

/** Подставляет параметры пути: '/api/v3/stocks/{warehouseId}' + { warehouseId: 42 }. */
export function buildPath(path: string, params?: Record<string, string | number>): string {
  if (!params) return path;
  return path.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) throw new Error(`Не передан параметр пути {${key}} для ${path}`);
    return encodeURIComponent(String(value));
  });
}

/** Список непроверенных путей — печатается в лог при старте, чтобы не забыть сверить. */
export function unverifiedEndpoints(): string[] {
  return Object.entries(WB_ENDPOINTS)
    .filter(([, endpoint]) => !endpoint.verified)
    .map(([name, endpoint]) => `${name} (${endpoint.method} ${endpoint.path})`);
}
