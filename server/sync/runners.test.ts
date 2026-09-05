/**
 * Тесты обхода страниц. Без сети и без БД: проверяется только логика пагинации,
 * которая одинакова для всех площадок и в которой легко получить вечный цикл.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forEachPage, MAX_PAGES } from './runners';
import type { Page } from '../connectors/types';

/** Отдаёт заранее заданные страницы по порядку. */
function pagesOf<T>(pages: Array<Page<T>>) {
  let index = 0;
  const requestedCursors: Array<string | undefined> = [];
  return {
    requestedCursors,
    fetch: async (cursor: string | undefined): Promise<Page<T>> => {
      requestedCursors.push(cursor);
      const page = pages[Math.min(index, pages.length - 1)];
      index += 1;
      return page ?? { items: [] };
    },
  };
}

const collect = <T>(sink: T[]) => async (items: T[]) => {
    sink.push(...items);
    return items.length;
  };

test('одна страница без курсора — один запрос', async () => {
  const source = pagesOf([{ items: [1, 2, 3] }]);
  const collected: number[] = [];

  const processed = await forEachPage(source.fetch, collect(collected));

  assert.equal(processed, 3);
  assert.deepEqual(collected, [1, 2, 3]);
  assert.deepEqual(source.requestedCursors, [undefined]);
});

test('курсор прокидывается в следующий запрос', async () => {
  const source = pagesOf([
    { items: [1], nextCursor: 'c1' },
    { items: [2], nextCursor: 'c2' },
    { items: [3] },
  ]);
  const collected: number[] = [];

  const processed = await forEachPage(source.fetch, collect(collected));

  assert.equal(processed, 3);
  assert.deepEqual(collected, [1, 2, 3]);
  assert.deepEqual(source.requestedCursors, [undefined, 'c1', 'c2']);
});

test('повторяющийся курсор останавливает обход', async () => {
  // Площадка отдаёт один и тот же курсор — без защиты это вечный цикл.
  const source = pagesOf([{ items: [1], nextCursor: 'same' }, { items: [2], nextCursor: 'same' }]);
  const collected: number[] = [];

  await forEachPage(source.fetch, collect(collected));

  assert.deepEqual(collected, [1, 2], 'второй одинаковый курсор прекращает обход');
});

test('пустая страница с курсором не приводит к бесконечному обходу', async () => {
  const source = pagesOf([{ items: [] as number[], nextCursor: 'c1' }]);
  const collected: number[] = [];

  await forEachPage(source.fetch, collect(collected));

  assert.equal(source.requestedCursors.length, 1);
});

test('обход ограничен потолком страниц', async () => {
  // Курсор всегда новый: единственная защита — MAX_PAGES.
  let counter = 0;
  const collected: number[] = [];

  await forEachPage(
    async () => {
      counter += 1;
      return { items: [counter], nextCursor: `cursor-${counter}` };
    },
    collect(collected),
  );

  assert.equal(collected.length, MAX_PAGES);
});

test('ошибка страницы всплывает наружу, а не глотается', async () => {
  await assert.rejects(
    () =>
      forEachPage<number>(
        async () => {
          throw new Error('площадка вернула 500');
        },
        async () => 0,
      ),
    /площадка вернула 500/,
  );
});
