import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, isLocale, resolveLocale, t, translatorFor } from './index';
import { ru } from './locales/ru';
import { en } from './locales/en';

test('каталоги покрывают одинаковый набор ключей', () => {
  const ruKeys = Object.keys(ru).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(enKeys, ruKeys, 'английский каталог разошёлся с эталонным русским');
});

test('ни одна строка не осталась пустой', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = locale === 'ru' ? ru : en;
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(value.trim().length > 0, `пустая строка: ${locale}.${key}`);
    }
  }
});

test('плейсхолдеры совпадают между языками', () => {
  // Разъехавшийся набор {параметров} — тихая ошибка: текст выведется с {name} внутри.
  const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(ru) as Array<keyof typeof ru>) {
    assert.deepEqual(placeholders(en[key]), placeholders(ru[key]), `плейсхолдеры разошлись в ключе ${key}`);
  }
});

test('подстановка параметров работает', () => {
  const message = t('ru', 'alert.stock_critical.body', { sku: 'BP-1', quantity: 14, days: 4 });
  assert.match(message, /BP-1/);
  assert.match(message, /14 шт/);
  assert.match(message, /4 дн/);
  assert.ok(!message.includes('{'), 'все плейсхолдеры должны быть заменены');
});

test('незаданный параметр остаётся видимым, а не превращается в undefined', () => {
  const message = t('ru', 'alert.stock_critical.body', { sku: 'BP-1' });
  assert.ok(message.includes('{days}'), 'пропуск параметра должен быть заметен');
  assert.ok(!message.includes('undefined'));
});

test('локаль из кода языка Telegram', () => {
  assert.equal(resolveLocale('ru-RU'), 'ru');
  assert.equal(resolveLocale('en'), 'en');
  assert.equal(resolveLocale('EN-GB'), 'en');
  assert.equal(resolveLocale('zh-CN'), 'ru', 'неподдерживаемый язык падает в дефолт');
  assert.equal(resolveLocale(undefined, 'en'), 'en');
});

test('isLocale не пропускает лишнее', () => {
  assert.equal(isLocale('ru'), true);
  assert.equal(isLocale('de'), false);
  assert.equal(isLocale(undefined), false);
});

test('translatorFor фиксирует локаль', () => {
  const translate = translatorFor('en');
  assert.equal(translate('common.yes'), 'Yes');
});
