/**
 * Сквозная проверка слоя данных на живой БД: npm run smoke:db
 *
 * Зачем: репозитории, сводка, диагностика и алерты состоят из SQL, который
 * компилятор не проверяет. Ошибка в имени колонки или в `distinct on` всплывает
 * только при выполнении запроса — этот скрипт и есть выполнение.
 *
 * Что делает: создаёт СВОЮ временную организацию, наполняет её выдуманными
 * товарами, заказами, остатками и отзывами, прогоняет все расчёты и удаляет
 * созданное. Чужих данных не касается: всё удаление идёт по id организации,
 * которую скрипт сам и создал.
 *
 * Маркетплейс при этом не дёргается: коннектор не вызывается, данные кладутся
 * прямо в таблицы.
 */
import { eq } from 'drizzle-orm';
import { closeDatabase, getDb, isDatabaseConfigured } from '../db/client';
import {
  events,
  orderLines,
  orders,
  organizations,
  products,
  reviews,
  stockSnapshots,
  stores,
  storeCredentials,
  syncJobs,
} from '../db/schema';
import { encryptSecret } from '../core/crypto';
import { buildDailyDigest, buildStockReport } from '../services/digest';
import { diagnoseStore } from '../services/diagnostics';
import { evaluateStoreAlerts } from '../services/alerts';
import { buildReviewFeed } from '../services/reviews';
import {
  formatAlert,
  formatDiagnosis,
  formatDigest,
  formatReviewFeed,
  formatStockReport,
} from '../telegram/format';
import { fetchFreshness, fetchLatestStocks, fetchOrderFacts } from '../db/repositories/analytics';
import { recentDedupKeys, recordEvent } from '../db/repositories/events';

const DAY_MS = 24 * 60 * 60 * 1000;
const out = (line: string) => process.stdout.write(`${line}\n`);

/** Один SKU: карточка, остаток, продажи в двух периодах. */
interface Fixture {
  sku: string;
  title: string;
  priceMinor: number;
  stock: number;
  ordersCurrent: number;
  ordersPrevious: number;
}

const FIXTURES: Fixture[] = [
  // Кончился ходовой товар — ждём stockout и в алертах, и в диагнозе.
  { sku: 'BP-URBAN-01', title: 'Рюкзак городской', priceMinor: 199_000, stock: 0, ordersCurrent: 0, ordersPrevious: 6 },
  // Запас на исходе.
  { sku: 'BP-URBAN-02', title: 'Рюкзак школьный', priceMinor: 149_000, stock: 8, ordersCurrent: 4, ordersPrevious: 4 },
  // Здоровый товар, растёт.
  { sku: 'SN-CITY-03', title: 'Кроссовки', priceMinor: 459_000, stock: 300, ordersCurrent: 5, ordersPrevious: 3 },
];

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    process.stderr.write('DATABASE_URL не задан — проверять нечего.\n');
    process.exit(1);
  }

  const db = getDb();
  const now = new Date();
  let organizationId = '';

  try {
    const org = await db
      .insert(organizations)
      .values({ name: `smoke-${now.toISOString()}`, baseCurrency: 'RUB', timezone: 'Europe/Moscow' })
      .returning({ id: organizations.id });
    organizationId = org[0]?.id ?? '';
    if (!organizationId) throw new Error('Организация не создалась');
    out(`Организация: ${organizationId}`);

    const storeRows = await db
      .insert(stores)
      .values({
        organizationId,
        marketplace: 'wildberries',
        name: 'Тестовый магазин',
        currency: 'RUB',
        timezone: 'Europe/Moscow',
        status: 'active',
      })
      .returning({ id: stores.id });
    const storeId = storeRows[0]?.id;
    if (!storeId) throw new Error('Магазин не создался');
    out(`Магазин: ${storeId}`);

    // Проверяем и шифрование: токен должен уехать в БД нечитаемым.
    await db.insert(storeCredentials).values({
      storeId,
      encryptedApiKey: encryptSecret('fake-token-for-smoke-test'),
    });

    const scope = { organizationId, storeId };
    const productIdBySku = new Map<string, string>();

    for (const fixture of FIXTURES) {
      const inserted = await db
        .insert(products)
        .values({
          organizationId,
          storeId,
          externalId: `ext-${fixture.sku}`,
          sellerSku: fixture.sku,
          title: fixture.title,
          currency: 'RUB',
          priceMinor: fixture.priceMinor,
          imageUrls: [],
        })
        .returning({ id: products.id });
      const productId = inserted[0]?.id;
      if (!productId) throw new Error(`Товар ${fixture.sku} не создался`);
      productIdBySku.set(fixture.sku, productId);

      // Два снимка остатков: старый и свежий. Расчёт обязан взять свежий.
      await db.insert(stockSnapshots).values([
        {
          organizationId,
          storeId,
          productId,
          externalId: `ext-${fixture.sku}`,
          warehouseId: 'Коледино',
          warehouseName: 'Коледино',
          quantity: fixture.stock + 999,
          fulfillment: 'marketplace',
          capturedAt: new Date(now.getTime() - 3 * DAY_MS),
        },
        {
          organizationId,
          storeId,
          productId,
          externalId: `ext-${fixture.sku}`,
          warehouseId: 'Коледино',
          warehouseName: 'Коледино',
          quantity: fixture.stock,
          fulfillment: 'marketplace',
          capturedAt: new Date(now.getTime() - 60_000),
        },
      ]);

      await seedOrders(scope, fixture, productId, now, 'current');
      await seedOrders(scope, fixture, productId, now, 'previous');
    }

    // Свежий негатив по кончившемуся товару.
    await db.insert(reviews).values({
      organizationId,
      storeId,
      productId: productIdBySku.get('BP-URBAN-01') ?? null,
      externalId: 'fb-smoke-1',
      rating: 1,
      text: 'Заказ отменили, товара не было в наличии.',
      answered: false,
      createdAtExternal: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    await db.insert(syncJobs).values({
      storeId,
      module: 'orders',
      status: 'success',
      itemsProcessed: 42,
      startedAt: new Date(now.getTime() - 10 * 60_000),
      finishedAt: new Date(now.getTime() - 9 * 60_000),
    });

    out('\n--- Выборки ---');
    const facts = await fetchOrderFacts(scope, new Date(now.getTime() - DAY_MS), now);
    out(`Позиции заказов за сутки: ${facts.length}`);

    const stocks = await fetchLatestStocks(scope);
    out(`Последние остатки: ${stocks.length} строк`);
    const backpack = stocks.find((item) => item.sellerSku === 'BP-URBAN-01');
    out(`  BP-URBAN-01 → ${backpack?.quantity} шт (ожидали 0, а не 999)`);
    if (backpack?.quantity !== 0) throw new Error('distinct on взял не свежий снимок');

    const freshness = await fetchFreshness(storeId);
    out(`Свежесть: ${freshness.map((item) => `${item.module}=${item.lastSuccessAt ? 'ok' : '—'}`).join(', ')}`);

    out('\n--- Сводка ---');
    const digest = await buildDailyDigest(organizationId, storeId);
    out(formatDigest(digest, 'ru'));

    out('\n--- Остатки ---');
    out(formatStockReport(await buildStockReport(organizationId, storeId), 'ru'));

    out('\n--- Диагностика ---');
    const { storeName, report } = await diagnoseStore(organizationId, storeId);
    out(formatDiagnosis(report, storeName, 'ru'));

    out('\n--- Отзывы ---');
    out(formatReviewFeed(await buildReviewFeed(organizationId, storeId), 'ru'));

    out('\n--- Алерты ---');
    const alerts = await evaluateStoreAlerts(organizationId, storeId);
    for (const alert of alerts) out(formatAlert(alert, 'ru'));

    out('\n--- Подавление повторов ---');
    for (const alert of alerts) {
      await recordEvent({
        organizationId,
        storeId,
        type: `alert.${alert.code}`,
        severity: alert.severity,
        title: alert.code,
        dedupKey: alert.dedupKey,
      });
    }
    const suppressed = await recentDedupKeys(storeId, 12 * 60 * 60 * 1000);
    const stillFresh = alerts.filter((alert) => !suppressed.has(alert.dedupKey));
    out(`Записано ключей: ${suppressed.size}, повторно ушло бы: ${stillFresh.length} (ожидали 0)`);
    if (stillFresh.length !== 0) throw new Error('Подавление повторов не сработало');

    out('\nПроверка пройдена.');
  } finally {
    if (organizationId) {
      // Удаляем только то, что создал этот скрипт. Каскад уносит магазин,
      // товары, заказы, остатки, отзывы и события вместе с организацией.
      await db.delete(events).where(eq(events.organizationId, organizationId));
      await db.delete(organizations).where(eq(organizations.id, organizationId));
      out(`Временные данные удалены (организация ${organizationId}).`);
    }
    await closeDatabase();
  }
}

async function seedOrders(
  scope: { organizationId: string; storeId: string },
  fixture: Fixture,
  productId: string,
  now: Date,
  period: 'current' | 'previous',
): Promise<void> {
  const db = getDb();
  const count = period === 'current' ? fixture.ordersCurrent : fixture.ordersPrevious;
  if (count === 0) return;

  const offsetMs = period === 'current' ? 6 * 60 * 60 * 1000 : 30 * 60 * 60 * 1000;

  for (let index = 0; index < count; index += 1) {
    const orderedAt = new Date(now.getTime() - offsetMs - index * 60_000);
    const inserted = await db
      .insert(orders)
      .values({
        organizationId: scope.organizationId,
        storeId: scope.storeId,
        externalId: `srid-${period}-${fixture.sku}-${index}`,
        status: 'new',
        currency: 'RUB',
        totalMinor: fixture.priceMinor,
        destinationRegion: 'Московская',
        orderedAt,
      })
      .returning({ id: orders.id });

    const orderId = inserted[0]?.id;
    if (!orderId) continue;

    await db.insert(orderLines).values({
      orderId,
      productId,
      externalId: `ext-${fixture.sku}`,
      sellerSku: fixture.sku,
      quantity: 1,
      currency: 'RUB',
      priceMinor: fixture.priceMinor,
    });
  }
}

main().catch(async (error: unknown) => {
  process.stderr.write(`Проверка не прошла: ${error instanceof Error ? error.stack : String(error)}\n`);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
