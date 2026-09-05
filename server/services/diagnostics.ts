/**
 * Диагностика просадки: собрать факты и прогнать детерминированные правила.
 *
 * Разбор причин живёт в analytics/diagnostics.ts и покрыт тестами. Здесь
 * только выборка данных, поэтому логика остаётся проверяемой без БД.
 */
import { AppError } from '../core/errors';
import { salesVelocity, stockCoverage } from '../analytics/metrics';
import { diagnoseSalesDrop, type DiagnosisReport } from '../analytics/diagnostics';
import { fetchLatestStocks, fetchOrderFacts, fetchReviewsSince } from '../db/repositories/analytics';
import { getStore } from '../db/repositories/stores';

const DAY_MS = 24 * 60 * 60 * 1000;
const VELOCITY_DAYS = 14;

export interface StoreDiagnosis {
  storeName: string;
  report: DiagnosisReport;
}

export async function diagnoseStore(
  organizationId: string,
  storeId: string,
  windowDays = 1,
): Promise<StoreDiagnosis> {
  const store = await getStore(organizationId, storeId);
  if (!store) throw new AppError(`Магазин ${storeId} не найден`, { code: 'NOT_FOUND' });

  const scope = { organizationId, storeId };
  const windowMs = windowDays * DAY_MS;
  const to = new Date();
  const from = new Date(to.getTime() - windowMs);
  const previousFrom = new Date(to.getTime() - 2 * windowMs);
  const velocityFrom = new Date(to.getTime() - VELOCITY_DAYS * DAY_MS);

  const [current, previous, velocityWindow, stocks, reviews] = await Promise.all([
    fetchOrderFacts(scope, from, to),
    fetchOrderFacts(scope, previousFrom, from),
    fetchOrderFacts(scope, velocityFrom, to),
    fetchLatestStocks(scope),
    fetchReviewsSince(scope, from),
  ]);

  const report = diagnoseSalesDrop({
    current,
    previous,
    coverage: stockCoverage(stocks, salesVelocity(velocityWindow, VELOCITY_DAYS)),
    reviews: reviews.map((review) => ({
      externalId: review.externalId,
      productExternalId: review.productExternalId,
      sellerSku: review.sellerSku,
      rating: review.rating,
      createdAt: review.createdAt,
      answered: review.answered,
    })),
    currency: store.currency,
    // Позиции в поиске и цены конкурентов ещё не синхронизируются —
    // соответствующие гипотезы честно помечаются как непроверенные.
    hasSearchPositions: false,
    hasCompetitorPrices: false,
  });

  return { storeName: store.name, report };
}
