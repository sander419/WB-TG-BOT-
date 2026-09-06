/**
 * Интеграционные тесты ленты отзывов.
 *
 * Порядок выдачи и фильтр «без ответа» задаются в SQL — проверяются только
 * выполнением запроса.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { closeDatabase } from '../client';
import { skipWithoutDb, withTenant } from '../testing';
import { upsertProducts, upsertReviews } from './catalog';
import { fetchReviewFeed, fetchReviewSummary, saveDraftReply } from './reviews';
import { money } from '../../core/money';
import type { NormalizedReview } from '../../connectors/types';

after(async () => {
  await closeDatabase();
});

const HOUR = 60 * 60 * 1000;

const review = (patch: Partial<NormalizedReview> & { externalId: string }): NormalizedReview => ({
  productExternalId: 'ext-1',
  createdAt: new Date().toISOString(),
  rating: 5,
  text: 'Нормально',
  answered: false,
  ...patch,
});

test('лента ставит худшие оценки первыми, свежие внутри оценки', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const now = Date.now();
    await upsertReviews(tenant, [
      review({ externalId: 'пятёрка', rating: 5, createdAt: new Date(now).toISOString() }),
      review({ externalId: 'единица-старая', rating: 1, createdAt: new Date(now - 5 * HOUR).toISOString() }),
      review({ externalId: 'единица-свежая', rating: 1, createdAt: new Date(now - HOUR).toISOString() }),
      review({ externalId: 'тройка', rating: 3, createdAt: new Date(now).toISOString() }),
    ]);

    const feed = await fetchReviewFeed(tenant, { limit: 10 });

    assert.deepEqual(
      feed.map((item) => item.externalId),
      ['единица-свежая', 'единица-старая', 'тройка', 'пятёрка'],
      'единица недельной давности важнее сегодняшней пятёрки',
    );
  });
});

test('фильтр «без ответа» отсекает отвеченные', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertReviews(tenant, [
      review({ externalId: 'отвеченный', rating: 1, answered: true }),
      review({ externalId: 'ждёт', rating: 2, answered: false }),
    ]);

    const all = await fetchReviewFeed(tenant, { limit: 10 });
    const pending = await fetchReviewFeed(tenant, { limit: 10, onlyUnanswered: true });

    assert.equal(all.length, 2);
    assert.deepEqual(
      pending.map((item) => item.externalId),
      ['ждёт'],
    );
  });
});

test('название товара подтягивается из каталога', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertProducts(tenant, [
      {
        externalId: 'ext-1',
        sellerSku: 'BP-1',
        title: 'Рюкзак городской',
        imageUrls: [],
        price: money(199_000, 'RUB'),
      },
    ]);
    await upsertReviews(tenant, [review({ externalId: 'fb-1', rating: 2 })]);

    const feed = await fetchReviewFeed(tenant, { limit: 10 });
    assert.equal(feed[0]?.productTitle, 'Рюкзак городской');
    assert.equal(feed[0]?.sellerSku, 'BP-1');
  });
});

test('отзыв без карточки не выпадает из ленты', skipWithoutDb, async () => {
  // Отзывы могут синхронизироваться раньше каталога.
  await withTenant(async (tenant) => {
    await upsertReviews(tenant, [review({ externalId: 'fb-1', rating: 1 })]);

    const feed = await fetchReviewFeed(tenant, { limit: 10 });
    assert.equal(feed.length, 1, 'left join, а не inner: иначе отзыв потеряется');
    assert.equal(feed[0]?.productTitle, null);
  });
});

test('лимит выдачи соблюдается', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertReviews(
      tenant,
      Array.from({ length: 8 }, (_, index) => review({ externalId: `fb-${index}`, rating: 1 })),
    );

    assert.equal((await fetchReviewFeed(tenant, { limit: 3 })).length, 3);
  });
});

test('сводка считает всё, без ответа и негатив отдельно', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const now = Date.now();
    await upsertReviews(tenant, [
      review({ externalId: 'a', rating: 1, answered: false, createdAt: new Date(now).toISOString() }),
      review({ externalId: 'b', rating: 2, answered: false, createdAt: new Date(now).toISOString() }),
      review({ externalId: 'c', rating: 4, answered: false, createdAt: new Date(now).toISOString() }),
      review({ externalId: 'd', rating: 5, answered: true, createdAt: new Date(now).toISOString() }),
    ]);

    const summary = await fetchReviewSummary(tenant, new Date(now - HOUR));

    assert.equal(summary.total, 4);
    assert.equal(summary.unanswered, 3);
    assert.equal(summary.negativeUnanswered, 2, 'негатив — это 1 и 2, а не всё без ответа');
    assert.equal(summary.averageRating, 3, '(1+2+4+5)/4');
  });
});

test('средняя оценка за период, где отзывов нет, — null, а не ноль', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertReviews(tenant, [
      review({ externalId: 'старый', rating: 5, createdAt: new Date(Date.now() - 50 * HOUR).toISOString() }),
    ]);

    const summary = await fetchReviewSummary(tenant, new Date(Date.now() - HOUR));
    assert.equal(summary.total, 1, 'всего считается без ограничения по периоду');
    assert.equal(summary.averageRating, null, 'ноль означал бы «все поставили ноль»');
  });
});

test('черновик сохраняется и виден в ленте', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await upsertReviews(tenant, [review({ externalId: 'fb-1', rating: 1 })]);

    assert.equal(await saveDraftReply(tenant, 'fb-1', 'Здравствуйте! Заменим.'), true);

    const feed = await fetchReviewFeed(tenant, { limit: 10 });
    assert.equal(feed[0]?.draftReply, 'Здравствуйте! Заменим.');
  });
});

test('черновик нельзя записать в чужой магазин', skipWithoutDb, async () => {
  await withTenant(async (first) => {
    await withTenant(async (second) => {
      await upsertReviews(first, [review({ externalId: 'fb-1', rating: 1 })]);

      assert.equal(
        await saveDraftReply(second, 'fb-1', 'чужой черновик'),
        false,
        'запись прошла бы мимо фильтра по организации',
      );

      const feed = await fetchReviewFeed(first, { limit: 10 });
      assert.equal(feed[0]?.draftReply, null);
    });
  });
});

test('лента не отдаёт чужие отзывы', skipWithoutDb, async () => {
  await withTenant(async (first) => {
    await withTenant(async (second) => {
      await upsertReviews(first, [review({ externalId: 'fb-1', rating: 1 })]);

      assert.equal((await fetchReviewFeed(second, { limit: 10 })).length, 0);
      assert.equal((await fetchReviewSummary(second, new Date(Date.now() - HOUR))).total, 0);
    });
  });
});
