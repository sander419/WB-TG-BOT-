import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMajor } from '../core/money';
import {
  compareSales,
  dailySeries,
  localDateKey,
  percentDelta,
  salesVelocity,
  skuMovements,
  stockCoverage,
  summarizeOrders,
  type OrderFact,
  type StockFact,
} from './metrics';

let orderCounter = 0;

/** Каждая позиция по умолчанию из своего заказа — иначе счёт заказов схлопнется. */
function order(partial: Partial<OrderFact> & { totalMinor: number }): OrderFact {
  orderCounter += 1;
  return {
    orderedAt: new Date('2026-09-05T10:00:00Z'),
    orderExternalId: `order-${orderCounter}`,
    productExternalId: 'ext-1',
    currency: 'RUB',
    status: 'new',
    sellerSku: 'SKU-1',
    quantity: 1,
    ...partial,
  };
}

test('выручка не включает отменённые и возвращённые заказы', () => {
  const summary = summarizeOrders(
    [
      order({ totalMinor: 100_000 }),
      order({ totalMinor: 50_000, status: 'cancelled' }),
      order({ totalMinor: 30_000, status: 'returned' }),
      order({ totalMinor: 100_000, status: 'delivered' }),
    ],
    'RUB',
  );

  assert.equal(summary.revenue.amount, 200_000);
  assert.equal(summary.orders, 2);
  assert.equal(summary.cancelled, 2);
});

test('средний чек при нуле заказов — ноль, а не деление на ноль', () => {
  const summary = summarizeOrders([], 'RUB');
  assert.equal(summary.averageCheck.amount, 0);
  assert.ok(Number.isFinite(summary.averageCheck.amount));
});

test('средний чек округляется до копейки', () => {
  const summary = summarizeOrders(
    [order({ totalMinor: 100 }), order({ totalMinor: 101 }), order({ totalMinor: 101 })],
    'RUB',
  );
  assert.equal(summary.averageCheck.amount, 101);
});

test('процентная дельта от нуля — null, а не бесконечность', () => {
  assert.equal(percentDelta(100, 0), null);
  assert.equal(percentDelta(0, 0), null);
  assert.equal(percentDelta(150, 100), 50);
  assert.equal(percentDelta(50, 100), -50);
});

test('сравнение периодов считает обе дельты', () => {
  const comparison = compareSales(
    [order({ totalMinor: 150_000 })],
    [order({ totalMinor: 100_000 }), order({ totalMinor: 100_000 })],
    'RUB',
  );

  assert.equal(toMajor(comparison.current.revenue), 1500);
  assert.equal(comparison.revenueDeltaPercent, -25);
  assert.equal(comparison.ordersDeltaPercent, -50);
});

test('сутки считаются в таймзоне магазина, а не в UTC', () => {
  // 21:30 UTC — это уже следующий день в Москве и в Гуанчжоу.
  const evening = new Date('2026-09-05T21:30:00Z');
  assert.equal(localDateKey(evening, 'UTC'), '2026-09-05');
  assert.equal(localDateKey(evening, 'Europe/Moscow'), '2026-09-06');
  assert.equal(localDateKey(evening, 'Asia/Shanghai'), '2026-09-06');
});

test('ряд по дням разносит заказы по местным суткам', () => {
  const series = dailySeries(
    [
      order({ totalMinor: 100_000, orderedAt: new Date('2026-09-05T21:30:00Z') }),
      order({ totalMinor: 200_000, orderedAt: new Date('2026-09-06T05:00:00Z') }),
      order({ totalMinor: 999_000, orderedAt: new Date('2026-09-06T06:00:00Z'), status: 'cancelled' }),
    ],
    'Europe/Moscow',
    'RUB',
  );

  assert.equal(series.length, 1, 'оба заказа попали в 6 сентября по Москве');
  assert.equal(series[0]?.date, '2026-09-06');
  assert.equal(series[0]?.revenue.amount, 300_000);
  assert.equal(series[0]?.orders, 2);
});

test('скорость продаж — штук в день по артикулу', () => {
  const velocity = salesVelocity(
    [
      order({ totalMinor: 1, sellerSku: 'A', quantity: 7 }),
      order({ totalMinor: 1, sellerSku: 'A', quantity: 7 }),
      order({ totalMinor: 1, sellerSku: 'B', quantity: 2 }),
      order({ totalMinor: 1, sellerSku: 'B', quantity: 5, status: 'cancelled' }),
    ],
    7,
  );

  assert.equal(velocity.get('A'), 2);
  assert.equal(velocity.get('B'), 2 / 7);
  assert.equal(velocity.has('C'), false);
});

test('нулевой период отвергается, а не даёт бесконечную скорость', () => {
  assert.throws(() => salesVelocity([], 0), RangeError);
});

const stock = (partial: Partial<StockFact> & { sellerSku: string; quantity: number }): StockFact => ({
  externalId: `ext-${partial.sellerSku}`,
  warehouseId: 'wh-1',
  capturedAt: new Date('2026-09-05T00:00:00Z'),
  ...partial,
});

test('запас в днях считается по сумме складов', () => {
  const coverage = stockCoverage(
    [stock({ sellerSku: 'A', quantity: 10 }), stock({ sellerSku: 'A', quantity: 4, warehouseId: 'wh-2' })],
    new Map([['A', 2]]),
  );

  assert.equal(coverage.length, 1);
  assert.equal(coverage[0]?.quantity, 14);
  assert.equal(coverage[0]?.daysOfCover, 7);
  assert.equal(coverage[0]?.risk, 'critical');
});

test('нулевой остаток — out, даже если продаж не было', () => {
  const coverage = stockCoverage([stock({ sellerSku: 'A', quantity: 0 })], new Map());
  assert.equal(coverage[0]?.risk, 'out');
});

test('остаток есть, продаж нет — unknown, а не ok', () => {
  // «Всё хорошо» про товар, который никто не покупает, — неправда.
  const coverage = stockCoverage([stock({ sellerSku: 'A', quantity: 100 })], new Map());
  assert.equal(coverage[0]?.risk, 'unknown');
  assert.equal(coverage[0]?.daysOfCover, null);
});

test('пороги риска соблюдаются', () => {
  const coverage = stockCoverage(
    [
      stock({ sellerSku: 'critical', quantity: 7 }),
      stock({ sellerSku: 'warning', quantity: 14 }),
      stock({ sellerSku: 'ok', quantity: 100 }),
    ],
    new Map([
      ['critical', 1],
      ['warning', 1],
      ['ok', 1],
    ]),
  );

  assert.deepEqual(
    coverage.map((item) => item.risk),
    ['critical', 'warning', 'ok'],
    'сортировка ставит горящее первым',
  );
});

test('позиции одного заказа считаются одним заказом', () => {
  const summary = summarizeOrders(
    [
      order({ totalMinor: 100_000, orderExternalId: 'srid-1', sellerSku: 'A' }),
      order({ totalMinor: 50_000, orderExternalId: 'srid-1', sellerSku: 'B' }),
    ],
    'RUB',
  );

  assert.equal(summary.orders, 1, 'заказ из двух позиций — один заказ');
  assert.equal(summary.revenue.amount, 150_000, 'выручка складывается по позициям');
  assert.equal(summary.averageCheck.amount, 150_000);
});

test('движение по артикулам сортируется по абсолютной просадке', () => {
  const movements = skuMovements(
    [order({ totalMinor: 10_000, sellerSku: 'мелкий' }), order({ totalMinor: 500_000, sellerSku: 'крупный' })],
    [order({ totalMinor: 20_000, sellerSku: 'мелкий' }), order({ totalMinor: 900_000, sellerSku: 'крупный' })],
    'RUB',
  );

  // У мелкого -50%, у крупного -44%, но магазину важен крупный.
  assert.equal(movements[0]?.sellerSku, 'крупный');
  assert.equal(movements[0]?.deltaMinor, -400_000);
  assert.equal(movements[1]?.sellerSku, 'мелкий');
  assert.equal(movements[1]?.deltaPercent, -50);
});

test('новый артикул виден как рост с нулевой базой', () => {
  const movements = skuMovements([order({ totalMinor: 50_000, sellerSku: 'новый' })], [], 'RUB');
  assert.equal(movements[0]?.deltaMinor, 50_000);
  assert.equal(movements[0]?.deltaPercent, null, 'процент от нуля не считаем');
});
