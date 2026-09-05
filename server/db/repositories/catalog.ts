/**
 * Запись нормализованных данных маркетплейса в БД.
 *
 * Всё пишется пачками с upsert по (store_id, external_id): синхронизация
 * повторяется по расписанию и обязана быть идемпотентной — повторный проход
 * не должен плодить дубли и не должен падать на уже существующих строках.
 *
 * Остатки — исключение: это снимки во времени, они всегда добавляются, иначе
 * не построить историю и не посчитать скорость расхода.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { orderLines, orders, products, reviews, stockSnapshots } from '../schema';
import type {
  NormalizedOrder,
  NormalizedProduct,
  NormalizedReview,
  NormalizedStock,
} from '../../connectors/types';

/** Postgres ограничивает число параметров в запросе — пишем порциями. */
const BATCH_SIZE = 500;

function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export interface StoreScope {
  organizationId: string;
  storeId: string;
}

export async function upsertProducts(scope: StoreScope, items: NormalizedProduct[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = getDb();
  const syncedAt = new Date();

  for (const batch of chunk(items)) {
    await db
      .insert(products)
      .values(
        batch.map((item) => ({
          organizationId: scope.organizationId,
          storeId: scope.storeId,
          externalId: item.externalId,
          sellerSku: item.sellerSku,
          barcode: item.barcode ?? null,
          title: item.title,
          brand: item.brand ?? null,
          category: item.category ?? null,
          url: item.url ?? null,
          imageUrls: item.imageUrls,
          currency: item.price?.currency ?? item.discountedPrice?.currency ?? 'RUB',
          priceMinor: item.price?.amount ?? null,
          discountedPriceMinor: item.discountedPrice?.amount ?? null,
          rating: item.rating ?? null,
          reviewCount: item.reviewCount ?? null,
          raw: item.raw ?? null,
          syncedAt,
        })),
      )
      .onConflictDoUpdate({
        target: [products.storeId, products.externalId],
        set: {
          sellerSku: sqlExcluded('seller_sku'),
          title: sqlExcluded('title'),
          brand: sqlExcluded('brand'),
          category: sqlExcluded('category'),
          url: sqlExcluded('url'),
          imageUrls: sqlExcluded('image_urls'),
          currency: sqlExcluded('currency'),
          priceMinor: sqlExcluded('price_minor'),
          discountedPriceMinor: sqlExcluded('discounted_price_minor'),
          raw: sqlExcluded('raw'),
          syncedAt: sqlExcluded('synced_at'),
          // cost_minor не трогаем: себестоимость вводит продавец, площадка её не знает.
        },
      });
  }

  return items.length;
}

export async function insertStockSnapshots(scope: StoreScope, items: NormalizedStock[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = getDb();
  const productIds = await productIdMap(scope, items.map((item) => item.externalId));

  for (const batch of chunk(items)) {
    await db.insert(stockSnapshots).values(
      batch.map((item) => ({
        organizationId: scope.organizationId,
        storeId: scope.storeId,
        productId: productIds.get(item.externalId) ?? null,
        externalId: item.externalId,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName ?? null,
        quantity: item.quantity,
        fulfillment: item.fulfillment,
        capturedAt: new Date(item.updatedAt),
      })),
    );
  }

  return items.length;
}

export async function upsertOrders(scope: StoreScope, items: NormalizedOrder[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = getDb();
  const externalIds = items.flatMap((order) => order.lines.map((line) => line.externalId));
  const productIds = await productIdMap(scope, externalIds);

  for (const batch of chunk(items, 200)) {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(orders)
        .values(
          batch.map((order) => ({
            organizationId: scope.organizationId,
            storeId: scope.storeId,
            externalId: order.externalId,
            status: order.status,
            currency: order.total.currency,
            totalMinor: order.total.amount,
            destinationRegion: order.destinationRegion ?? null,
            orderedAt: new Date(order.createdAt),
            raw: order.raw ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: [orders.storeId, orders.externalId],
          set: {
            status: sqlExcluded('status'),
            totalMinor: sqlExcluded('total_minor'),
            raw: sqlExcluded('raw'),
          },
        })
        .returning({ id: orders.id, externalId: orders.externalId });

      const orderIdByExternal = new Map(inserted.map((row) => [row.externalId, row.id]));

      // Позиции переписываем целиком: их состав может измениться (отмена части заказа).
      const orderIds = [...orderIdByExternal.values()];
      if (orderIds.length > 0) {
        await tx.delete(orderLines).where(inArray(orderLines.orderId, orderIds));
      }

      const lines = batch.flatMap((order) => {
        const orderId = orderIdByExternal.get(order.externalId);
        if (!orderId) return [];
        return order.lines.map((line) => ({
          orderId,
          productId: productIds.get(line.externalId) ?? null,
          externalId: line.externalId,
          sellerSku: line.sellerSku,
          quantity: line.quantity,
          currency: line.price.currency,
          priceMinor: line.price.amount,
          commissionMinor: line.commission?.amount ?? null,
        }));
      });

      if (lines.length > 0) await tx.insert(orderLines).values(lines);
    });
  }

  return items.length;
}

export async function upsertReviews(scope: StoreScope, items: NormalizedReview[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = getDb();
  const productIds = await productIdMap(scope, items.map((item) => item.productExternalId));

  for (const batch of chunk(items)) {
    await db
      .insert(reviews)
      .values(
        batch.map((item) => ({
          organizationId: scope.organizationId,
          storeId: scope.storeId,
          productId: productIds.get(item.productExternalId) ?? null,
          externalId: item.externalId,
          rating: item.rating,
          text: item.text,
          authorName: item.authorName ?? null,
          answered: item.answered,
          createdAtExternal: new Date(item.createdAt),
          raw: item.raw ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [reviews.storeId, reviews.externalId],
        set: {
          answered: sqlExcluded('answered'),
          text: sqlExcluded('text'),
          raw: sqlExcluded('raw'),
          // draft_reply не трогаем: черновик ответа принадлежит нам, а не площадке.
        },
      });
  }

  return items.length;
}

/** Соответствие внешних идентификаторов площадки нашим UUID товаров. */
async function productIdMap(scope: StoreScope, externalIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(externalIds)];
  if (unique.length === 0) return new Map();

  const map = new Map<string, string>();
  for (const batch of chunk(unique, 1000)) {
    const rows = await getDb()
      .select({ id: products.id, externalId: products.externalId })
      .from(products)
      .where(and(eq(products.storeId, scope.storeId), inArray(products.externalId, batch)));
    for (const row of rows) map.set(row.externalId, row.id);
  }
  return map;
}

/**
 * Ссылка на значение из вставляемой строки в ON CONFLICT DO UPDATE.
 * Drizzle не даёт типобезопасного `excluded`, поэтому пишем sql-фрагментом.
 * Имя колонки берётся из кода, не из пользовательского ввода — инъекции нет.
 */
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}
