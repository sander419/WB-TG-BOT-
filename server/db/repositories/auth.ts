/**
 * Пользователи, сессии и членство в организациях.
 *
 * Токен сессии наружу отдаётся один раз при создании; в базе лежит его SHA-256.
 * Так дамп базы не позволяет войти под чужой сессией — ровно та же логика,
 * что и с токенами площадок.
 */
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { memberships, organizations, sessions, users } from '../schema';

export type MemberRole = 'owner' | 'admin' | 'operator' | 'viewer';

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  locale: string;
}

export interface SessionUser {
  userId: string;
  email: string;
  name: string | null;
  locale: string;
  organizationId: string;
  organizationName: string;
  role: MemberRole;
  sessionId: string;
}

/** Почта регистронезависима: приводим к нижнему регистру на входе и в поиске. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return rows[0];
}

export async function findUserById(userId: string): Promise<UserRow | undefined> {
  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0];
}

export async function countUsers(): Promise<number> {
  const rows = await getDb().select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users);
  return rows[0]?.n ?? 0;
}

export interface CreateAccountInput {
  email: string;
  passwordHash: string;
  name?: string;
  locale?: string;
  organizationName: string;
  role?: MemberRole;
}

/**
 * Создаёт пользователя, его организацию и членство одной транзакцией.
 * Пользователь без организации бесполезен, а организация без владельца —
 * висячая запись; половина этой операции не имеет смысла.
 */
export async function createAccount(
  input: CreateAccountInput,
): Promise<{ userId: string; organizationId: string }> {
  return getDb().transaction(async (tx) => {
    const userRows = await tx
      .insert(users)
      .values({
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.locale === undefined ? {} : { locale: input.locale }),
      })
      .returning({ id: users.id });

    const userId = userRows[0]?.id;
    if (!userId) throw new Error('Пользователь не создался');

    const orgRows = await tx
      .insert(organizations)
      .values({ name: input.organizationName, ...(input.locale === undefined ? {} : { locale: input.locale }) })
      .returning({ id: organizations.id });

    const organizationId = orgRows[0]?.id;
    if (!organizationId) throw new Error('Организация не создалась');

    await tx.insert(memberships).values({
      organizationId,
      userId,
      role: input.role ?? 'owner',
    });

    return { userId, organizationId };
  });
}

export async function markLogin(userId: string): Promise<void> {
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await getDb().update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function createSession(input: {
  userId: string;
  token: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}): Promise<string> {
  const rows = await getDb()
    .insert(sessions)
    .values({
      userId: input.userId,
      tokenHash: hashToken(input.token),
      expiresAt: input.expiresAt,
      ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent.slice(0, 500) }),
      ...(input.ip === undefined ? {} : { ip: input.ip }),
    })
    .returning({ id: sessions.id });

  const id = rows[0]?.id;
  if (!id) throw new Error('Сессия не создалась');
  return id;
}

/**
 * Пользователь по токену сессии вместе с организацией и ролью.
 *
 * Организация берётся из membership, а не из запроса: именно это делает
 * подделку чужого organizationId невозможной.
 */
export async function findSessionUser(token: string): Promise<SessionUser | undefined> {
  const rows = await getDb()
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      locale: users.locale,
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      role: memberships.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    // Пока организация у пользователя одна; при нескольких понадобится выбор
    // активной, а пока берём самую раннюю, чтобы поведение было предсказуемым.
    .orderBy(memberships.createdAt)
    .limit(1);

  return rows[0];
}

/** Отметка активности. Вызывается не чаще раза в сутки — не ради каждой страницы. */
export async function touchSession(sessionId: string): Promise<void> {
  await getDb().update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function deleteSession(token: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Все сессии пользователя — при смене пароля выходим везде. */
export async function deleteUserSessions(userId: string): Promise<number> {
  const rows = await getDb().delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id });
  return rows.length;
}

/** Уборка протухших сессий. Их никто не прочитает, но таблица растёт. */
export async function deleteExpiredSessions(): Promise<number> {
  const rows = await getDb()
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return rows.length;
}

export async function listSessions(userId: string) {
  return getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastSeenAt));
}
