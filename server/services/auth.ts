/**
 * Регистрация, вход и сессии.
 *
 * Решения, которые стоит помнить:
 *
 * — Сессии в таблице, не JWT. Сессию можно отозвать: при смене пароля, при
 *   увольнении сотрудника, при подозрении на утечку. Отозвать выданный JWT
 *   без такой же таблицы нельзя, и «stateless» превращается в «неотзываемый».
 * — Ответ на неверный логин и на несуществующий пользователь одинаковый.
 *   Разные ответы позволяют перебором собрать список зарегистрированных почт.
 * — Задержка на неверном пароле одинаковая: проверка хеша выполняется даже
 *   когда пользователя нет, иначе быстрый ответ выдаёт отсутствие аккаунта.
 * — Ограничение частоты по почте и по адресу: без него подбор пароля упирается
 *   только в скорость сети.
 */
import { AppError, ValidationError } from '../core/errors';
import { childLogger } from '../core/logger';
import { AttemptLimiter } from '../core/attemptLimiter';
import { hashPassword, needsRehash, validatePasswordStrength, verifyPassword } from '../core/password';
import {
  countUsers,
  createAccount,
  createSession,
  deleteSession,
  deleteUserSessions,
  findSessionUser,
  findUserByEmail,
  findUserById,
  generateSessionToken,
  markLogin,
  normalizeEmail,
  touchSession,
  updatePasswordHash,
  type SessionUser,
} from '../db/repositories/auth';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Отметку активности обновляем не чаще раза в сутки: это не счётчик запросов. */
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Пять попыток в минуту на ключ. Ключи — почта и адрес по отдельности. */
const LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000;

/**
 * Отказ, а не очередь: попытка сверх лимита должна получить «нет».
 * Раньше здесь использовался token bucket из rateLimiter.ts — он рассчитан
 * на ожидание, поэтому проверка и списание шли двумя шагами (неатомарно),
 * а брошенный `acquire()` оставлял висеть промис. Плюс словарь лимитеров рос
 * без ограничения: ключ берётся из запроса, то есть память съедалась чужими
 * данными.
 */
const loginAttempts = new AttemptLimiter({ limit: LOGIN_ATTEMPTS, windowMs: LOGIN_WINDOW_MS });

/** Когда последний раз обновляли отметку активности сессии. */
const lastTouch = new Map<string, number>();
const LAST_TOUCH_MAX_KEYS = 10_000;

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  organizationName?: string;
  locale?: string;
}

export interface AuthResult {
  token: string;
  expiresAt: Date;
  user: SessionUser;
}

/**
 * Регистрация. Первый пользователь создаёт свою организацию и становится
 * владельцем. Приглашения в чужую организацию — отдельная задача; пока
 * регистрация всегда заводит новую.
 */
export async function register(
  input: RegisterInput,
  context: { userAgent?: string; ip?: string } = {},
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!email.includes('@') || email.length < 5) {
    throw new ValidationError('Некорректный адрес почты.');
  }

  const weak = validatePasswordStrength(input.password);
  if (weak) throw new ValidationError(weak);

  if (await findUserByEmail(email)) {
    // Здесь скрывать существование аккаунта уже бессмысленно: пользователь
    // и так узнает, что почта занята. Скрываем только при входе.
    throw new AppError('Пользователь с такой почтой уже есть.', { code: 'VALIDATION_ERROR' });
  }

  const passwordHash = await hashPassword(input.password);
  const { userId } = await createAccount({
    email,
    passwordHash,
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.locale === undefined ? {} : { locale: input.locale }),
    organizationName: input.organizationName?.trim() || `Организация ${email}`,
  });

  childLogger({ userId }).info('Зарегистрирован пользователь');
  return issueSession(userId, context);
}

export async function login(
  email: string,
  password: string,
  context: { userAgent?: string; ip?: string } = {},
): Promise<AuthResult> {
  const normalized = normalizeEmail(email);

  const allowedByEmail = loginAttempts.consume(`email:${normalized}`).allowed;
  const allowedByIp = context.ip === undefined ? true : loginAttempts.consume(`ip:${context.ip}`).allowed;
  if (!allowedByEmail || !allowedByIp) {
    throw new AppError('Слишком много попыток входа. Подожди минуту.', { code: 'RATE_LIMITED' });
  }

  const user = await findUserByEmail(normalized);

  // Хеш проверяем всегда, даже когда пользователя нет: одинаковое время ответа
  // не даёт отличить «нет такого» от «пароль не тот».
  const storedHash = user?.passwordHash ?? DUMMY_HASH;
  const ok = await verifyPassword(password, storedHash);

  if (!user || !user.passwordHash || !ok) {
    throw new AppError('Неверная почта или пароль.', { code: 'AUTH_ERROR' });
  }

  // Параметры хеширования могли усилить с прошлого входа — тихо обновляем.
  if (needsRehash(user.passwordHash)) {
    await updatePasswordHash(user.id, await hashPassword(password));
  }

  // Успешный вход снимает счётчик: иначе один забытый пароль запирает
  // человека на минуту уже после того, как он вспомнил правильный.
  loginAttempts.reset(`email:${normalized}`);
  if (context.ip !== undefined) loginAttempts.reset(`ip:${context.ip}`);

  await markLogin(user.id);
  return issueSession(user.id, context);
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}

/** Смена пароля разлогинивает везде: иначе украденная сессия переживёт смену. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const weak = validatePasswordStrength(newPassword);
  if (weak) throw new ValidationError(weak);

  const rows = await findUserById(userId);
  if (!rows?.passwordHash || !(await verifyPassword(currentPassword, rows.passwordHash))) {
    throw new AppError('Текущий пароль неверен.', { code: 'AUTH_ERROR' });
  }

  await updatePasswordHash(userId, await hashPassword(newPassword));
  const revoked = await deleteUserSessions(userId);
  childLogger({ userId }).info({ revoked }, 'Пароль изменён, сессии отозваны');
}

/** Пользователь по токену. Заодно раз в сутки обновляет отметку активности. */
export async function resolveSession(token: string): Promise<SessionUser | undefined> {
  const user = await findSessionUser(token);
  if (!user) return undefined;

  const previous = lastTouch.get(user.sessionId) ?? 0;
  if (Date.now() - previous > TOUCH_INTERVAL_MS) {
    // Словарь ограничен: он всего лишь бережёт БД от лишней записи, и потеря
    // отметки безобидна — в худшем случае обновим last_seen_at раньше срока.
    if (lastTouch.size >= LAST_TOUCH_MAX_KEYS) lastTouch.clear();
    lastTouch.set(user.sessionId, Date.now());
    await touchSession(user.sessionId).catch(() => undefined);
  }

  return user;
}

/** Нет ни одного пользователя — значит установка новая и её надо настроить. */
export async function isFirstRun(): Promise<boolean> {
  return (await countUsers()) === 0;
}

async function issueSession(
  userId: string,
  context: { userAgent?: string; ip?: string },
): Promise<AuthResult> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await createSession({
    userId,
    token,
    expiresAt,
    ...(context.userAgent === undefined ? {} : { userAgent: context.userAgent }),
    ...(context.ip === undefined ? {} : { ip: context.ip }),
  });

  const user = await findSessionUser(token);
  if (!user) throw new AppError('Сессия создана, но не читается — проверь членство в организации');

  return { token, expiresAt, user };
}

/**
 * Заведомо неподходящий хеш с текущими параметрами. Нужен, чтобы проверка
 * пароля занимала одинаковое время и при отсутствующем пользователе.
 */
const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
