/**
 * Интеграционные тесты очереди, событий и привязки Telegram.
 *
 * Очередь на `SKIP LOCKED`, гашение одноразового кода и подавление повторов —
 * места, где ошибка проявляется не падением, а тихой двойной обработкой.
 * Такое ловится только выполнением запросов.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { closeDatabase, getDb } from '../client';
import { events, syncJobs, telegramLinkCodes } from '../schema';
import { skipWithoutDb, withTenant } from '../testing';
import {
  claimNextJob,
  completeJob,
  enqueueSync,
  failJob,
  hasPendingJob,
  latestJobs,
  requeueStaleJobs,
} from './syncJobs';
import { recentDedupKeys, recordEvent } from './events';
import { consumeLinkCode, createLinkCode, findAccount, saveAccountLocale } from './telegram';
import { buildConnectorContext } from './stores';
import { encryptSecret } from '../../core/crypto';

after(async () => {
  await closeDatabase();
});

/** Telegram-идентификаторы уникальны, чтобы тесты не мешали друг другу. */
let telegramCounter = BigInt(Date.now());
const nextTelegramId = (): bigint => (telegramCounter += 1n);

test('задача берётся из очереди ровно один раз', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    await enqueueSync(tenant.storeId, ['products']);

    const first = await claimNextJob();
    assert.ok(first, 'первая попытка забирает задачу');

    // Повторный вызов не должен вернуть ту же строку: она уже running.
    const claimedIds = new Set([first.id]);
    for (let i = 0; i < 3; i += 1) {
      const next = await claimNextJob();
      if (next) {
        assert.equal(claimedIds.has(next.id), false, 'одна задача выдана дважды');
        claimedIds.add(next.id);
        await completeJob(next.id, 0);
      }
    }

    await completeJob(first.id, 5);
    const jobs = await latestJobs(tenant.storeId);
    const done = jobs.find((job) => job.id === first.id);
    assert.equal(done?.status, 'success');
    assert.equal(done?.itemsProcessed, 5);
  });
});

test('очередь отдаёт задачи в порядке появления', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const ids = await enqueueSync(tenant.storeId, ['products', 'stocks', 'orders']);
    assert.equal(ids.length, 3);

    const claimed: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const job = await claimNextJob();
      if (job && ids.includes(job.id)) claimed.push(job.id);
      if (job) await completeJob(job.id, 0);
    }

    assert.deepEqual(claimed, ids, 'FIFO нарушен');
  });
});

test('зависшая задача возвращается в очередь', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const [jobId] = await enqueueSync(tenant.storeId, ['products']);
    assert.ok(jobId);

    // Воркер упал между «взял» и «завершил»: статус running, started_at в прошлом.
    await getDb()
      .update(syncJobs)
      .set({ status: 'running', startedAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(syncJobs.id, jobId));

    const requeued = await requeueStaleJobs(30);
    assert.ok(requeued >= 1);

    const jobs = await latestJobs(tenant.storeId);
    assert.equal(jobs.find((job) => job.id === jobId)?.status, 'queued');
  });
});

test('свежая работающая задача в очередь не возвращается', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const [jobId] = await enqueueSync(tenant.storeId, ['products']);
    assert.ok(jobId);
    await claimNextJob();

    await requeueStaleJobs(30);

    const jobs = await latestJobs(tenant.storeId);
    const status = jobs.find((job) => job.id === jobId)?.status;
    assert.notEqual(status, 'queued', 'работающую задачу отобрали у воркера');
  });
});

test('текст ошибки обрезается, а не рвёт запись', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const [jobId] = await enqueueSync(tenant.storeId, ['products']);
    assert.ok(jobId);

    await failJob(jobId, 'x'.repeat(5000));

    const jobs = await latestJobs(tenant.storeId);
    const job = jobs.find((item) => item.id === jobId);
    assert.equal(job?.status, 'failed');
    assert.ok((job?.error?.length ?? 0) <= 1000);
  });
});

test('пока задача в очереди, планировщик не ставит вторую', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    assert.equal(await hasPendingJob(tenant.storeId, 'products'), false);
    await enqueueSync(tenant.storeId, ['products']);
    assert.equal(await hasPendingJob(tenant.storeId, 'products'), true);
    assert.equal(await hasPendingJob(tenant.storeId, 'reviews'), false);
  });
});

test('подавление повторов видит только своё окно и свой магазин', skipWithoutDb, async () => {
  await withTenant(async (first) => {
    await withTenant(async (second) => {
      await recordEvent({
        organizationId: first.organizationId,
        storeId: first.storeId,
        type: 'alert.stockout',
        severity: 'error',
        title: 'stockout',
        dedupKey: 'stockout:SKU-1',
      });

      const recent = await recentDedupKeys(first.storeId, 60_000);
      assert.equal(recent.has('stockout:SKU-1'), true);

      const foreign = await recentDedupKeys(second.storeId, 60_000);
      assert.equal(foreign.has('stockout:SKU-1'), false, 'чужой алерт подавил бы наш');

      // Состариваем запись явно. Проверять окно, сдвигая его на миллисекунды,
      // нельзя: время события ставит Postgres, а границу считает Node, и тест
      // начинает зависеть от расхождения их часов.
      await getDb()
        .update(events)
        .set({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
        .where(eq(events.storeId, first.storeId));

      const expired = await recentDedupKeys(first.storeId, 60_000);
      assert.equal(expired.has('stockout:SKU-1'), false, 'старый алерт продолжает подавлять новый');
    });
  });
});

test('код привязки срабатывает один раз', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const { code } = await createLinkCode({
      organizationId: tenant.organizationId,
      storeId: tenant.storeId,
    });

    const telegramUserId = nextTelegramId();
    const first = await consumeLinkCode(code, telegramUserId, telegramUserId, 'ru');
    assert.ok(first, 'первый раз код должен сработать');
    assert.equal(first.organizationId, tenant.organizationId);
    assert.equal(first.storeId, tenant.storeId);

    const second = await consumeLinkCode(code, nextTelegramId(), nextTelegramId(), 'ru');
    assert.equal(second, undefined, 'одноразовый код сработал повторно');

    const account = await findAccount(telegramUserId);
    assert.equal(account?.activeStoreId, tenant.storeId);
    assert.equal(account?.alertsEnabled, true);
  });
});

test('код в нижнем регистре и с пробелами принимается', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const { code } = await createLinkCode({ organizationId: tenant.organizationId });
    const telegramUserId = nextTelegramId();

    const result = await consumeLinkCode(`  ${code.toLowerCase()} `, telegramUserId, telegramUserId, 'ru');
    assert.ok(result, 'человек не обязан вводить код ровно как выдали');
  });
});

test('просроченный код не срабатывает', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const { code } = await createLinkCode({ organizationId: tenant.organizationId, ttlMinutes: 15 });
    await getDb()
      .update(telegramLinkCodes)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(telegramLinkCodes.code, code));

    const result = await consumeLinkCode(code, nextTelegramId(), nextTelegramId(), 'ru');
    assert.equal(result, undefined);
  });
});

test('смена языка сохраняется и не теряет привязку', skipWithoutDb, async () => {
  await withTenant(async (tenant) => {
    const { code } = await createLinkCode({
      organizationId: tenant.organizationId,
      storeId: tenant.storeId,
    });
    const telegramUserId = nextTelegramId();
    await consumeLinkCode(code, telegramUserId, telegramUserId, 'ru');

    await saveAccountLocale(telegramUserId, telegramUserId, 'en');

    const account = await findAccount(telegramUserId);
    assert.equal(account?.locale, 'en');
    assert.equal(account?.activeStoreId, tenant.storeId, 'привязка магазина слетела при смене языка');
  });
});

test('контекст коннектора расшифровывает токен и запрещает запись по умолчанию', skipWithoutDb, async () => {
  await withTenant(
    async (tenant) => {
      const ctx = await buildConnectorContext(tenant.organizationId, tenant.storeId);

      assert.equal(ctx.credentials.apiKey, 'секретный-токен-магазина');
      assert.equal(ctx.storeId, tenant.storeId);
      assert.equal(ctx.currency, 'RUB');
      // ALLOW_MARKETPLACE_WRITES по умолчанию false, и даже запрос записи его не переломит.
      assert.equal(ctx.allowWrites, false);

      const asked = await buildConnectorContext(tenant.organizationId, tenant.storeId, {
        allowWrites: true,
      });
      assert.equal(asked.allowWrites, false, 'общий рубильник записи обойдён');
    },
    { encryptedApiKey: encryptSecret('секретный-токен-магазина') },
  );
});

test('чужой магазин не отдаёт учётные данные', skipWithoutDb, async () => {
  await withTenant(
    async (first) => {
      await withTenant(async (second) => {
        await assert.rejects(
          () => buildConnectorContext(second.organizationId, first.storeId),
          /не найден/,
        );
      });
    },
    { encryptedApiKey: encryptSecret('чужой-токен') },
  );
});
