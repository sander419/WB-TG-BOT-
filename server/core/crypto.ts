/**
 * Шифрование секретов продавцов (API-токены WB/Ozon/Shopify) перед записью в БД.
 *
 * Почему не открытым текстом: платформа multi-tenant, токен WB даёт полный доступ
 * к чужому магазину, включая цены и поставки. Дамп БД не должен означать компрометацию
 * всех клиентов.
 *
 * Алгоритм: AES-256-GCM, случайный IV на каждую запись, тег аутентичности.
 * Формат хранения: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 * Версия в префиксе — чтобы можно было сменить алгоритм и расшифровать старые записи.
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';
import { ConfigError, ValidationError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = 'v1';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new ConfigError(
      'SECRETS_ENCRYPTION_KEY не задан — сохранять токены маркетплейсов нельзя. Сгенерируй ключ: npm run gen:key',
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new ConfigError(
      `SECRETS_ENCRYPTION_KEY должен быть base64 от ${KEY_BYTES} байт (получено ${key.length}). Сгенерируй заново: npm run gen:key`,
    );
  }

  cachedKey = key;
  return key;
}

/** Есть ли рабочий ключ. Для health-check, чтобы не ловить исключение. */
export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 4) {
    throw new ValidationError('Повреждённое значение секрета: неверный формат.');
  }
  const [version, ivB64, tagB64, dataB64] = parts as [string, string, string, string];
  if (version !== VERSION) {
    throw new ValidationError(`Неизвестная версия шифрования секрета: ${version}`);
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Генерация нового ключа. Вызывается из scripts/gen-key.ts. */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString('base64');
}

/** Сравнение секретов без утечки времени — для webhook-секрета Telegram. */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
