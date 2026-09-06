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
 *
 * Ротация ключа. Шифруем всегда текущим ключом, расшифровываем текущим, а если
 * не вышло — предыдущим (`SECRETS_ENCRYPTION_KEY_PREVIOUS`). Идентификатор ключа
 * в шифротексте не хранится намеренно: тег аутентичности GCM и так делает подбор
 * однозначным — с чужим ключом расшифровка гарантированно падает, а не выдаёт мусор.
 * Перешифровать всё под новый ключ: npm run rotate:key -- --apply
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';
import { ConfigError, ValidationError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = 'v1';

/** Разбирает base64-ключ и проверяет длину. Бросает понятную ошибку, а не «invalid key length». */
export function parseKey(raw: string, variableName: string): Buffer {
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new ConfigError(
      `${variableName} должен быть base64 от ${KEY_BYTES} байт (получено ${key.length}). Сгенерировать: npm run gen:key`,
    );
  }
  return key;
}

let cachedKeys: { current: Buffer; previous?: Buffer } | null = null;

function getKeys(): { current: Buffer; previous?: Buffer } {
  if (cachedKeys) return cachedKeys;

  const raw = env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new ConfigError(
      'SECRETS_ENCRYPTION_KEY не задан — сохранять токены маркетплейсов нельзя. Сгенерируй ключ: npm run gen:key',
    );
  }

  const current = parseKey(raw, 'SECRETS_ENCRYPTION_KEY');
  const previousRaw = env.SECRETS_ENCRYPTION_KEY_PREVIOUS;

  cachedKeys = {
    current,
    ...(previousRaw === undefined
      ? {}
      : { previous: parseKey(previousRaw, 'SECRETS_ENCRYPTION_KEY_PREVIOUS') }),
  };
  return cachedKeys;
}

/** Есть ли рабочий ключ. Для health-check, чтобы не ловить исключение. */
export function isEncryptionConfigured(): boolean {
  try {
    getKeys();
    return true;
  } catch {
    return false;
  }
}

/** Идёт ли сейчас ротация: задан второй ключ, значит часть записей ещё на старом. */
export function isRotationInProgress(): boolean {
  try {
    return getKeys().previous !== undefined;
  } catch {
    return false;
  }
}

// --- Низкий уровень: явный ключ, без обращения к окружению ------------------

export function encryptWith(key: Buffer, plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptWith(key: Buffer, stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 4) {
    throw new ValidationError('Повреждённое значение секрета: неверный формат.');
  }
  const [version, ivB64, tagB64, dataB64] = parts as [string, string, string, string];
  if (version !== VERSION) {
    throw new ValidationError(`Неизвестная версия шифрования секрета: ${version}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Пробует ключи по очереди. Первый — текущий, дальше запасные.
 * Ошибку формата (а не ключа) пробрасывает сразу: перебирать ключи бессмысленно,
 * если строка вообще не шифротекст.
 */
export function decryptWithKeys(keys: Buffer[], stored: string): string {
  let lastError: unknown;

  for (const key of keys) {
    try {
      return decryptWith(key, stored);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      lastError = error;
    }
  }

  throw new ValidationError(
    keys.length > 1
      ? 'Секрет не расшифровывается ни текущим, ни предыдущим ключом. Ключ потерян или запись повреждена.'
      : 'Секрет не расшифровывается текущим ключом. Если ключ менялся, укажи старый в SECRETS_ENCRYPTION_KEY_PREVIOUS и выполни npm run rotate:key -- --apply',
    { cause: String(lastError) },
  );
}

// --- Рабочие функции на ключах из окружения ---------------------------------

export function encryptSecret(plaintext: string): string {
  return encryptWith(getKeys().current, plaintext);
}

export function decryptSecret(stored: string): string {
  const { current, previous } = getKeys();
  return decryptWithKeys(previous ? [current, previous] : [current], stored);
}

/** Зашифрована ли запись актуальным ключом. Нужно скрипту ротации для отчёта. */
export function isEncryptedWithCurrentKey(stored: string): boolean {
  try {
    decryptWith(getKeys().current, stored);
    return true;
  } catch {
    return false;
  }
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

/** Сброс кеша ключей. Только для тестов и скрипта ротации. */
export function resetKeyCache(): void {
  cachedKeys = null;
}
