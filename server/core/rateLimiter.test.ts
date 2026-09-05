import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, RateLimiterRegistry } from './rateLimiter';

test('запросы в пределах ёмкости проходят без задержки', async () => {
  const limiter = new RateLimiter({ capacity: 5, intervalMs: 1000 });
  const startedAt = Date.now();
  await Promise.all([limiter.acquire(), limiter.acquire(), limiter.acquire()]);
  assert.ok(Date.now() - startedAt < 50, 'не должно ждать, пока есть токены');
});

test('превышение ёмкости заставляет ждать', async () => {
  // Ёмкость 2 за 200 мс: третий запрос ждёт примерно 100 мс до накопления токена.
  const limiter = new RateLimiter({ capacity: 2, intervalMs: 200 });
  await limiter.acquire();
  await limiter.acquire();

  const startedAt = Date.now();
  await limiter.acquire();
  const waited = Date.now() - startedAt;

  assert.ok(waited >= 60, `третий запрос должен был ждать, ждал ${waited} мс`);
});

test('порядок ожидающих сохраняется', async () => {
  const limiter = new RateLimiter({ capacity: 1, intervalMs: 100 });
  await limiter.acquire();

  const order: number[] = [];
  await Promise.all([
    limiter.acquire().then(() => order.push(1)),
    limiter.acquire().then(() => order.push(2)),
    limiter.acquire().then(() => order.push(3)),
  ]);

  assert.deepEqual(order, [1, 2, 3]);
});

test('snapshot показывает состояние очереди', async () => {
  const limiter = new RateLimiter({ capacity: 3, intervalMs: 1000 });
  await limiter.acquire();
  const snapshot = limiter.snapshot();
  assert.equal(snapshot.capacity, 3);
  assert.equal(snapshot.queued, 0);
  assert.ok(snapshot.availableTokens <= 2);
});

test('реестр возвращает один и тот же лимитер на ключ', () => {
  const registry = new RateLimiterRegistry();
  const config = { capacity: 1, intervalMs: 1000 };
  const first = registry.get('wb:store-1:content', config);
  const second = registry.get('wb:store-1:content', config);
  const other = registry.get('wb:store-2:content', config);

  assert.equal(first, second, 'один магазин и группа — один лимитер');
  assert.notEqual(first, other, 'разные магазины не делят лимит');
});
