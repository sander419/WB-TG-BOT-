/**
 * Выборки для расчёта показателей.
 *
 * Здесь только SQL: сам счёт живёт в server/analytics/metrics.ts чистыми
 * функциями и покрыт тестами. Разделение намеренное — считать в SQL значит
 * не иметь возможности это проверить без поднятой БД.
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../client';
import type { OrderFact, StockFact } from '../../analytics/metrics';

export interface StoreScope {
  organizationId: string;
  storeId: string;
}

interface OrderFactRow extends Record<string, unknown> {
  order_external_id: string;
  product_external_id: string;
  seller_sku: string;
  quantity: number;
  price_minor: number;
  currency: string;
  status: string;
  ordered_at: Date;
}

/**
 * Позиции заказов за период. Полуинтервал [from, to): иначе заказ, попавший
 * ровно на границу, посчитается дважды при сравнении соседних периодов.
 */
export async function fetchOrderFacts(scope: StoreScope, from: Date, to: Date): Promise<OrderFact[]> {
  const result = await getDb().execute<OrderFactRow>(sql`
    select
      o.external_id      as order_external_id,
      l.external_id      as product_external_id,
      l.seller_sku       as seller_sku,
      l.quantity         as quantity,
      l.price_minor      as price_minor,
      l.currency         as currency,
      o.status           as status,
      o.ordered_at       as ordered_at
    from orders o
    join order_lines l on l.order_id = o.id
    where o.organization_id = ${scope.organizationId}
      and o.store_id = ${scope.storeId}
      and o.ordered_at >= ${from}
      and o.ordered_at < ${to}
  `);

  return result.rows.map((row) => ({
    orderedAt: new Date(row.ordered_at),
    orderExternalId: row.order_external_id,
    productExternalId: row.product_external_id,
    sellerSku: row.seller_sku,
    quantity: row.quantity,
    // price_minor — цена за единицу, выручка позиции считается здесь.
    totalMinor: row.price_minor * row.quantity,
    currency: row.currency,
    status: row.status,
  }));
}

interface StockFactRow extends Record<string, unknown> {
  external_id: string;
  seller_sku: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  quantity: number;
  captured_at: Date;
}

/** Снимки старше этого срока считаем протухшими. */
const STOCK_FRESHNESS_DAYS = 3;

/**
 * Последний снимок остатков по каждой паре (товар, склад).
 *
 * `distinct on` — единственный способ взять свежую строку на группу без
 * оконных функций и подзапросов. Артикул продавца берётся из каталога:
 * в снимке его нет, а сопоставление скорости продаж идёт именно по нему.
 * Товары, которых ещё нет в каталоге (синхронизация остатков обогнала
 * синхронизацию карточек), не выбрасываем — подставляем внешний id.
 *
 * ⚠️ Ограничение по свежести обязательно. Без него последний известный снимок
 * склада, который площадка перестала отдавать (товар оттуда вывезли), считался
 * бы актуальным вечно. Остаток выглядел бы завышенным, запас дней — большим,
 * и алерт об окончании товара не сработал бы — ровно тот случай, ради которого
 * всё и делалось.
 */
export async function fetchLatestStocks(
  scope: StoreScope,
  freshnessDays = STOCK_FRESHNESS_DAYS,
): Promise<StockFact[]> {
  const since = new Date(Date.now() - freshnessDays * 24 * 60 * 60 * 1000);

  const result = await getDb().execute<StockFactRow>(sql`
    select distinct on (s.external_id, s.warehouse_id)
      s.external_id     as external_id,
      p.seller_sku      as seller_sku,
      s.warehouse_id    as warehouse_id,
      s.warehouse_name  as warehouse_name,
      s.quantity        as quantity,
      s.captured_at     as captured_at
    from stock_snapshots s
    left join products p
      on p.store_id = s.store_id and p.external_id = s.external_id
    where s.organization_id = ${scope.organizationId}
      and s.store_id = ${scope.storeId}
      and s.captured_at >= ${since}
    order by s.external_id, s.warehouse_id, s.captured_at desc
  `);

  return result.rows.map((row) => ({
    externalId: row.external_id,
    sellerSku: row.seller_sku ?? row.external_id,
    warehouseId: row.warehouse_id,
    ...(row.warehouse_name === null ? {} : { warehouseName: row.warehouse_name }),
    quantity: row.quantity,
    capturedAt: new Date(row.captured_at),
  }));
}

export interface DataFreshness {
  module: string;
  lastSuccessAt: Date | null;
  lastError: string | null;
}

/**
 * Когда каждый модуль последний раз синхронизировался успешно.
 * Нужно, чтобы сводка могла честно сказать «данные устарели», а не показывать
 * вчерашние цифры как сегодняшние.
 */
export async function fetchFreshness(storeId: string): Promise<DataFreshness[]> {
  const result = await getDb().execute<{
    module: string;
    last_success_at: Date | null;
    last_error: string | null;
  }>(sql`
    select
      module,
      max(finished_at) filter (where status = 'success') as last_success_at,
      (array_agg(error order by created_at desc) filter (where status = 'failed'))[1] as last_error
    from sync_jobs
    where store_id = ${storeId}
    group by module
  `);

  return result.rows.map((row) => ({
    module: row.module,
    lastSuccessAt: row.last_success_at === null ? null : new Date(row.last_success_at),
    lastError: row.last_error,
  }));
}

/** Число неотвеченных отзывов и худшая оценка за период. */
export async function fetchReviewStats(
  scope: StoreScope,
  from: Date,
): Promise<{ unanswered: number; newCount: number; worstRating: number | null }> {
  const result = await getDb().execute<{
    unanswered: string;
    new_count: string;
    worst_rating: number | null;
  }>(sql`
    select
      count(*) filter (where answered = false)                          as unanswered,
      count(*) filter (where created_at_external >= ${from})            as new_count,
      min(rating) filter (where created_at_external >= ${from})         as worst_rating
    from reviews
    where organization_id = ${scope.organizationId}
      and store_id = ${scope.storeId}
  `);

  const row = result.rows[0];
  return {
    // count() возвращает bigint, node-postgres отдаёт его строкой.
    unanswered: Number(row?.unanswered ?? 0),
    newCount: Number(row?.new_count ?? 0),
    worstRating: row?.worst_rating ?? null,
  };
}

export interface ReviewRow {
  externalId: string;
  productExternalId: string;
  sellerSku: string | null;
  rating: number;
  text: string;
  answered: boolean;
  createdAt: Date;
}

interface ReviewRawRow extends Record<string, unknown> {
  external_id: string;
  product_external_id: string;
  seller_sku: string | null;
  rating: number;
  text: string;
  answered: boolean;
  created_at_external: Date;
}

/**
 * Отзывы за период. Артикул продавца подтягивается из каталога: в таблице
 * отзывов его нет, а и алерты, и диагностика оперируют артикулами.
 */
export async function fetchReviewsSince(scope: StoreScope, from: Date): Promise<ReviewRow[]> {
  const result = await getDb().execute<ReviewRawRow>(sql`
    select
      r.external_id          as external_id,
      p.external_id          as product_external_id,
      p.seller_sku           as seller_sku,
      r.rating               as rating,
      r.text                 as text,
      r.answered             as answered,
      r.created_at_external  as created_at_external
    from reviews r
    left join products p on p.id = r.product_id
    where r.organization_id = ${scope.organizationId}
      and r.store_id = ${scope.storeId}
      and r.created_at_external >= ${from}
    order by r.created_at_external desc
  `);

  return result.rows.map((row) => ({
    externalId: row.external_id,
    productExternalId: row.product_external_id ?? '',
    sellerSku: row.seller_sku,
    rating: row.rating,
    text: row.text,
    answered: row.answered,
    createdAt: new Date(row.created_at_external),
  }));
}
