import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AttemptLimiter } from './attemptLimiter';

test('попытки сверх лимита отклоняются, а не ставятся в очередь', () => {
  // Очередь превратила бы перебор пароля в медленный, но рабочий.
  const limiter = new AttemptLimiter({ limit: 3, windowMs: 60_000 });

  assert.equal(limiter.consume('a').allowed, true);
  assert.equal(limiter.consume('a').allowed, true);
  assert.equal(limiter.consume('a').allowed, true);
  assert.equal(limiter.consume('a').allowed, false);
});

test('счётчик отдаёт остаток и время до сброса', () => {
  const limiter = new AttemptLimiter({ limit: 2, windowMs: 60_000 });
  const first = limiter.consume('a', 1000);
  assert.equal(first.remaining, 1);
  assert.equal(first.retryAfterMs, 60_000);

  const blocked = limiter.consume('a', 1000);
  assert.equal(blocked.allowed, true);
  assert.equal(limiter.consume('a', 1000).allowed, false);
});

test('окно сбрасывается по времени', () => {
  const limiter = new AttemptLimiter({ limit: 1, windowMs: 1000 });
  assert.equal(limiter.consume('a', 0).allowed, true);
  assert.equal(limiter.consume('a', 500).allowed, false);
  assert.equal(limiter.consume('a', 1500).allowed, true, 'после окна попытки снова разрешены');
});

test('ключи не мешают друг другу', () => {
  const limiter = new AttemptLimiter({ limit: 1, windowMs: 60_000 });
  assert.equal(limiter.consume('первый').allowed, true);
  assert.equal(limiter.consume('второй').allowed, true);
  assert.equal(limiter.consume('первый').allowed, false);
});

test('успешный вход снимает счётчик', () => {
  const limiter = new AttemptLimiter({ limit: 2, windowMs: 60_000 });
  limiter.consume('a');
  limiter.consume('a');
  assert.equal(limiter.consume('a').allowed, false);

  limiter.reset('a');
  assert.equal(limiter.consume('a').allowed, true);
});

test('словарь не растёт бесконечно', () => {
  // Ключ приходит из запроса: без потолка это способ съесть память чужими
  // данными, а не защита.
  const limiter = new AttemptLimiter({ limit: 5, windowMs: 60_000, maxKeys: 50 });

  for (let i = 0; i < 500; i += 1) limiter.consume(`ключ-${i}`);

  assert.ok(limiter.size() <= 50, `в словаре ${limiter.size()} ключей`);
});

test('истёкшие ключи вычищаются раньше живых', () => {
  const limiter = new AttemptLimiter({ limit: 5, windowMs: 1000, maxKeys: 10 });

  for (let i = 0; i < 9; i += 1) limiter.consume(`старый-${i}`, 0);
  // Спустя окно все старые протухли; новый ключ должен вытеснить именно их.
  limiter.consume('свежий', 5000);

  assert.ok(limiter.size() <= 10);
  assert.equal(limiter.consume('свежий', 5000).remaining, 3, 'свежий ключ не выброшен');
});
