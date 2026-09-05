/**
 * Контракт коннектора маркетплейса — главный шов проекта.
 *
 * Идея: вся остальная система (бот, дашборд, движок правил, AI-оркестратор)
 * работает только с нормализованными типами отсюда и НЕ знает, что за площадка
 * под капотом. Добавление Ozon, Shopify или 1688 = новый файл, реализующий
 * MarketplaceConnector, и строчка в registry.ts. Ни одна строка в UI и боте
 * при этом не меняется.
 *
 * Правила нормализации:
 *  - деньги — Money (целые минорные единицы + ISO-код валюты), см. core/money.ts;
 *  - время — ISO-8601 в UTC, строкой;
 *  - идентификаторы площадки хранятся как есть в externalId, наш внутренний id
 *    появляется только на уровне БД;
 *  - площадка чего-то не умеет — это флаг в capabilities, а не «тихо вернуть пусто».
 */
import type { Money } from '../core/money';

export type MarketplaceId = 'wildberries' | 'ozon' | 'shopify' | '1688' | 'taobao' | 'jd';

export type MarketRegion = 'russia' | 'china' | 'global';

/** Расшифрованные учётные данные магазина. Живут в памяти, в логи не попадают. */
export interface StoreCredentials {
  /** Основной API-токен площадки. */
  apiKey: string;
  /** Ozon требует ещё и Client-Id; Shopify — домен магазина. Площадко-специфичное кладём сюда. */
  extra?: Record<string, string>;
}

export interface ConnectorContext {
  /** Организация-арендатор. Все данные изолируются по нему. */
  organizationId: string;
  /** Магазин внутри организации. */
  storeId: string;
  credentials: StoreCredentials;
  /** Валюта магазина по умолчанию (ISO 4217). */
  currency: string;
  /** IANA-таймзона магазина: витрины в РФ и Китае живут в разных сутках. */
  timezone: string;
  /** Разрешена ли запись в маркетплейс. Проброшено из ALLOW_MARKETPLACE_WRITES + прав пользователя. */
  allowWrites: boolean;
}

/** Что площадка реально умеет. Проверяется до вызова метода. */
export interface ConnectorCapabilities {
  readProducts: boolean;
  readStocks: boolean;
  readOrders: boolean;
  readReviews: boolean;
  readSearchPositions: boolean;
  readAdvertising: boolean;
  writePrices: boolean;
  writeStocks: boolean;
  writeContent: boolean;
  replyToReviews: boolean;
}

export const NO_CAPABILITIES: ConnectorCapabilities = {
  readProducts: false,
  readStocks: false,
  readOrders: false,
  readReviews: false,
  readSearchPositions: false,
  readAdvertising: false,
  writePrices: false,
  writeStocks: false,
  writeContent: false,
  replyToReviews: false,
};

/** Курсорная страница. Курсор непрозрачен для вызывающего кода. */
export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface PageQuery {
  cursor?: string;
  limit?: number;
}

export interface DateRangeQuery {
  /** ISO-8601 UTC, включительно. */
  from: string;
  /** ISO-8601 UTC, исключительно. */
  to: string;
}

// --- Нормализованные сущности ---------------------------------------------

export interface NormalizedProduct {
  /** Идентификатор в системе площадки (nmID у WB, product_id у Ozon). */
  externalId: string;
  /** Артикул продавца. */
  sellerSku: string;
  /** Штрихкод/баркод, если площадка отдаёт. */
  barcode?: string;
  title: string;
  brand?: string;
  category?: string;
  /** Ссылка на карточку на витрине. */
  url?: string;
  imageUrls: string[];
  /** Текущая цена до скидки. */
  price?: Money;
  /** Цена, которую видит покупатель. */
  discountedPrice?: Money;
  rating?: number;
  reviewCount?: number;
  /** Сырой ответ площадки — для отладки и полей, которые ещё не нормализованы. */
  raw?: unknown;
}

export interface NormalizedStock {
  externalId: string;
  sellerSku: string;
  /** Код склада площадки. */
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  /** Схема работы: со склада площадки или со склада продавца. */
  fulfillment: 'marketplace' | 'seller';
  updatedAt: string;
}

export interface NormalizedOrderLine {
  externalId: string;
  sellerSku: string;
  quantity: number;
  /** Цена за единицу. Выручка позиции = price × quantity. */
  price: Money;
  /** Комиссия площадки по позиции, если известна. */
  commission?: Money;
}

export interface NormalizedOrder {
  externalId: string;
  createdAt: string;
  status: 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'unknown';
  total: Money;
  lines: NormalizedOrderLine[];
  /** Регион доставки — нужен для распределения поставок по складам. */
  destinationRegion?: string;
  raw?: unknown;
}

export interface NormalizedReview {
  externalId: string;
  productExternalId: string;
  createdAt: string;
  rating: number;
  text: string;
  authorName?: string;
  /** Уже отвечено продавцом. */
  answered: boolean;
  raw?: unknown;
}

export interface SearchPosition {
  productExternalId: string;
  keyword: string;
  position: number | null;
  /** Частотность запроса за период, если площадка отдаёт. */
  frequency?: number;
  checkedAt: string;
}

export interface AdCampaign {
  externalId: string;
  name: string;
  status: 'active' | 'paused' | 'archived' | 'unknown';
  dailyBudget?: Money;
  spend?: Money;
  /** Доля рекламных расходов, 0..1. */
  acos?: number;
}

// --- Записи в маркетплейс --------------------------------------------------

export interface PriceUpdate {
  externalId: string;
  price: Money;
  /** Скидка в процентах, если площадка отделяет цену от скидки. */
  discountPercent?: number;
}

export interface StockUpdate {
  sellerSku: string;
  warehouseId: string;
  quantity: number;
}

/**
 * Результат записи. dryRun=true означает, что вызов был проверочным
 * и в маркетплейс ничего не ушло — так тестируем сценарии без риска.
 */
export interface WriteResult {
  accepted: number;
  rejected: Array<{ externalId: string; reason: string }>;
  dryRun: boolean;
  /** Идентификатор задачи на стороне площадки, если запись асинхронная. */
  taskId?: string;
}

export interface ConnectionCheck {
  ok: boolean;
  /** Название магазина/продавца по данным площадки — подтверждает, что токен от нужного аккаунта. */
  accountName?: string;
  /** Права, которые даёт токен. У WB токен выпускается под конкретные категории API. */
  scopes?: string[];
  message?: string;
}

// --- Сам контракт ----------------------------------------------------------

export interface MarketplaceConnector {
  readonly id: MarketplaceId;
  readonly region: MarketRegion;
  readonly capabilities: ConnectorCapabilities;

  /** Проверка токена. Обязана быть реализована у любого коннектора. */
  testConnection(ctx: ConnectorContext): Promise<ConnectionCheck>;

  listProducts(ctx: ConnectorContext, query?: PageQuery): Promise<Page<NormalizedProduct>>;
  listStocks(ctx: ConnectorContext, query?: PageQuery): Promise<Page<NormalizedStock>>;
  listOrders(ctx: ConnectorContext, range: DateRangeQuery, query?: PageQuery): Promise<Page<NormalizedOrder>>;
  listReviews(ctx: ConnectorContext, query?: PageQuery): Promise<Page<NormalizedReview>>;
  getSearchPositions(ctx: ConnectorContext, keywords: string[]): Promise<SearchPosition[]>;
  listAdCampaigns(ctx: ConnectorContext): Promise<AdCampaign[]>;

  updatePrices(ctx: ConnectorContext, updates: PriceUpdate[]): Promise<WriteResult>;
  updateStocks(ctx: ConnectorContext, updates: StockUpdate[]): Promise<WriteResult>;
  replyToReview(ctx: ConnectorContext, reviewExternalId: string, text: string): Promise<WriteResult>;
}
