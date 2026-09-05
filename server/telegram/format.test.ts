import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../core/money';
import type { DailyDigest } from '../services/digest';
import { formatAgo, formatDigest, formatPercent, formatStockReport } from './format';

const emptySummary = {
  revenue: money(0, 'RUB'),
  orders: 0,
  cancelled: 0,
  units: 0,
  averageCheck: money(0, 'RUB'),
};

function digest(patch: Partial<DailyDigest> = {}): DailyDigest {
  return {
    storeId: 'store-1',
    storeName: 'Тестовый магазин',
    marketplace: 'wildberries',
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    period: { from: new Date('2026-09-04T12:00:00Z'), to: new Date('2026-09-05T12:00:00Z') },
    sales: {
      current: { ...emptySummary, revenue: money(348_200_00, 'RUB'), orders: 184, averageCheck: money(189_239, 'RUB') },
      previous: { ...emptySummary, revenue: money(300_000_00, 'RUB'), orders: 160 },
      revenueDeltaPercent: 16.1,
      ordersDeltaPercent: 15,
    },
    stockAlerts: [],
    topDrops: [],
    topGrowth: [],
    reviews: { unanswered: 0, newCount: 0, worstRating: null },
    freshness: [{ module: 'orders', lastSuccessAt: new Date('2026-09-05T11:50:00Z'), lastError: null }],
    stale: false,
    neverSynced: false,
    ...patch,
  };
}

test('процент выводится со знаком', () => {
  assert.equal(formatPercent(16.1, 'ru'), '+16.1%');
  assert.equal(formatPercent(-25, 'ru'), '-25.0%');
});

test('отсутствие базы не превращается в 0%', () => {
  // «0%» означало бы «не изменилось» — это ложь, когда сравнивать не с чем.
  assert.equal(formatPercent(null, 'ru'), 'сравнить не с чем');
  assert.equal(formatPercent(null, 'en'), 'no baseline');
});

test('давность округляется по-человечески', () => {
  const now = new Date('2026-09-05T12:00:00Z');
  assert.equal(formatAgo(new Date('2026-09-05T11:35:00Z'), 'ru', now), '25 мин');
  assert.equal(formatAgo(new Date('2026-09-05T09:00:00Z'), 'ru', now), '3 ч');
  assert.equal(formatAgo(new Date('2026-09-01T12:00:00Z'), 'ru', now), '4 дн');
});

test('сводка содержит выручку, заказы и дельты', () => {
  const text = formatDigest(digest(), 'ru');
  assert.match(text, /Тестовый магазин/);
  assert.match(text, /\+16\.1%/);
  assert.match(text, /184/);
  assert.ok(!text.includes('{'), 'все плейсхолдеры заменены');
});

test('без синхронизации сводка честно говорит, что цифр нет', () => {
  const text = formatDigest(digest({ neverSynced: true, stale: true }), 'ru');
  assert.match(text, /ни разу не проходила/);
  assert.ok(!text.includes('Выручка'), 'нулевая выручка не выдаётся за факт');
});

test('устаревшие данные помечаются возрастом', () => {
  const text = formatDigest(
    digest({
      stale: true,
      freshness: [{ module: 'orders', lastSuccessAt: new Date('2026-09-05T06:00:00Z'), lastError: null }],
    }),
    'ru',
    new Date('2026-09-05T12:00:00Z'),
  );
  assert.match(text, /обновлялись 6 ч назад/);
});

test('нулевые продажи — отдельная фраза, а не «0 ₽»', () => {
  const text = formatDigest(digest({ sales: { current: emptySummary, previous: emptySummary, revenueDeltaPercent: null, ordersDeltaPercent: null } }), 'ru');
  assert.match(text, /Продаж за сутки не было/);
});

test('риски остатков выводятся списком, обычные — нет', () => {
  const text = formatDigest(
    digest({
      stockAlerts: [
        { sellerSku: 'BP-1', productExternalId: '1', quantity: 0, velocity: 2, daysOfCover: 0, risk: 'out' },
        { sellerSku: 'BP-2', productExternalId: '2', quantity: 14, velocity: 2, daysOfCover: 7, risk: 'critical' },
        { sellerSku: 'BP-3', productExternalId: '3', quantity: 5, velocity: 0, daysOfCover: null, risk: 'unknown' },
      ],
    }),
    'ru',
  );

  assert.match(text, /BP-1 — закончился/);
  assert.match(text, /BP-2 — 14 шт, хватит на 7 дн/);
  assert.match(text, /BP-3 — 5 шт, продаж не было/);
});

test('английская сводка не содержит русских строк', () => {
  const text = formatDigest(digest(), 'en');
  assert.match(text, /24h digest/);
  assert.ok(!/[А-Яа-я]/.test(text.replace('Тестовый магазин', '')), 'осталась непереведённая строка');
});

test('отчёт по остаткам без данных не показывает пустоту как «всё хорошо»', () => {
  const text = formatStockReport(
    { storeName: 'Магазин', currency: 'RUB', items: [], neverSynced: true },
    'ru',
  );
  assert.match(text, /ни разу не проходила/);
});
