/**
 * Сводка по магазину: выручка за сутки, сравнение с предыдущими, риск
 * out-of-stock, кто просел, отзывы без ответа, свежесть данных.
 *
 * Всё считает код (server/analytics/metrics.ts). Языковой модели сюда ходу нет:
 * её дело — сформулировать, а не посчитать.
 *
 * Период — скользящие сутки, а не календарные. Так сводка одинаково честна
 * в любое время дня и не зависит от того, в какой таймзоне сейчас полночь.
 * Календарные сутки магазина используются только в разбивке по дням.
 */
import { AppError } from '../core/errors';
import type { Money } from '../core/money';
import {
  compareSales,
  salesVelocity,
  skuMovements,
  stockCoverage,
  type PeriodComparison,
  type SkuMovement,
  type StockCoverage,
} from '../analytics/metrics';
import {
  fetchFreshness,
  fetchLatestStocks,
  fetchOrderFacts,
  fetchReviewStats,
  type DataFreshness,
} from '../db/repositories/analytics';
import { getStore } from '../db/repositories/stores';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Скорость продаж считаем по двум неделям: сутки слишком шумные для запаса дней. */
const VELOCITY_DAYS = 14;
/** Данные старше этого срока помечаем как устаревшие. */
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
const TOP_LIST_SIZE = 3;
const STOCK_ALERT_SIZE = 5;

export interface DailyDigest {
  storeId: string;
  storeName: string;
  marketplace: string;
  currency: string;
  timezone: string;
  period: { from: Date; to: Date };
  sales: PeriodComparison;
  /** Товары с самым коротким запасом. Только те, где есть о чём предупреждать. */
  stockAlerts: StockCoverage[];
  topDrops: SkuMovement[];
  topGrowth: SkuMovement[];
  reviews: { unanswered: number; newCount: number; worstRating: number | null };
  freshness: DataFreshness[];
  /** Данные не обновлялись дольше порога — цифры показывать можно, но с оговоркой. */
  stale: boolean;
  /** Синхронизация ни разу не проходила: показывать нечего. */
  neverSynced: boolean;
}

export async function buildDailyDigest(organizationId: string, storeId: string): Promise<DailyDigest> {
  const store = await getStore(organizationId, storeId);
  if (!store) throw new AppError(`Магазин ${storeId} не найден`, { code: 'NOT_FOUND' });

  const scope = { organizationId, storeId };
  const to = new Date();
  const from = new Date(to.getTime() - DAY_MS);
  const previousFrom = new Date(to.getTime() - 2 * DAY_MS);
  const velocityFrom = new Date(to.getTime() - VELOCITY_DAYS * DAY_MS);

  const [current, previous, velocityWindow, stocks, reviews, freshness] = await Promise.all([
    fetchOrderFacts(scope, from, to),
    fetchOrderFacts(scope, previousFrom, from),
    fetchOrderFacts(scope, velocityFrom, to),
    fetchLatestStocks(scope),
    fetchReviewStats(scope, from),
    fetchFreshness(storeId),
  ]);

  const sales = compareSales(current, previous, store.currency);
  const velocity = salesVelocity(velocityWindow, VELOCITY_DAYS);
  const coverage = stockCoverage(stocks, velocity);
  const movements = skuMovements(current, previous, store.currency);

  const lastSuccess = freshness
    .map((item) => item.lastSuccessAt)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    storeId,
    storeName: store.name,
    marketplace: store.marketplace,
    currency: store.currency,
    timezone: store.timezone,
    period: { from, to },
    sales,
    stockAlerts: coverage.filter((item) => item.risk !== 'ok').slice(0, STOCK_ALERT_SIZE),
    topDrops: movements.filter((item) => item.deltaMinor < 0).slice(0, TOP_LIST_SIZE),
    topGrowth: movements
      .filter((item) => item.deltaMinor > 0)
      .sort((a, b) => b.deltaMinor - a.deltaMinor)
      .slice(0, TOP_LIST_SIZE),
    reviews,
    freshness,
    stale: lastSuccess === undefined || to.getTime() - lastSuccess.getTime() > STALE_AFTER_MS,
    neverSynced: lastSuccess === undefined,
  };
}

export interface StockReport {
  storeName: string;
  currency: string;
  items: StockCoverage[];
  neverSynced: boolean;
}

/** Остатки и запас дней — отдельно от сводки, полным списком рисков. */
export async function buildStockReport(
  organizationId: string,
  storeId: string,
  limit = 20,
): Promise<StockReport> {
  const store = await getStore(organizationId, storeId);
  if (!store) throw new AppError(`Магазин ${storeId} не найден`, { code: 'NOT_FOUND' });

  const scope = { organizationId, storeId };
  const to = new Date();
  const velocityFrom = new Date(to.getTime() - VELOCITY_DAYS * DAY_MS);

  const [stocks, velocityWindow] = await Promise.all([
    fetchLatestStocks(scope),
    fetchOrderFacts(scope, velocityFrom, to),
  ]);

  const coverage = stockCoverage(stocks, salesVelocity(velocityWindow, VELOCITY_DAYS));

  return {
    storeName: store.name,
    currency: store.currency,
    items: coverage.slice(0, limit),
    neverSynced: stocks.length === 0,
  };
}

/** Выручка периода одной строкой — для коротких ответов бота. */
export function digestRevenue(digest: DailyDigest): Money {
  return digest.sales.current.revenue;
}
