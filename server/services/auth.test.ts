/**
 * Интеграционные тесты входа на живой БД.
 *
 * Проверяется то, ради чего аутентификация и делалась: чужую организацию
 * подставить нельзя, отозванная сессия не работает, перебор упирается в лимит.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { closeDatabase, getDb } from '../db/client';
import { organizations, sessions, users } from '../db/schema';
import { skipWithoutDb } from '../db/testing';
import { changePassword, login, logout, register, resolveSession } from './auth';
import { deleteExpiredSessions, findSessionUser, listSessions } from '../db/repositories/auth';

after(async () => {
  await closeDatabase();
});

const PASSWORD = 'достаточно-длинный-пароль';

/** Уникальная почта на каждый тест: база общая, тесты не должны сталкиваться. */
const uniqueEmail = () => `test-${randomUUID()}@example.test`;

/** Создаёт аккаунт и убирает его вместе с организацией после теста. */
async function withAccount<T>(
  body: (account: { email: string; userId: string; organizationId: string; token: string }) => Promise<T>,
  options: { password?: string } = {},
): Promise<T> {
  const email = uniqueEmail();
  const result = await register({ email, password: options.password ?? PASSWORD, name: 'Тест' });

  try {
    return await body({
      email,
      userId: result.user.userId,
      organizationId: result.user.organizationId,
      token: result.token,
    });
  } finally {
    // Каскад уносит сессии и членство; организацию удаляем отдельно.
    await getDb().delete(users).where(eq(users.id, result.user.userId));
    await getDb().delete(organizations).where(eq(organizations.id, result.user.organizationId));
  }
}

test('регистрация создаёт организацию и делает владельцем', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    const user = await resolveSession(account.token);

    assert.ok(user);
    assert.equal(user.email, account.email);
    assert.equal(user.role, 'owner');
    assert.equal(user.organizationId, account.organizationId);
    assert.ok(user.organizationName.length > 0);
  });
});

test('почта регистронезависима', skipWithoutDb, async () => {
  const email = uniqueEmail();
  const result = await register({ email: email.toUpperCase(), password: PASSWORD });

  try {
    const session = await login(email.toLowerCase(), PASSWORD);
    assert.equal(session.user.userId, result.user.userId);
  } finally {
    await getDb().delete(users).where(eq(users.id, result.user.userId));
    await getDb().delete(organizations).where(eq(organizations.id, result.user.organizationId));
  }
});

test('повторная регистрация на ту же почту отклоняется', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    await assert.rejects(() => register({ email: account.email, password: PASSWORD }), /уже есть/);
  });
});

test('короткий пароль не принимается', skipWithoutDb, async () => {
  await assert.rejects(() => register({ email: uniqueEmail(), password: 'короткий' }), /Пароль/);
});

test('неверный пароль и несуществующая почта отвечают одинаково', skipWithoutDb, async () => {
  // Разные ответы позволили бы перебором собрать список зарегистрированных почт.
  await withAccount(async (account) => {
    const wrongPassword = await login(account.email, 'совсем-другой-пароль').catch((error: Error) => error);
    const noSuchUser = await login(uniqueEmail(), PASSWORD).catch((error: Error) => error);

    assert.ok(wrongPassword instanceof Error);
    assert.ok(noSuchUser instanceof Error);
    assert.equal(wrongPassword.message, noSuchUser.message);
  });
});

test('выход убивает сессию', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    assert.ok(await resolveSession(account.token));

    await logout(account.token);

    assert.equal(await resolveSession(account.token), undefined);
  });
});

test('протухшая сессия не пускает', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    await getDb()
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(sessions.userId, account.userId));

    assert.equal(await resolveSession(account.token), undefined, 'срок сессии не проверяется');
  });
});

test('в базе лежит хеш токена, а не сам токен', skipWithoutDb, async () => {
  // Дамп базы не должен давать возможность войти под чужой сессией.
  await withAccount(async (account) => {
    const rows = await listSessions(account.userId);
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0]?.tokenHash, account.token);
    assert.equal(rows[0]?.tokenHash.length, 64, 'ожидался sha256 в hex');
  });
});

test('смена пароля отзывает все сессии', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    const second = await login(account.email, PASSWORD);
    assert.ok(await resolveSession(second.token));

    await changePassword(account.userId, PASSWORD, 'новый-достаточно-длинный-пароль');

    assert.equal(await resolveSession(account.token), undefined, 'старая сессия пережила смену пароля');
    assert.equal(await resolveSession(second.token), undefined);

    // Новый пароль работает, старый — нет.
    await assert.rejects(() => login(account.email, PASSWORD));
    const fresh = await login(account.email, 'новый-достаточно-длинный-пароль');
    assert.ok(fresh.token);
  });
});

test('смена пароля с неверным текущим отклоняется', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    await assert.rejects(
      () => changePassword(account.userId, 'не-тот-пароль-совсем', 'новый-достаточно-длинный'),
      /Текущий пароль/,
    );
    assert.ok(await resolveSession(account.token), 'неудачная смена не должна ронять сессию');
  });
});

test('чужой токен не открывает чужую организацию', skipWithoutDb, async () => {
  await withAccount(async (first) => {
    await withAccount(async (second) => {
      const firstUser = await resolveSession(first.token);
      const secondUser = await resolveSession(second.token);

      assert.ok(firstUser && secondUser);
      assert.notEqual(firstUser.organizationId, secondUser.organizationId);
      // Организация приходит из membership, подставить её в запросе нельзя.
      assert.equal(firstUser.organizationId, first.organizationId);
    });
  });
});

test('выдуманный токен не проходит', skipWithoutDb, async () => {
  assert.equal(await findSessionUser('этого-токена-не-существует'), undefined);
});

test('уборка протухших сессий не трогает живые', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    const stale = await login(account.email, PASSWORD);
    await getDb()
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(sessions.tokenHash, hashOf(stale.token)));

    await deleteExpiredSessions();

    assert.ok(await resolveSession(account.token), 'живая сессия удалена');
    assert.equal(await resolveSession(stale.token), undefined);
  });
});

test('перебор пароля упирается в лимит', skipWithoutDb, async () => {
  await withAccount(async (account) => {
    let limited = false;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const error = await login(account.email, `неверный-${attempt}`).catch((e: Error) => e);
      if (error instanceof Error && /Слишком много попыток/.test(error.message)) {
        limited = true;
        break;
      }
    }

    assert.equal(limited, true, 'без лимита подбор упирается только в скорость сети');
  });
});

/** То же преобразование, что и в репозитории: тесту нужен ключ строки. */
function hashOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
