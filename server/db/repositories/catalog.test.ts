/**
 * Интеграционные тесты каталога на живой БД.
 *
 * Проверяют то, чего не видят ни типы, ни тесты на фикстурах: идемпотентность
 * upsert, что повторная синхронизация не плодит дубли и не затирает наши
 * собственные поля, и что арендаторы не видят данных друг друга.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import { closeDatabase, getDb } from '../client';
import { orderLines, orders, products, reviews } from '../schema';
import { skipWithoutDb, withTenant } from '../testing';
import { insertStockSnapshots, upsertOrders, upsertProducts, upsertReviews } from './catalog';
import { fetchLatestStocks, fetchOrderFacts, fetchReviewsSince } from './analytics';
import { money } from '../../core/money';
import type { NormalizedOrder, NormalizedProduct, NormalizedStock } from '../../connectors/types';

after(async () => {
  await closeDatabase();
});

const product = (patch: Partial<NormalizedProduct> = {}): NormalizedProduct => ({
  externalId: 'ext-1',
  sellerSku: 'SKU-1',
  title: 'Рюкзак',
  imageUrls: ['https://example.test/a.jpg'],
  price: money(199_000, 'RUB'),
  ...patch,
});

const stock = (patch: Partial<NormalizedStock> = {}): NormalizedStock => ({
  externalId: 'ext-1',
  sellerSku: 'SKU-1',
  warehouseId: 'Коледино',
  quantity: 10,
  fulfillment: 'marketplace',
  updatedAt: new Date().toISOString(),
  ...patch,
});

const order = (patch: Partial<NormalizedOrder> = {}): NormalizedOrder => ({
  externalId: 'srid-1',
  createdAt: new Date().toISOString(),
  status: 'new',
  total: money(199_000, 'RUB'),
  lines: [{ externalId: 'ext-1', sellerSku: 'SKU-1', quantity: 1, price: money(199_000, 'RUB') }],
  ...patch,
});

test('повторная синхронизация товаров не плодит дубли', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertProducts(tenant, [product()]);
    await upsertProducts(tenant, [product({ title: 'Рюкзак городской' })]);

    const rows = await getDb().select().from(products).where(eq(products.storeId, tenant.storeId));

    assert.equal(rows.length, 1, 'тот же externalId — та же строка');
    assert.equal(rows[0]?.title, 'Рюкзак городской', 'поля обновились');
  });
});

test('себестоимость переживает синхронизацию', skipWithoutDb, async () => {
  // Себестоимость вводит продавец, площадка её не знает. Затереть её при
  // очередном обходе каталога — потерять расчёт маржи без единой ошибки.
  await withTenant(async (tenant) => {
    await upsertProducts(tenant, [product()]);
    await getDb()
      .update(products)
      .set({ costMinor: 90_000 })
      .where(eq(products.storeId, tenant.storeId));

    await upsertProducts(tenant, [product({ title: 'Другое название' })]);

    const rows = await getDb().select().from(products).where(eq(products.storeId, tenant.storeId));
    assert.equal(rows[0]?.costMinor, 90_000);
  });
});

test('остатки копятся историей, читается свежий снимок', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertProducts(tenant, [product()]);

    const older = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await insertStockSnapshots(tenant, [stock({ quantity: 500, updatedAt: older })]);
    await insertStockSnapshots(tenant, [stock({ quantity: 7 })]);

    const latest = await fetchLatestStocks(tenant);
    assert.equal(latest.length, 1, 'на пару (товар, склад) отдаётся одна строка');
    assert.equal(latest[0]?.quantity, 7, 'взят свежий снимок, а не первый попавшийся');
    assert.equal(latest[0]?.sellerSku, 'SKU-1', 'артикул подтянут из каталога');
  });
});

test('остаток без карточки не теряется', skipWithoutDb, async () => {
  // Синхронизация остатков может обогнать синхронизацию карточек.
  await withTenant(async (tenant) => {
    await insertStockSnapshots(tenant, [stock({ externalId: 'ext-неизвестный' })]);

    const latest = await fetchLatestStocks(tenant);
    assert.equal(latest.length, 1);
    assert.equal(latest[0]?.sellerSku, 'ext-неизвестный', 'подставлен внешний id');
  });
});

test('повторный заказ не дублирует позиции', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertProducts(tenant, [product()]);
    await upsertOrders(tenant, [order()]);
    await upsertOrders(tenant, [order({ status: 'delivered' })]);

    const orderRows = await getDb().select().from(orders).where(eq(orders.storeId, tenant.storeId));
    assert.equal(orderRows.length, 1);
    assert.equal(orderRows[0]?.status, 'delivered', 'статус обновился');

    const lineRows = await getDb()
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, orderRows[0]!.id));
    assert.equal(lineRows.length, 1, 'позиции переписаны, а не добавлены заново');
  });
});

test('исчезнувшая позиция заказа удаляется, а не остаётся навсегда', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertOrders(tenant, [
      order({
        lines: [
          { externalId: 'ext-1', sellerSku: 'SKU-1', quantity: 1, price: money(100_000, 'RUB') },
          { externalId: 'ext-2', sellerSku: 'SKU-2', quantity: 1, price: money(50_000, 'RUB') },
        ],
      }),
    ]);
    await upsertOrders(tenant, [order()]);

    const orderRows = await getDb().select().from(orders).where(eq(orders.storeId, tenant.storeId));
    const lineRows = await getDb()
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, orderRows[0]!.id));

    assert.equal(lineRows.length, 1, 'отменённая часть заказа не осталась в базе');
  });
});

test('выборка заказов соблюдает границы периода', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const boundary = new Date('2026-09-05T12:00:00Z');
    await upsertOrders(tenant, [
      order({ externalId: 'до', createdAt: new Date('2026-09-05T11:59:59Z').toISOString() }),
      order({ externalId: 'ровно-на-границе', createdAt: boundary.toISOString() }),
      order({ externalId: 'после', createdAt: new Date('2026-09-05T12:00:01Z').toISOString() }),
    ]);

    const before = await fetchOrderFacts(tenant, new Date('2026-09-05T00:00:00Z'), boundary);
    const after = await fetchOrderFacts(tenant, boundary, new Date('2026-09-06T00:00:00Z'));

    // Полуинтервал [from, to): заказ на границе принадлежит второму периоду
    // и не считается дважды при сравнении суток.
    assert.deepEqual(
      before.map((fact) => fact.orderExternalId),
      ['до'],
    );
    assert.deepEqual(
      after.map((fact) => fact.orderExternalId).sort(),
      ['ровно-на-границе', 'после'].sort(),
    );
  });
});

test('выручка позиции считается как цена на количество', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertOrders(tenant, [
      order({
        lines: [{ externalId: 'ext-1', sellerSku: 'SKU-1', quantity: 3, price: money(100_000, 'RUB') }],
      }),
    ]);

    const facts = await fetchOrderFacts(tenant, new Date(Date.now() - 60_000), new Date(Date.now() + 60_000));
    assert.equal(facts[0]?.totalMinor, 300_000);
  });
});

test('черновик ответа на отзыв не затирается синхронизацией', skipWithoutDb, async () => {
  // Черновик принадлежит нам, а не площадке.
  await withTenant(async (tenant) => {
    await upsertReviews(tenant, [
      {
        externalId: 'fb-1',
        productExternalId: 'ext-1',
        createdAt: new Date().toISOString(),
        rating: 2,
        text: 'Плохо',
        answered: false,
      },
    ]);

    await getDb()
      .update(reviews)
      .set({ draftReply: 'Здравствуйте! Разберёмся.' })
      .where(eq(reviews.storeId, tenant.storeId));

    await upsertReviews(tenant, [
      {
        externalId: 'fb-1',
        productExternalId: 'ext-1',
        createdAt: new Date().toISOString(),
        rating: 2,
        text: 'Плохо',
        answered: true,
      },
    ]);

    const rows = await getDb().select().from(reviews).where(eq(reviews.storeId, tenant.storeId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.answered, true, 'признак ответа с площадки обновился');
    assert.equal(rows[0]?.draftReply, 'Здравствуйте! Разберёмся.', 'черновик остался');
  });
});

test('арендаторы не видят данных друг друга', skipWithoutDb, async () => {
  // Забытый фильтр по организации — это утечка чужих продаж, а не просто баг.
  await withTenant(async (first) => {
    await withTenant(async (second) => {
      await upsertProducts(first, [product({ sellerSku: 'ЧУЖОЙ' })]);
      await upsertOrders(first, [order()]);
      await insertStockSnapshots(first, [stock()]);
      await upsertReviews(second, [
        {
          externalId: 'fb-2',
          productExternalId: 'ext-1',
          createdAt: new Date().toISOString(),
          rating: 5,
          text: 'Хорошо',
          answered: false,
        },
      ]);

      const window = { from: new Date(Date.now() - 60_000), to: new Date(Date.now() + 60_000) };

      assert.equal((await fetchOrderFacts(second, window.from, window.to)).length, 0);
      assert.equal((await fetchLatestStocks(second)).length, 0);
      assert.equal((await fetchReviewsSince(first, window.from)).length, 0);

      const foreignProducts = await getDb()
        .select()
        .from(products)
        .where(and(eq(products.organizationId, second.organizationId), eq(products.sellerSku, 'ЧУЖОЙ')));
      assert.equal(foreignProducts.length, 0);
    });
  });
});

test('пустой список ничего не пишет и не падает', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    assert.equal(await upsertProducts(tenant, []), 0);
    assert.equal(await upsertOrders(tenant, []), 0);
    assert.equal(await insertStockSnapshots(tenant, []), 0);
    assert.equal(await upsertReviews(tenant, []), 0);
  });
});

test('снимок исчезнувшего склада не считается вечно', skipWithoutDb, async () => {
  // Площадка перестала отдавать склад — товар оттуда вывезли. Без ограничения
  // по свежести последний известный остаток жил бы вечно, запас дней выходил
  // завышенным, и алерт об окончании товара не сработал бы.
  await withTenant(async (tenant) => {
    await upsertProducts(tenant, [product()]);

    const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await insertStockSnapshots(tenant, [
      stock({ warehouseId: 'Закрытый склад', quantity: 500, updatedAt: longAgo }),
      stock({ warehouseId: 'Коледино', quantity: 3 }),
    ]);

    const latest = await fetchLatestStocks(tenant);

    assert.deepEqual(
      latest.map((item) => item.warehouseId),
      ['Коледино'],
      'протухший снимок попал в расчёт',
    );
    assert.equal(latest[0]?.quantity, 3);
  });
});

test('порог свежести остатков настраивается', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await insertStockSnapshots(tenant, [stock({ quantity: 42, updatedAt: fiveDaysAgo })]);

    assert.equal((await fetchLatestStocks(tenant)).length, 0, 'по умолчанию три дня');
    assert.equal((await fetchLatestStocks(tenant, 30)).length, 1, 'с большим окном снимок виден');
  });
});
