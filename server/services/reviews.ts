/**
 * Лента отзывов для бота и интерфейса.
 *
 * Показываем то, что требует действия: неотвеченные, худшие сверху. Полный
 * список отзывов продавцу не нужен — он и так есть в личном кабинете; ценность
 * в том, чтобы не пропустить то, на что надо ответить сегодня.
 */
import { AppError } from '../core/errors';
import { getStore } from '../db/repositories/stores';
import {
  fetchReviewFeed,
  fetchReviewSummary,
  type ReviewFeedItem,
  type ReviewSummary,
} from '../db/repositories/reviews';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Период, за который считается средняя оценка. */
const SUMMARY_DAYS = 7;
const DEFAULT_LIMIT = 5;

export interface ReviewFeed {
  storeName: string;
  timezone: string;
  summaryDays: number;
  summary: ReviewSummary;
  items: ReviewFeedItem[];
  /** Сколько неотвеченных не поместилось в выдачу. */
  hidden: number;
  /** Синхронизация отзывов ни разу не проходила: показывать нечего. */
  neverSynced: boolean;
}

export async function buildReviewFeed(
  organizationId: string,
  storeId: string,
  limit = DEFAULT_LIMIT,
): Promise<ReviewFeed> {
  const store = await getStore(organizationId, storeId);
  if (!store) throw new AppError(`Магазин ${storeId} не найден`, { code: 'NOT_FOUND' });

  const scope = { organizationId, storeId };
  const since = new Date(Date.now() - SUMMARY_DAYS * DAY_MS);

  const [summary, items] = await Promise.all([
    fetchReviewSummary(scope, since),
    fetchReviewFeed(scope, { limit, onlyUnanswered: true }),
  ]);

  return {
    storeName: store.name,
    timezone: store.timezone,
    summaryDays: SUMMARY_DAYS,
    summary,
    items,
    hidden: Math.max(0, summary.unanswered - items.length),
    // Ни одного отзыва вообще — вероятнее всего не было синхронизации,
    // а не магазин без единого отзыва. Честнее сказать первое.
    neverSynced: summary.total === 0,
  };
}
