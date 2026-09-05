import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../core/money';
import { evaluateAlerts, type AlertInput } from './alerts';
import type { StockCoverage } from './metrics';

const NOW = new Date('2026-09-05T12:00:00Z');

function coverage(patch: Partial<StockCoverage> & { sellerSku: string }): StockCoverage {
  return {
    productExternalId: `ext-${patch.sellerSku}`,
    quantity: 0,
    velocity: 1,
    daysOfCover: 0,
    risk: 'out',
    ...patch,
  };
}

function input(patch: Partial<AlertInput> = {}): AlertInput {
  return {
    coverage: [],
    revenue: money(100_000, 'RUB'),
    revenueDeltaPercent: 0,
    previousRevenue: money(100_000, 'RUB'),
    reviews: [],
    freshness: [],
    now: NOW,
    ...patch,
  };
}

test('закончившийся ходовой товар даёт алерт', () => {
  const alerts = evaluateAlerts(input({ coverage: [coverage({ sellerSku: 'A', velocity: 3 })] }));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.code, 'stockout');
  assert.equal(alerts[0]?.severity, 'error');
  assert.equal(alerts[0]?.dedupKey, 'stockout:A');
});

test('товар, который и так не продавался, не будит продавца', () => {
  const alerts = evaluateAlerts(input({ coverage: [coverage({ sellerSku: 'A', velocity: 0 })] }));
  assert.equal(alerts.length, 0, 'нулевой остаток мёртвого товара — не новость');
});

test('критический запас даёт предупреждение с числом дней', () => {
  const alerts = evaluateAlerts(
    input({
      coverage: [coverage({ sellerSku: 'B', quantity: 10, velocity: 2, daysOfCover: 5, risk: 'critical' })],
    }),
  );
  assert.equal(alerts[0]?.code, 'stock_critical');
  assert.equal(alerts[0]?.params.days, 5);
  assert.equal(alerts[0]?.severity, 'warning');
});

test('здоровый остаток молчит', () => {
  const alerts = evaluateAlerts(
    input({ coverage: [coverage({ sellerSku: 'C', quantity: 500, daysOfCover: 90, risk: 'ok' })] }),
  );
  assert.equal(alerts.length, 0);
});

test('падение выручки больше четверти — алерт', () => {
  const alerts = evaluateAlerts(input({ revenueDeltaPercent: -32.4 }));
  assert.equal(alerts[0]?.code, 'revenue_drop');
  assert.equal(alerts[0]?.params.percent, -32.4);
});

test('падение на копеечной базе алертом не считается', () => {
  // -80% от 50 рублей — арифметически верно и практически бессмысленно.
  const alerts = evaluateAlerts(
    input({ revenueDeltaPercent: -80, previousRevenue: money(50_00, 'RUB') }),
  );
  assert.equal(alerts.length, 0);
});

test('обычные колебания выручки не будят', () => {
  assert.equal(evaluateAlerts(input({ revenueDeltaPercent: -12 })).length, 0);
  assert.equal(evaluateAlerts(input({ revenueDeltaPercent: null })).length, 0);
});

test('неотвеченный негативный отзыв даёт алерт с цитатой', () => {
  const alerts = evaluateAlerts(
    input({
      reviews: [
        { externalId: 'fb-1', sellerSku: 'A', rating: 1, text: '  Пришёл\n\nсломанным  ', answered: false },
        { externalId: 'fb-2', sellerSku: 'A', rating: 5, text: 'Отлично', answered: false },
        { externalId: 'fb-3', sellerSku: 'A', rating: 1, text: 'Плохо', answered: true },
      ],
    }),
  );

  assert.equal(alerts.length, 1, 'хорошие и уже отвеченные отзывы не тревожат');
  assert.equal(alerts[0]?.dedupKey, 'negative_review:fb-1');
  assert.equal(alerts[0]?.params.excerpt, 'Пришёл сломанным', 'переносы строк схлопнуты');
});

test('длинный отзыв обрезается многоточием', () => {
  const alerts = evaluateAlerts(
    input({
      reviews: [{ externalId: 'fb-1', sellerSku: 'A', rating: 2, text: 'а'.repeat(400), answered: false }],
    }),
  );
  const excerpt = String(alerts[0]?.params.excerpt);
  assert.ok(excerpt.length <= 160);
  assert.ok(excerpt.endsWith('…'));
});

test('давно молчащая синхронизация с ошибкой — алерт', () => {
  const alerts = evaluateAlerts(
    input({
      freshness: [
        {
          module: 'orders',
          lastSuccessAt: new Date('2026-09-05T02:00:00Z'),
          lastError: 'HTTP 401 от wildberries',
        },
      ],
    }),
  );

  assert.equal(alerts[0]?.code, 'sync_failed');
  assert.equal(alerts[0]?.params.module, 'orders');
});

test('единичная ошибка при свежих данных не поднимает тревогу', () => {
  // Воркер упал один раз и тут же повторил — это не поломка.
  const alerts = evaluateAlerts(
    input({
      freshness: [
        {
          module: 'orders',
          lastSuccessAt: new Date('2026-09-05T11:30:00Z'),
          lastError: 'таймаут',
        },
      ],
    }),
  );
  assert.equal(alerts.length, 0);
});

test('модуль без ошибок молчит, даже если давно не обновлялся', () => {
  const alerts = evaluateAlerts(
    input({
      freshness: [{ module: 'reviews', lastSuccessAt: new Date('2026-09-01T00:00:00Z'), lastError: null }],
    }),
  );
  assert.equal(alerts.length, 0);
});

test('ключи подавления повторов различают товары и совпадают для одной проблемы', () => {
  const first = evaluateAlerts(input({ coverage: [coverage({ sellerSku: 'A' })] }));
  const again = evaluateAlerts(input({ coverage: [coverage({ sellerSku: 'A' })] }));
  const other = evaluateAlerts(input({ coverage: [coverage({ sellerSku: 'B' })] }));

  assert.equal(first[0]?.dedupKey, again[0]?.dedupKey);
  assert.notEqual(first[0]?.dedupKey, other[0]?.dedupKey);
});
