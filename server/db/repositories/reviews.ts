/**
 * Лента отзывов: выборки для команды `/reviews` и работы с черновиками ответов.
 *
 * Отдельно от analytics-репозитория: там агрегаты для расчётов, здесь список
 * для чтения человеком, с названием товара и текстом. Разные потребители,
 * разные запросы — общий «универсальный» селект быстро оброс бы флагами.
 */
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { reviews } from '../schema';

export interface StoreScope {
  organizationId: string;
  storeId: string;
}

export interface ReviewFeedItem {
  externalId: string;
  rating: number;
  text: string;
  authorName: string | null;
  answered: boolean;
  draftReply: string | null;
  createdAt: Date;
  /** Название из каталога; null, если карточка ещё не синхронизирована. */
  productTitle: string | null;
  sellerSku: string | null;
}

interface FeedRow extends Record<string, unknown> {
  external_id: string;
  rating: number;
  text: string;
  author_name: string | null;
  answered: boolean;
  draft_reply: string | null;
  created_at_external: Date;
  product_title: string | null;
  seller_sku: string | null;
}

export interface ReviewFeedQuery {
  limit?: number;
  /** Только те, на которые не ответили: операционно важная выборка. */
  onlyUnanswered?: boolean;
  since?: Date;
}

/**
 * Лента отзывов. Порядок: сначала худшие оценки, внутри одной оценки — свежие.
 * Сортировать только по дате неверно: единица недельной давности важнее
 * сегодняшней пятёрки.
 */
export async function fetchReviewFeed(
  scope: StoreScope,
  query: ReviewFeedQuery = {},
): Promise<ReviewFeedItem[]> {
  const limit = Math.min(query.limit ?? 10, 50);

  const result = await getDb().execute<FeedRow>(sql`
    select
      r.external_id         as external_id,
      r.rating              as rating,
      r.text                as text,
      r.author_name         as author_name,
      r.answered            as answered,
      r.draft_reply         as draft_reply,
      r.created_at_external as created_at_external,
      p.title               as product_title,
      p.seller_sku          as seller_sku
    from reviews r
    left join products p on p.id = r.product_id
    where r.organization_id = ${scope.organizationId}
      and r.store_id = ${scope.storeId}
      ${query.onlyUnanswered ? sql`and r.answered = false` : sql``}
      ${query.since ? sql`and r.created_at_external >= ${query.since}` : sql``}
    order by r.rating asc, r.created_at_external desc
    limit ${limit}
  `);

  return result.rows.map((row) => ({
    externalId: row.external_id,
    rating: row.rating,
    text: row.text,
    authorName: row.author_name,
    answered: row.answered,
    draftReply: row.draft_reply,
    createdAt: new Date(row.created_at_external),
    productTitle: row.product_title,
    sellerSku: row.seller_sku,
  }));
}

export interface ReviewSummary {
  total: number;
  unanswered: number;
  /** Средняя оценка за период; null, если отзывов за период не было. */
  averageRating: number | null;
  negativeUnanswered: number;
}

/** Сводка по отзывам за период. Считается в SQL: тут нет логики, только счёт строк. */
export async function fetchReviewSummary(scope: StoreScope, since: Date): Promise<ReviewSummary> {
  const result = await getDb().execute<{
    total: string;
    unanswered: string;
    average_rating: string | null;
    negative_unanswered: string;
  }>(sql`
    select
      count(*)                                                          as total,
      count(*) filter (where answered = false)                          as unanswered,
      avg(rating) filter (where created_at_external >= ${since})         as average_rating,
      count(*) filter (where answered = false and rating <= 2)          as negative_unanswered
    from reviews
    where organization_id = ${scope.organizationId}
      and store_id = ${scope.storeId}
  `);

  const row = result.rows[0];
  return {
    // count() и avg() приходят строками: bigint и numeric не влезают в number.
    total: Number(row?.total ?? 0),
    unanswered: Number(row?.unanswered ?? 0),
    averageRating: row?.average_rating == null ? null : Number(row.average_rating),
    negativeUnanswered: Number(row?.negative_unanswered ?? 0),
  };
}

/**
 * Сохраняет черновик ответа. Отправку на площадку не делает: коннектор
 * ещё не умеет писать, а черновик без отправки всё равно полезен — его можно
 * подготовить заранее и отправить одним действием, когда запись появится.
 */
export async function saveDraftReply(
  scope: StoreScope,
  reviewExternalId: string,
  draft: string,
): Promise<boolean> {
  const updated = await getDb()
    .update(reviews)
    .set({ draftReply: draft })
    .where(
      and(
        eq(reviews.organizationId, scope.organizationId),
        eq(reviews.storeId, scope.storeId),
        eq(reviews.externalId, reviewExternalId),
      ),
    )
    .returning({ id: reviews.id });

  return updated.length > 0;
}
