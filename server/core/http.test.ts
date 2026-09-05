import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.LOG_LEVEL = 'silent';

const { httpJson } = await import('./http');
const { ConnectorError } = await import('./errors');

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

interface StubResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Подменяет fetch очередью ответов и считает вызовы. */
function stubFetch(responses: StubResponse[]): { calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let index = 0;

  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const stub = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (!stub) throw new Error('Нет заготовленного ответа');
    return new Response(stub.body === undefined ? '' : JSON.stringify(stub.body), {
      status: stub.status,
      headers: { 'content-type': 'application/json', ...stub.headers },
    });
  }) as typeof fetch;

  return { calls };
}

test('успешный ответ разбирается в JSON', async () => {
  stubFetch([{ status: 200, body: { cards: [1, 2] } }]);
  const result = await httpJson<{ cards: number[] }>('https://example.test/api', { source: 'test' });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.cards, [1, 2]);
});

test('query собирается в URL', async () => {
  const stub = stubFetch([{ status: 200, body: {} }]);
  await httpJson('https://example.test/api', {
    source: 'test',
    query: { limit: 100, skip: 0, missing: undefined },
  });
  const url = new URL(stub.calls[0]?.url ?? '');
  assert.equal(url.searchParams.get('limit'), '100');
  assert.equal(url.searchParams.get('skip'), '0');
  assert.equal(url.searchParams.has('missing'), false, 'undefined не попадает в query');
});

test('401 не ретраится и классифицируется как ошибка авторизации', async () => {
  const stub = stubFetch([{ status: 401, body: { message: 'invalid token' } }]);
  await assert.rejects(
    () => httpJson('https://example.test/api', { source: 'wildberries', retries: 2 }),
    (error: unknown) => {
      assert.ok(error instanceof ConnectorError);
      assert.equal(error.code, 'AUTH_ERROR');
      assert.equal(error.retryable, false);
      return true;
    },
  );
  assert.equal(stub.calls.length, 1, 'повторов быть не должно');
});

test('429 ретраится и уважает Retry-After', async () => {
  const stub = stubFetch([
    { status: 429, headers: { 'retry-after': '0' } },
    { status: 200, body: { ok: true } },
  ]);
  const result = await httpJson<{ ok: boolean }>('https://example.test/api', { source: 'test', retries: 2 });
  assert.equal(result.data.ok, true);
  assert.equal(stub.calls.length, 2);
});

test('исчерпание ретраев на 503 отдаёт ошибку с retryable', async () => {
  const stub = stubFetch([{ status: 503, headers: { 'retry-after': '0' } }]);
  await assert.rejects(
    () => httpJson('https://example.test/api', { source: 'test', retries: 2 }),
    (error: unknown) => {
      assert.ok(error instanceof ConnectorError);
      assert.equal(error.code, 'UPSTREAM_ERROR');
      assert.equal(error.retryable, true);
      return true;
    },
  );
  assert.equal(stub.calls.length, 3, 'первая попытка плюс два повтора');
});

test('тело ошибки обрезается — простыня HTML не уезжает в лог целиком', async () => {
  stubFetch([{ status: 400, body: 'x'.repeat(5000) }]);
  await assert.rejects(
    () => httpJson('https://example.test/api', { source: 'test', retries: 0 }),
    (error: unknown) => {
      assert.ok(error instanceof ConnectorError);
      assert.ok(error.message.length < 700, `сообщение длиной ${error.message.length}`);
      return true;
    },
  );
});

test('таймаут превращается в TIMEOUT', async () => {
  globalThis.fetch = ((_input: string | URL | Request, init: RequestInit = {}) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as typeof fetch;

  await assert.rejects(
    () => httpJson('https://example.test/api', { source: 'test', retries: 0, timeoutMs: 30 }),
    (error: unknown) => {
      assert.ok(error instanceof ConnectorError);
      assert.equal(error.code, 'TIMEOUT');
      return true;
    },
  );
});

test('тело запроса сериализуется, заголовок Content-Type ставится', async () => {
  const stub = stubFetch([{ status: 200, body: {} }]);
  await httpJson('https://example.test/api', { source: 'test', method: 'POST', body: { a: 1 } });
  const init = stub.calls[0]?.init;
  assert.equal(init?.body, '{"a":1}');
  assert.equal((init?.headers as Record<string, string>)['Content-Type'], 'application/json');
});
