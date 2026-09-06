/**
 * Роуты входа.
 *
 * Токен сессии кладётся в httpOnly-куку: JavaScript до неё не дотянется,
 * поэтому XSS не превращается сразу в угон сессии. Для программного доступа
 * тот же токен возвращается в теле — им можно ходить с заголовком Bearer.
 */
import type { Express } from 'express';
import { z } from 'zod';
import { ValidationError } from '../core/errors';
import { isDatabaseConfigured } from '../db/client';
import { AppError } from '../core/errors';
import {
  changePassword,
  isFirstRun,
  login,
  logout,
  register,
} from '../services/auth';
import {
  clearSessionCookie,
  handle,
  rateLimitByIp,
  requireAuth,
  requireJson,
  sessionTokenOf,
  setSessionCookie,
  tenantOf,
} from './middleware';

const registerSchema = z.object({
  email: z.string().min(5).max(200),
  password: z.string().min(1).max(200),
  name: z.string().min(1).max(200).optional(),
  organizationName: z.string().min(1).max(200).optional(),
  locale: z.enum(['ru', 'en']).optional(),
});

const loginSchema = z.object({
  email: z.string().min(3).max(200),
  password: z.string().min(1).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
});

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new ValidationError(`Некорректный запрос. ${details}`);
}

function assertDatabase(): void {
  if (!isDatabaseConfigured()) {
    throw new AppError('Не задан DATABASE_URL — учётные записи хранить негде.', { code: 'CONFIG_ERROR' });
  }
}

export function registerAuthRoutes(app: Express): void {
  // Вход и регистрация — самые лакомые цели перебора, лимит жёстче общего.
  const authLimit = rateLimitByIp(20, 60_000);

  /** Нужна ли первичная настройка: ни одного пользователя ещё нет. */
  app.get(
    '/api/auth/state',
    handle(async (_req, res) => {
      assertDatabase();
      res.json({ firstRun: await isFirstRun() });
    }),
  );

  app.post(
    '/api/auth/register',
    authLimit,
    requireJson,
    handle(async (req, res) => {
      assertDatabase();
      const input = parse(registerSchema, req.body);

      const result = await register(input, {
        ...(req.headers['user-agent'] === undefined ? {} : { userAgent: req.headers['user-agent'] }),
        ...(req.ip === undefined ? {} : { ip: req.ip }),
      });

      setSessionCookie(res, result.token, result.expiresAt);
      res.status(201).json({ user: publicUser(result.user), token: result.token, expiresAt: result.expiresAt });
    }),
  );

  app.post(
    '/api/auth/login',
    authLimit,
    requireJson,
    handle(async (req, res) => {
      assertDatabase();
      const input = parse(loginSchema, req.body);

      const result = await login(input.email, input.password, {
        ...(req.headers['user-agent'] === undefined ? {} : { userAgent: req.headers['user-agent'] }),
        ...(req.ip === undefined ? {} : { ip: req.ip }),
      });

      setSessionCookie(res, result.token, result.expiresAt);
      res.json({ user: publicUser(result.user), token: result.token, expiresAt: result.expiresAt });
    }),
  );

  app.post(
    '/api/auth/logout',
    handle(async (req, res) => {
      const token = sessionTokenOf(req);
      if (token) await logout(token);
      clearSessionCookie(res);
      // 204 и без сессии: выход должен быть идемпотентным.
      res.status(204).end();
    }),
  );

  app.get(
    '/api/auth/me',
    requireAuth,
    handle(async (req, res) => {
      const { auth } = tenantOf(req);
      res.json({ user: publicUser(auth) });
    }),
  );

  app.post(
    '/api/auth/password',
    requireAuth,
    requireJson,
    handle(async (req, res) => {
      const { auth } = tenantOf(req);
      const input = parse(changePasswordSchema, req.body);

      await changePassword(auth.userId, input.currentPassword, input.newPassword);

      // Смена пароля отзывает все сессии, включая текущую.
      clearSessionCookie(res);
      res.status(204).end();
    }),
  );
}

/** Наружу отдаём только то, что нужно интерфейсу. Идентификатор сессии — нет. */
function publicUser(user: {
  userId: string;
  email: string;
  name: string | null;
  locale: string;
  organizationId: string;
  organizationName: string;
  role: string;
}) {
  return {
    id: user.userId,
    email: user.email,
    name: user.name,
    locale: user.locale,
    organization: { id: user.organizationId, name: user.organizationName },
    role: user.role,
  };
}
