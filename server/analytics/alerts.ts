/**
 * Правила алертов: что стоит сказать продавцу, не дожидаясь его вопроса.
 *
 * Чистые функции над уже посчитанными фактами. Отправка, подавление повторов
 * и доставка в Telegram — этажом выше, в services/alerts.ts.
 *
 * Главный принцип: алерт должен звать к действию. «Выручка изменилась на 3%» —
 * это не алерт, а шум, от которого продавец отключит уведомления и пропустит
 * настоящую проблему.
 */
import type { Money } from '../core/money';
import type { StockCoverage } from './metrics';

export type AlertCode =
  | 'stockout'
  | 'stock_critical'
  | 'revenue_drop'
  | 'negative_review'
  | 'sync_failed';

export type AlertSeverity = 'warning' | 'error';

export interface Alert {
  code: AlertCode;
  severity: AlertSeverity;
  /**
   * Ключ подавления повторов. Одна и та же проблема не должна приходить
   * каждые полчаса: продавец отключит уведомления, и это будет правильно
   * с его стороны.
   */
  dedupKey: string;
  sellerSku?: string;
  params: Record<string, string | number>;
}

export interface AlertReviewFact {
  externalId: string;
  sellerSku: string | null;
  rating: number;
  text: string;
  answered: boolean;
}

export interface AlertSyncFact {
  module: string;
  lastSuccessAt: Date | null;
  lastError: string | null;
}

export interface AlertInput {
  coverage: StockCoverage[];
  /** Выручка за текущие сутки и её изменение к предыдущим. */
  revenue: Money;
  revenueDeltaPercent: number | null;
  previousRevenue: Money;
  /** Отзывы за период. */
  reviews: AlertReviewFact[];
  freshness: AlertSyncFact[];
  now?: Date;
}

/** Падение выручки, о котором стоит будить. Меньше — обычные колебания. */
const REVENUE_DROP_PERCENT = -25;
/** И только если было с чего падать: на копеечной базе процент ничего не значит. */
const REVENUE_DROP_MIN_PREVIOUS_MINOR = 100_00;
const CRITICAL_DAYS = 7;
const LOW_RATING = 2;
/** Молчание синхронизации, после которого это уже поломка, а не задержка. */
const SYNC_SILENCE_MS = 6 * 60 * 60 * 1000;
const REVIEW_EXCERPT_LENGTH = 160;

export function evaluateAlerts(input: AlertInput): Alert[] {
  const now = input.now ?? new Date();
  const alerts: Alert[] = [];

  for (const item of input.coverage) {
    // Про товар, который и раньше не продавался, сообщать нечего.
    if (item.risk === 'out' && item.velocity > 0) {
      alerts.push({
        code: 'stockout',
        severity: 'error',
        dedupKey: `stockout:${item.sellerSku}`,
        sellerSku: item.sellerSku,
        params: { sku: item.sellerSku, velocity: Number(item.velocity.toFixed(1)) },
      });
      continue;
    }

    if (item.risk === 'critical' && item.daysOfCover !== null && item.daysOfCover <= CRITICAL_DAYS) {
      alerts.push({
        code: 'stock_critical',
        severity: 'warning',
        dedupKey: `stock_critical:${item.sellerSku}`,
        sellerSku: item.sellerSku,
        params: {
          sku: item.sellerSku,
          quantity: item.quantity,
          days: Math.floor(item.daysOfCover),
        },
      });
    }
  }

  if (
    input.revenueDeltaPercent !== null &&
    input.revenueDeltaPercent <= REVENUE_DROP_PERCENT &&
    input.previousRevenue.amount >= REVENUE_DROP_MIN_PREVIOUS_MINOR
  ) {
    alerts.push({
      code: 'revenue_drop',
      severity: 'warning',
      // Ключ на сутки: повторять одно и то же падение весь день бессмысленно.
      dedupKey: `revenue_drop:${now.toISOString().slice(0, 10)}`,
      params: { percent: Number(input.revenueDeltaPercent.toFixed(1)) },
    });
  }

  for (const review of input.reviews) {
    if (review.rating > LOW_RATING || review.answered) continue;
    alerts.push({
      code: 'negative_review',
      severity: 'warning',
      // Ключ по конкретному отзыву: каждый негатив приходит один раз.
      dedupKey: `negative_review:${review.externalId}`,
      ...(review.sellerSku === null ? {} : { sellerSku: review.sellerSku }),
      params: {
        sku: review.sellerSku ?? '—',
        rating: review.rating,
        excerpt: excerpt(review.text),
      },
    });
  }

  for (const item of input.freshness) {
    const silentFor =
      item.lastSuccessAt === null ? Infinity : now.getTime() - item.lastSuccessAt.getTime();
    // Ошибка без давности — ещё не повод: воркер мог упасть один раз и повторить.
    if (item.lastError === null || silentFor < SYNC_SILENCE_MS) continue;

    alerts.push({
      code: 'sync_failed',
      severity: 'error',
      dedupKey: `sync_failed:${item.module}`,
      params: {
        module: item.module,
        error: excerpt(item.lastError, 120),
      },
    });
  }

  return alerts;
}

function excerpt(text: string, limit = REVIEW_EXCERPT_LENGTH): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`;
}
