import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Ключ ставится до первого импорта config/env: env читается один раз при загрузке модуля.
process.env.SECRETS_ENCRYPTION_KEY = randomBytes(32).toString('base64');

const { encryptSecret, decryptSecret, generateEncryptionKey, isEncryptionConfigured, safeCompare } = await import(
  './crypto'
);

test('шифрование настроено при корректном ключе', () => {
  assert.equal(isEncryptionConfigured(), true);
});

test('расшифровка возвращает исходный токен', () => {
  const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6InRlc3QifQ.payload.signature';
  assert.equal(decryptSecret(encryptSecret(token)), token);
});

test('кириллица и юникод переживают цикл', () => {
  const secret = 'токен-магазина-中文-🔑';
  assert.equal(decryptSecret(encryptSecret(secret)), secret);
});

test('один и тот же текст даёт разные шифротексты', () => {
  // Случайный IV: одинаковые токены не должны выглядеть одинаково в дампе БД.
  assert.notEqual(encryptSecret('same'), encryptSecret('same'));
});

test('формат хранения версионированный', () => {
  const parts = encryptSecret('x').split(':');
  assert.equal(parts.length, 4);
  assert.equal(parts[0], 'v1');
});

test('подмена шифротекста отвергается тегом аутентичности', () => {
  const stored = encryptSecret('секрет');
  const parts = stored.split(':');
  const tampered = Buffer.from(parts[3] as string, 'base64');
  tampered[0] = (tampered[0] ?? 0) ^ 0xff;
  parts[3] = tampered.toString('base64');
  assert.throws(() => decryptSecret(parts.join(':')));
});

test('битый формат даёт понятную ошибку, а не падение', () => {
  assert.throws(() => decryptSecret('мусор'), /формат/);
  assert.throws(() => decryptSecret('v9:a:b:c'), /версия/);
});

test('генератор выдаёт ключ нужной длины', () => {
  assert.equal(Buffer.from(generateEncryptionKey(), 'base64').length, 32);
});

test('сравнение секретов устойчиво к разной длине', () => {
  assert.equal(safeCompare('abc', 'abc'), true);
  assert.equal(safeCompare('abc', 'abd'), false);
  assert.equal(safeCompare('abc', 'abcd'), false);
});

// --- Ротация ключа: работа с явными ключами, без обращения к окружению ------

const { encryptWith, decryptWith, decryptWithKeys, parseKey } = await import('./crypto');

const keyA = randomBytes(32);
const keyB = randomBytes(32);

test('чужой ключ не расшифровывает, а падает', () => {
  // Тег аутентичности GCM: подбор ключа не даёт «правдоподобный мусор».
  const stored = encryptWith(keyA, 'токен');
  assert.throws(() => decryptWith(keyB, stored));
});

test('при ротации читаем и новым, и старым ключом', () => {
  const onOldKey = encryptWith(keyB, 'старый токен');
  const onNewKey = encryptWith(keyA, 'новый токен');

  assert.equal(decryptWithKeys([keyA, keyB], onOldKey), 'старый токен');
  assert.equal(decryptWithKeys([keyA, keyB], onNewKey), 'новый токен');
});

test('без старого ключа сообщение подсказывает, что делать', () => {
  const stored = encryptWith(keyB, 'x');
  assert.throws(() => decryptWithKeys([keyA], stored), /SECRETS_ENCRYPTION_KEY_PREVIOUS/);
});

test('когда не подошёл ни один ключ, это видно из текста', () => {
  const stored = encryptWith(randomBytes(32), 'x');
  assert.throws(() => decryptWithKeys([keyA, keyB], stored), /ни текущим, ни предыдущим/);
});

test('битый формат не заставляет перебирать ключи', () => {
  // Ошибка формата должна всплыть сразу, а не после безуспешного перебора.
  assert.throws(() => decryptWithKeys([keyA, keyB], 'мусор'), /формат/);
});

test('ключ неверной длины отвергается с указанием переменной', () => {
  assert.throws(() => parseKey(Buffer.alloc(16).toString('base64'), 'SECRETS_ENCRYPTION_KEY'), /SECRETS_ENCRYPTION_KEY/);
});
