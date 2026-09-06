/**
 * Проверки страницы настройки.
 *
 * Скрипт страницы встроен в шаблонную строку TypeScript, поэтому компилятор
 * его не читает: сломанная кавычка или лишний перенос строки превращаются
 * в SyntaxError, который виден только в браузере и только по пустой странице.
 * Один такой случай уже был — отсюда эти тесты.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETUP_PAGE } from './setup-page';

function inlineScript(): string {
  const match = SETUP_PAGE.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'на странице нет встроенного скрипта');
  return match[1] as string;
}

test('встроенный скрипт синтаксически корректен', () => {
  // Function только разбирает исходник, не выполняя его: нам нужен именно разбор.
  assert.doesNotThrow(() => new Function(inlineScript()));
});

test('страница не тянет ничего извне', () => {
  // CSP запрещает внешние источники; ссылка на CDN означала бы пустую страницу
  // в браузере пользователя и ничего в логах сервера.
  const external = SETUP_PAGE.match(/(src|href)\s*=\s*["']https?:\/\/[^"']+/gi) ?? [];
  assert.deepEqual(external, [], `внешние ресурсы: ${external.join(', ')}`);
});

test('элементы, с которыми работает скрипт, есть в разметке', () => {
  const script = inlineScript();
  const ids = [...script.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1] as string);
  const unique = [...new Set(ids)];
  assert.ok(unique.length > 5, 'скрипт подозрительно мало обращается к разметке');

  // Часть узлов создаётся самим скриптом — их ищем и в разметке, и в нём.
  for (const id of unique) {
    const inMarkup = SETUP_PAGE.includes(`id="${id}"`);
    const created = script.includes(`id="${id}"`) || script.includes(`id='${id}'`);
    assert.ok(inMarkup || created, `нет элемента с id="${id}"`);
  }
});

test('на странице сказано, что демо-интерфейс работает на выдуманных данных', () => {
  // Иначе продавец решит, что цифры на главной — его.
  assert.match(SETUP_PAGE, /выдуманных данных/);
});

test('предупреждение о токене на месте', () => {
  assert.match(SETUP_PAGE, /шифруется перед записью/);
  assert.match(SETUP_PAGE, /не вставляйте сюда чужой/);
});

test('поля пароля и токена скрывают ввод', () => {
  for (const id of ['password', 'api-key']) {
    const field = SETUP_PAGE.match(new RegExp(`<input id="${id}"[^>]*>`));
    assert.ok(field, `нет поля ${id}`);
    assert.match(field[0], /type="password"/, `поле ${id} показывает секрет открытым текстом`);
  }
});
