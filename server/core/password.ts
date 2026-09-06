/**
 * Хеширование паролей на scrypt из стандартной библиотеки.
 *
 * Почему scrypt, а не bcrypt/argon2: он есть в Node из коробки. Зависимость
 * ради хеширования пароля — лишний нативный модуль, который ломается при смене
 * версии Node и при сборке образа под другую архитектуру. scrypt памяти-жадный
 * и для наших задач достаточен.
 *
 * Формат хранения: scrypt$N$r$p$<salt_b64>$<hash_b64>. Параметры в самой строке,
 * поэтому их можно поднять, не ломая уже созданные пароли: старые проверятся
 * своими параметрами, новые — новыми.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Текущие параметры. N=16384 — компромисс между стойкостью и ~50 мс на проверку. */
const PARAMS = { N: 16_384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** scrypt требует памяти примерно 128·N·r; даём запас, иначе падает на ERR_CRYPTO. */
const MAX_MEM = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 10;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль короче ${MIN_PASSWORD_LENGTH} символов.`;
  }
  // Длина важнее состава символов: «Password1!» слабее, чем длинная фраза.
  if (password.length > 200) return 'Пароль длиннее 200 символов.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEM });
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

/**
 * Проверка пароля. Никогда не бросает на неверном пароле или битой строке —
 * возвращает false: разница между «пароль не тот» и «запись повреждена»
 * не должна утекать наружу и помогать перебору.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  try {
    const salt = Buffer.from(parts[4] as string, 'base64');
    const expected = Buffer.from(parts[5] as string, 'base64');
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scrypt(password, salt, expected.length, { N, r, p, maxmem: MAX_MEM });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Пора ли перехешировать: параметры в записи слабее текущих. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return Number(parts[1]) < PARAMS.N;
}
