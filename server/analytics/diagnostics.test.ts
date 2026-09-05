import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseSalesDrop, type ReviewFact } from './diagnostics';
import type { OrderFact, StockCoverage } from './metrics';

let counter = 0;

function line(sku: string, totalMinor: number, patch: Partial<OrderFact> = {}): OrderFact {
  counter += 1;
  return {
    orderedAt: new Date('2026-09-05T10:00:00Z'),
    orderExternalId: `order-${counter}`,
    productExternalId: `ext-${sku}`,
    sellerSku: sku,
    quantity: 1,
    totalMinor,
    currency: 'RUB',
    status: 'new',
    ...patch,
  };
}

function coverage(sku: string, quantity: number, risk: StockCoverage['risk']): StockCoverage {
  return {
    sellerSku: sku,
    productExternalId: `ext-${sku}`,
    quantity,
    velocity: 1,
    daysOfCover: quantity > 0 ? quantity : 0,
    risk,
  };
}

function review(sku: string, rating: number): ReviewFact {
  counter += 1;
  return {
    externalId: `fb-${counter}`,
    productExternalId: `ext-${sku}`,
    sellerSku: sku,
    rating,
    createdAt: new Date('2026-09-05T09:00:00Z'),
    answered: false,
  };
}

const base = { coverage: [] as StockCoverage[], reviews: [] as ReviewFact[], currency: 'RUB' };

test('рост продаж не объявляется просадкой', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 200_000)],
    previous: [line('A', 100_000)],
  });

  assert.equal(report.hasDrop, false);
  assert.equal(report.findings.length, 0);
  assert.equal(report.breadth, 'none');
});

test('колебание в пределах шума не считается просадкой', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 95_000)],
    previous: [line('A', 100_000)],
  });

  assert.equal(report.hasDrop, false, '-5% это ещё не повод бить тревогу');
});

test('закончившийся товар — причина с высокой уверенностью', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [],
    previous: [line('A', 500_000)],
    coverage: [coverage('A', 0, 'out')],
  });

  assert.equal(report.hasDrop, true);
  const finding = report.findings[0];
  assert.equal(finding?.code, 'stockout');
  assert.equal(finding?.sellerSku, 'A');
  assert.ok((finding?.confidence ?? 0) >= 0.9);
  assert.equal(finding?.revenueImpact.amount, -500_000);
});

test('рост фактической цены объясняет падение', () => {
  // Продавали по 1000, стали по 1300 — продаж стало вдвое меньше.
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 130_000)],
    previous: [line('A', 100_000), line('A', 100_000), line('A', 100_000)],
    coverage: [coverage('A', 50, 'ok')],
  });

  const finding = report.findings.find((item) => item.sellerSku === 'A');
  assert.equal(finding?.code, 'price_up');
  assert.equal(finding?.evidence.pricePercent, 30);
});

test('нехватка товара важнее роста цены', () => {
  // Обе гипотезы подходят, но пустой склад объясняет падение однозначно.
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 130_000)],
    previous: [line('A', 100_000), line('A', 100_000), line('A', 100_000)],
    coverage: [coverage('A', 0, 'out')],
  });

  assert.equal(report.findings[0]?.code, 'stockout');
});

test('свежие низкие оценки становятся гипотезой', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 200_000)],
    previous: [line('A', 200_000), line('A', 200_000), line('A', 200_000)],
    coverage: [coverage('A', 40, 'ok')],
    reviews: [review('A', 1), review('A', 2), review('A', 5)],
  });

  const finding = report.findings.find((item) => item.sellerSku === 'A');
  assert.equal(finding?.code, 'negative_reviews');
  assert.equal(finding?.evidence.count, 2, 'пятёрка не считается негативом');
});

test('товар есть, цена та же, отзывы прежние — спрос, с низкой уверенностью', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 100_000)],
    previous: [line('A', 100_000), line('A', 100_000), line('A', 100_000)],
    coverage: [coverage('A', 60, 'ok')],
  });

  const finding = report.findings.find((item) => item.sellerSku === 'A');
  assert.equal(finding?.code, 'demand');
  assert.ok((finding?.confidence ?? 1) < 0.5, 'без позиций в поиске уверенности быть не может');
});

test('недоступные гипотезы названы явно', () => {
  const report = diagnoseSalesDrop({ ...base, current: [], previous: [line('A', 100_000)] });
  assert.deepEqual(report.unavailable, ['search_positions', 'competitor_prices']);
});

test('падение по одному товару считается концентрированным', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 100_000), line('B', 100_000)],
    previous: [line('A', 900_000), line('B', 100_000)],
    coverage: [coverage('A', 0, 'out'), coverage('B', 50, 'ok')],
  });

  assert.equal(report.breadth, 'concentrated');
  assert.ok(!report.findings.some((item) => item.code === 'systemic'));
});

test('размазанное падение помечается как системное', () => {
  const current = ['A', 'B', 'C', 'D', 'E'].map((sku) => line(sku, 20_000));
  const previous = ['A', 'B', 'C', 'D', 'E'].map((sku) => line(sku, 100_000));

  const report = diagnoseSalesDrop({
    ...base,
    current,
    previous,
    coverage: ['A', 'B', 'C', 'D', 'E'].map((sku) => coverage(sku, 50, 'ok')),
  });

  assert.equal(report.breadth, 'spread');
  const systemic = report.findings.find((item) => item.code === 'systemic');
  assert.ok(systemic, 'равномерное падение по всему ассортименту — не товарная причина');
  assert.equal(systemic?.evidence.skuCount, 5);
});

test('всплеск отмен попадает в отчёт отдельной причиной', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [
      line('A', 100_000),
      line('A', 100_000, { status: 'cancelled' }),
      line('A', 100_000, { status: 'cancelled' }),
    ],
    previous: [line('A', 100_000), line('A', 100_000), line('A', 100_000)],
    coverage: [coverage('A', 50, 'ok')],
  });

  assert.ok(report.findings.some((item) => item.code === 'cancellations'));
});

test('причины отсортированы по деньгам, а не по порядку проверок', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [],
    previous: [line('крупный', 900_000), line('мелкий', 200_000)],
    coverage: [coverage('крупный', 0, 'out'), coverage('мелкий', 0, 'out')],
  });

  assert.equal(report.findings[0]?.sellerSku, 'крупный');
});

test('умерший товар виден, даже когда магазин в целом ровный', () => {
  // Классический случай: один товар кончился, соседний вырос и закрыл дыру.
  // Витрина выглядит спокойной, а половина ассортимента встала.
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('B', 480_000)],
    previous: [line('A', 300_000), line('B', 200_000)],
    coverage: [coverage('A', 0, 'out'), coverage('B', 100, 'ok')],
  });

  assert.equal(report.hasDrop, true);
  assert.equal(report.trigger, 'sku', 'разбор запущен товаром, а не магазином');
  assert.equal(report.findings[0]?.sellerSku, 'A');
  assert.equal(report.findings[0]?.code, 'stockout');
});

test('мелкая просадка одного товара при ровном магазине молчит', () => {
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('A', 95_000), line('B', 105_000)],
    previous: [line('A', 100_000), line('B', 100_000)],
    coverage: [coverage('A', 50, 'ok'), coverage('B', 50, 'ok')],
  });

  assert.equal(report.hasDrop, false);
  assert.equal(report.trigger, 'none');
});

test('вклад считается от валового падения, а не от общей дельты', () => {
  // Магазин вырос, но товар A потерял четверть прошлой выручки.
  const report = diagnoseSalesDrop({
    ...base,
    current: [line('B', 900_000)],
    previous: [line('A', 300_000), line('B', 400_000)],
    coverage: [coverage('A', 0, 'out')],
  });

  assert.equal(report.trigger, 'sku');
  const finding = report.findings.find((item) => item.sellerSku === 'A');
  assert.ok(finding, 'деление на общую дельту здесь дало бы бессмыслицу');
  assert.equal(report.breadth, 'concentrated');
});
