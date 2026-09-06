import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, needsRehash, validatePasswordStrength, verifyPassword } from './password';

test('верный пароль проходит, неверный — нет', async () => {
  const stored = await hashPassword('длинный-пароль-пользователя');

  assert.equal(await verifyPassword('длинный-пароль-пользователя', stored), true);
  assert.equal(await verifyPassword('длинный-пароль-пользователя ', stored), false);
  assert.equal(await verifyPassword('другой-пароль-совсем', stored), false);
});

test('одинаковые пароли дают разные хеши', async () => {
  // Случайная соль: одинаковые пароли не должны выглядеть одинаково в дампе.
  const first = await hashPassword('одинаковый-пароль');
  const second = await hashPassword('одинаковый-пароль');
  assert.notEqual(first, second);
});

test('формат хранения содержит параметры', async () => {
  const parts = (await hashPassword('пароль-для-проверки')).split('$');
  assert.equal(parts.length, 6);
  assert.equal(parts[0], 'scrypt');
  assert.equal(Number(parts[1]) >= 16384, true, 'параметр N слабее ожидаемого');
});

test('юникод и длинные пароли работают', async () => {
  const password = 'пароль-中文-🔑-with-emoji-and-length';
  assert.equal(await verifyPassword(password, await hashPassword(password)), true);
});

test('битая или чужая строка не роняет проверку', async () => {
  // Отличать «пароль не тот» от «запись повреждена» наружу нельзя:
  // это подсказка для перебора.
  for (const broken of ['', 'мусор', 'scrypt$16384$8$1$неполно', 'bcrypt$1$2$3$4$5', 'scrypt$x$8$1$AA==$AA==']) {
    assert.equal(await verifyPassword('любой', broken), false);
  }
});

test('пустая соль или хеш отвергаются', async () => {
  assert.equal(await verifyPassword('пароль', 'scrypt$16384$8$1$$'), false);
});

test('короткий пароль не принимается', () => {
  assert.ok(validatePasswordStrength('короткий'));
  assert.equal(validatePasswordStrength('достаточно-длинный-пароль'), null);
});

test('слишком длинный пароль тоже отвергается', () => {
  // Иначе scrypt на мегабайтном вводе становится способом положить сервер.
  assert.ok(validatePasswordStrength('a'.repeat(500)));
});

test('перехеширование нужно только для устаревших параметров', async () => {
  assert.equal(needsRehash(await hashPassword('нормальный-пароль')), false);
  assert.equal(needsRehash('scrypt$1024$8$1$AA==$AA=='), true);
  assert.equal(needsRehash('мусор'), true);
});
