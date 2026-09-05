/**
 * Оценка и доставка алертов.
 *
 * Правила — чистые функции в analytics/alerts.ts. Здесь всё остальное:
 * взять факты, отсеять уже отправленное, записать событие, разослать.
 *
 * Порядок важен: событие пишется ДО отправки. Если процесс упадёт между
 * записью и отправкой, продавец не получит одно уведомление. Если наоборот —
 * он будет получать одно и то же каждые полчаса, пока не отключит алерты.
 * Из двух зол первое дешевле.
 */
import { AppError } from '../core/errors';
import { childLogger } from '../core/logger';
import { compareSales, salesVelocity, stockCoverage } from '../analytics/metrics';
import { evaluateAlerts, type Alert } from '../analytics/alerts';
import {
  fetchFreshness,
  fetchLatestStocks,
  fetchOrderFacts,
  fetchReviewsSince,
} from '../db/repositories/analytics';
import { recentDedupKeys, recordEvent } from '../db/repositories/events';
import { getStore } from '../db/repositories/stores';
import { accountsForAlerts, disableAlerts } from '../db/repositories/telegram';
import { formatAlert } from '../telegram/format';
import { sendBatch } from '../telegram/notify';

const DAY_MS = 24 * 60 * 60 * 1000;
const VELOCITY_DAYS = 14;
/** Окно подавления повторов: одну и ту же проблему не напоминаем чаще. */
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

export interface AlertRun {
  evaluated: number;
  fresh: number;
  delivered: number;
}

/** Считает алерты по текущим данным магазина. Ничего не пишет и не шлёт. */
export async function evaluateStoreAlerts(organizationId: string, storeId: string): Promise<Alert[]> {
  const store = await getStore(organizationId, storeId);
  if (!store) throw new AppError(`Магазин ${storeId} не найден`, { code: 'NOT_FOUND' });

  const scope = { organizationId, storeId };
  const to = new Date();
  const from = new Date(to.getTime() - DAY_MS);
  const previousFrom = new Date(to.getTime() - 2 * DAY_MS);
  const velocityFrom = new Date(to.getTime() - VELOCITY_DAYS * DAY_MS);

  const [current, previous, velocityWindow, stocks, reviews, freshness] = await Promise.all([
    fetchOrderFacts(scope, from, to),
    fetchOrderFacts(scope, previousFrom, from),
    fetchOrderFacts(scope, velocityFrom, to),
    fetchLatestStocks(scope),
    fetchReviewsSince(scope, from),
    fetchFreshness(storeId),
  ]);

  const sales = compareSales(current, previous, store.currency);
  const coverage = stockCoverage(stocks, salesVelocity(velocityWindow, VELOCITY_DAYS));

  return evaluateAlerts({
    coverage,
    revenue: sales.current.revenue,
    revenueDeltaPercent: sales.revenueDeltaPercent,
    previousRevenue: sales.previous.revenue,
    reviews: reviews.map((review) => ({
      externalId: review.externalId,
      sellerSku: review.sellerSku,
      rating: review.rating,
      text: review.text,
      answered: review.answered,
    })),
    freshness,
    now: to,
  });
}

/**
 * Полный цикл: посчитать, отсеять повторы, записать, разослать.
 * Возвращает статистику — по ней видно, работает ли рассылка вообще.
 */
export async function runAlertsForStore(organizationId: string, storeId: string): Promise<AlertRun> {
  const log = childLogger({ storeId, scope: 'alerts' });
  const alerts = await evaluateStoreAlerts(organizationId, storeId);
  if (alerts.length === 0) return { evaluated: 0, fresh: 0, delivered: 0 };

  const alreadySent = await recentDedupKeys(storeId, COOLDOWN_MS);
  const fresh = alerts.filter((alert) => !alreadySent.has(alert.dedupKey));
  if (fresh.length === 0) {
    log.debug({ suppressed: alerts.length }, 'Все алерты уже отправлялись недавно');
    return { evaluated: alerts.length, fresh: 0, delivered: 0 };
  }

  for (const alert of fresh) {
    await recordEvent({
      organizationId,
      storeId,
      type: `alert.${alert.code}`,
      severity: alert.severity,
      title: alert.code,
      dedupKey: alert.dedupKey,
      payload: { ...alert.params, ...(alert.sellerSku ? { sellerSku: alert.sellerSku } : {}) },
    });
  }

  const delivered = await deliverAlerts(organizationId, fresh);
  log.info({ evaluated: alerts.length, fresh: fresh.length, delivered }, 'Алерты обработаны');

  return { evaluated: alerts.length, fresh: fresh.length, delivered };
}

/** Рассылает алерты подписчикам организации, каждому на его языке. */
export async function deliverAlerts(organizationId: string, alerts: Alert[]): Promise<number> {
  const accounts = await accountsForAlerts(organizationId);
  if (accounts.length === 0 || alerts.length === 0) return 0;

  const messages = accounts.map((account) => ({
    chatId: account.chatId,
    // Одним сообщением: пять отдельных уведомлений подряд читаются как спам.
    text: alerts.map((alert) => formatAlert(alert, account.locale)).join('\n\n'),
  }));

  const results = await sendBatch(messages);

  let delivered = 0;
  for (const account of accounts) {
    const result = results.get(account.chatId);
    if (result === 'sent') delivered += 1;
    if (result === 'blocked') await disableAlerts(account.telegramUserId).catch(() => undefined);
  }

  return delivered;
}
