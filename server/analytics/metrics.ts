/**
 * Расчёт показателей магазина. Чистые функции без сети и без БД.
 *
 * Правило проекта: цифры считает код, а не языковая модель. Модель формулирует
 * ответ, но выручку, дельту и запас дней ей не доверяем — она их придумывает.
 * Поэтому весь счёт живёт здесь и покрыт тестами.
 *
 * Данные приходят уже нормализованными (см. connectors/types.ts), поэтому
 * функции одинаково работают для любой площадки.
 */
import { fromMajor, money, type Money } from '../core/money';

/**
 * Одна позиция заказа — минимальный набор полей для счёта.
 *
 * Позиция, а не заказ: у большинства площадок в заказе несколько товаров,
 * и скорость продаж считается по артикулам. Число заказов при этом считается
 * по различным orderExternalId, иначе заказ из трёх позиций сойдёт за три.
 * У WB заказ и позиция совпадают, у Ozon и Shopify — нет.
 */
export interface OrderFact {
  orderedAt: Date;
  /** Ключ заказа на площадке. */
  orderExternalId: string;
  /** Ключ товара на площадке. */
  productExternalId: string;
  sellerSku: string;
  quantity: number;
  /** Выручка ЭТОЙ позиции, минорные единицы. */
  totalMinor: number;
  currency: string;
  status: string;
}

export interface StockFact {
  externalId: string;
  sellerSku: string;
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  capturedAt: Date;
}

/** Отменённые и возвращённые заказы не выручка. */
const NON_REVENUE_STATUSES = new Set(['cancelled', 'returned']);

export function isRevenue(order: OrderFact): boolean {
  return !NON_REVENUE_STATUSES.has(order.status);
}

export interface SalesSummary {
  revenue: Money;
  orders: number;
  cancelled: number;
  units: number;
  /** Средний чек. При нуле заказов — ноль, а не деление на ноль. */
  averageCheck: Money;
}

export function summarizeOrders(lines: OrderFact[], currency: string): SalesSummary {
  let revenueMinor = 0;
  let units = 0;
  const countedOrders = new Set<string>();
  const cancelledOrders = new Set<string>();

  for (const line of lines) {
    if (!isRevenue(line)) {
      cancelledOrders.add(line.orderExternalId);
      continue;
    }
    revenueMinor += line.totalMinor;
    units += line.quantity;
    countedOrders.add(line.orderExternalId);
  }

  const orders = countedOrders.size;

  return {
    revenue: money(revenueMinor, currency),
    orders,
    cancelled: cancelledOrders.size,
    units,
    averageCheck: money(orders === 0 ? 0 : Math.round(revenueMinor / orders), currency),
  };
}

/**
 * Относительное изменение в процентах.
 * При нулевой базе возвращает null: «рост на бесконечность» — не число,
 * которое можно показать продавцу.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface PeriodComparison {
  current: SalesSummary;
  previous: SalesSummary;
  revenueDeltaPercent: number | null;
  ordersDeltaPercent: number | null;
}

export function compareSales(
  current: OrderFact[],
  previous: OrderFact[],
  currency: string,
): PeriodComparison {
  const currentSummary = summarizeOrders(current, currency);
  const previousSummary = summarizeOrders(previous, currency);

  return {
    current: currentSummary,
    previous: previousSummary,
    revenueDeltaPercent: percentDelta(currentSummary.revenue.amount, previousSummary.revenue.amount),
    ordersDeltaPercent: percentDelta(currentSummary.orders, previousSummary.orders),
  };
}

/**
 * Дата в таймзоне магазина в виде YYYY-MM-DD.
 *
 * Считать сутки по UTC нельзя: у магазина в Москве и магазина в Гуанчжоу
 * «вчера» — это разные интервалы, и выручка за день разъедется.
 */
export function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface DailyPoint {
  date: string;
  revenue: Money;
  orders: number;
}

/** Выручка по дням в таймзоне магазина. Дни без заказов в ряд не попадают. */
export function dailySeries(orders: OrderFact[], timeZone: string, currency: string): DailyPoint[] {
  const buckets = new Map<string, { revenueMinor: number; orders: number }>();

  const seenOrders = new Map<string, Set<string>>();

  for (const line of orders) {
    if (!isRevenue(line)) continue;
    const key = localDateKey(line.orderedAt, timeZone);
    const bucket = buckets.get(key) ?? { revenueMinor: 0, orders: 0 };
    bucket.revenueMinor += line.totalMinor;

    const seen = seenOrders.get(key) ?? new Set<string>();
    if (!seen.has(line.orderExternalId)) {
      seen.add(line.orderExternalId);
      bucket.orders += 1;
      seenOrders.set(key, seen);
    }
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      revenue: money(bucket.revenueMinor, currency),
      orders: bucket.orders,
    }));
}

/** Штук в день по артикулу за период. */
export function salesVelocity(orders: OrderFact[], days: number): Map<string, number> {
  if (days <= 0) throw new RangeError('Период должен быть больше нуля дней');

  const unitsBySku = new Map<string, number>();
  for (const order of orders) {
    if (!isRevenue(order)) continue;
    unitsBySku.set(order.sellerSku, (unitsBySku.get(order.sellerSku) ?? 0) + order.quantity);
  }

  const velocity = new Map<string, number>();
  for (const [sku, units] of unitsBySku) velocity.set(sku, units / days);
  return velocity;
}

export type StockRisk = 'out' | 'critical' | 'warning' | 'ok' | 'unknown';

export interface StockCoverage {
  sellerSku: string;
  productExternalId: string;
  quantity: number;
  /** Штук в день. */
  velocity: number;
  /** На сколько дней хватит. null — продаж не было, срок посчитать не из чего. */
  daysOfCover: number | null;
  risk: StockRisk;
}

export interface StockRiskThresholds {
  criticalDays: number;
  warningDays: number;
}

export const DEFAULT_STOCK_THRESHOLDS: StockRiskThresholds = { criticalDays: 7, warningDays: 14 };

/**
 * Запас в днях по каждому артикулу.
 *
 * Остатки суммируются по складам: продавцу важно, хватит ли товара вообще.
 * Разбивка по складам нужна для поставки — это отдельный расчёт.
 *
 * Нулевой остаток — 'out' независимо от скорости продаж: товара уже нет.
 * Остаток есть, а продаж не было — 'unknown', а не 'ok': мы просто не знаем.
 */
export function stockCoverage(
  stocks: StockFact[],
  velocity: Map<string, number>,
  thresholds: StockRiskThresholds = DEFAULT_STOCK_THRESHOLDS,
): StockCoverage[] {
  const totals = new Map<string, { quantity: number; externalId: string }>();

  for (const stock of stocks) {
    const current = totals.get(stock.sellerSku) ?? { quantity: 0, externalId: stock.externalId };
    current.quantity += stock.quantity;
    totals.set(stock.sellerSku, current);
  }

  const result: StockCoverage[] = [];

  for (const [sellerSku, total] of totals) {
    const perDay = velocity.get(sellerSku) ?? 0;
    const daysOfCover = perDay > 0 ? total.quantity / perDay : null;

    let risk: StockRisk;
    if (total.quantity <= 0) risk = 'out';
    else if (daysOfCover === null) risk = 'unknown';
    else if (daysOfCover <= thresholds.criticalDays) risk = 'critical';
    else if (daysOfCover <= thresholds.warningDays) risk = 'warning';
    else risk = 'ok';

    result.push({
      sellerSku,
      productExternalId: total.externalId,
      quantity: total.quantity,
      velocity: perDay,
      daysOfCover,
      risk,
    });
  }

  // Сначала то, что горит: сперва по риску, внутри — по остатку дней.
  const order: Record<StockRisk, number> = { out: 0, critical: 1, warning: 2, unknown: 3, ok: 4 };
  return result.sort(
    (a, b) => order[a.risk] - order[b.risk] || (a.daysOfCover ?? Infinity) - (b.daysOfCover ?? Infinity),
  );
}

export interface SkuMovement {
  sellerSku: string;
  currentRevenue: Money;
  previousRevenue: Money;
  deltaMinor: number;
  deltaPercent: number | null;
}

/**
 * Кто просел и кто вырос сильнее всех — по абсолютной сумме, а не по процентам.
 * Процент обманчив: товар, продавшийся один раз вместо двух, даёт -50%,
 * но на выручку магазина это не влияет.
 */
export function skuMovements(current: OrderFact[], previous: OrderFact[], currency: string): SkuMovement[] {
  const sum = (orders: OrderFact[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const order of orders) {
      if (!isRevenue(order)) continue;
      map.set(order.sellerSku, (map.get(order.sellerSku) ?? 0) + order.totalMinor);
    }
    return map;
  };

  const currentBySku = sum(current);
  const previousBySku = sum(previous);
  const allSkus = new Set([...currentBySku.keys(), ...previousBySku.keys()]);

  const movements: SkuMovement[] = [];
  for (const sellerSku of allSkus) {
    const currentMinor = currentBySku.get(sellerSku) ?? 0;
    const previousMinor = previousBySku.get(sellerSku) ?? 0;
    movements.push({
      sellerSku,
      currentRevenue: money(currentMinor, currency),
      previousRevenue: money(previousMinor, currency),
      deltaMinor: currentMinor - previousMinor,
      deltaPercent: percentDelta(currentMinor, previousMinor),
    });
  }

  return movements.sort((a, b) => a.deltaMinor - b.deltaMinor);
}

/** Помощник для тестов и разбора внешних данных: цена в рублях → Money. */
export const rub = (major: number): Money => fromMajor(major, 'RUB');
