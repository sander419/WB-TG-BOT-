/**
 * Аутентификация и права на уровне HTTP.
 *
 * Организация берётся ТОЛЬКО из сессии. Раньше роуты принимали organizationId
 * в теле запроса — это означало, что любой мог прочитать чужой магазин, просто
 * подставив чужой идентификатор. Поэтому роуты и были выключены в production.
 */
import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import { isProduction } from '../config/env';
import { AppError, toAppError } from '../core/errors';
import { logger } from '../core/logger';
import { safeCompare } from '../core/crypto';
import { resolveSession } from '../services/auth';
import type { MemberRole, SessionUser } from '../db/repositories/auth';

export const SESSION_COOKIE = 'commerceos_session';

declare module 'express-serve-static-core' {
  interface Request {
    /** Заполняется requireAuth. */
    auth?: SessionUser;
  }
}

/** Разбор Cookie без внешней зависимости: нам нужно ровно одно значение. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    // Lax, а не Strict: со Strict переход по ссылке из письма или из Telegram
    // приводит на страницу, где пользователь выглядит неавторизованным.
    sameSite: 'lax',
    // В разработке HTTPS нет, и с secure куки просто не сохранится.
    secure: isProduction,
    expires: expiresAt,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Простая защита от межсайтовых запросов.
 *
 * Кука SameSite=Lax уже отсекает POST с чужого сайта. Дополнительно требуем
 * JSON: форма с чужого домена не может отправить application/json без CORS,
 * а наш фронтенд всегда шлёт именно его.
 */
export const requireJson: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next();
    return;
  }

  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    res.status(415).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ожидается Content-Type: application/json',
        retryable: false,
      },
    });
    return;
  }
  next();
};

/**
 * Токен сессии из запроса: сначала кука, потом заголовок Bearer.
 * Одна точка получения — иначе легко забыть про второй источник, как это
 * и вышло с выходом из системы: сессия по Bearer оставалась живой.
 */
export function sessionTokenOf(req: Request): string | undefined {
  return readCookie(req, SESSION_COOKIE) ?? bearerToken(req);
}

/** Пускает дальше только с живой сессией. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = sessionTokenOf(req);
  if (!token) {
    unauthorized(res);
    return;
  }

  resolveSession(token)
    .then((user) => {
      if (!user) {
        // Кука есть, а сессии нет: протухла или отозвана. Убираем, чтобы
        // браузер не слал её снова.
        clearSessionCookie(res);
        unauthorized(res);
        return;
      }
      req.auth = user;
      next();
    })
    .catch((error: unknown) => {
      logger.error({ err: toAppError(error) }, 'Не удалось проверить сессию');
      res.status(503).json({
        error: { code: 'INTERNAL_ERROR', message: 'Проверка сессии недоступна', retryable: true },
      });
    });
};

const ROLE_ORDER: Record<MemberRole, number> = { viewer: 0, operator: 1, admin: 2, owner: 3 };

/** Требует роль не ниже указанной. Порядок: viewer < operator < admin < owner. */
export function requireRole(minimum: MemberRole): RequestHandler {
  return (req, res, next) => {
    const auth = req.auth;
    if (!auth) {
      unauthorized(res);
      return;
    }
    if (ROLE_ORDER[auth.role] < ROLE_ORDER[minimum]) {
      res.status(403).json({
        error: {
          code: 'PERMISSION_DENIED',
          message: `Нужна роль не ниже «${minimum}», у вас «${auth.role}».`,
          retryable: false,
        },
      });
      return;
    }
    next();
  };
}

/** Достаёт контекст арендатора. Вызывать только после requireAuth. */
export function tenantOf(req: Request): { organizationId: string; auth: SessionUser } {
  const auth = req.auth;
  if (!auth) throw new AppError('Нет сессии', { code: 'AUTH_ERROR' });
  return { organizationId: auth.organizationId, auth };
}

/**
 * Ограничение частоты по адресу. Защищает вход и регистрацию от перебора;
 * состояние в памяти процесса, как и остальные лимитеры.
 */
export function rateLimitByIp(limit: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Слишком много запросов. Подожди немного.', retryable: true },
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

/** Общая обёртка для асинхронных обработчиков: любая ошибка приводится к формату. */
export function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch((error: unknown) => {
      const appError = toAppError(error);

      // Отказ по правилам — не сбой. Стек в лог не тащим: иначе ожидаемое
      // «неверный пароль» выглядит как авария и топит настоящие ошибки.
      if (appError.httpStatus < 500) {
        logger.warn({ code: appError.code, path: req.path, message: appError.message }, 'Запрос отклонён');
      } else {
        logger.error({ err: appError, path: req.path }, 'Ошибка обработчика');
      }

      if (res.headersSent) {
        next(error);
        return;
      }
      res.status(appError.httpStatus).json(appError.toPublicJson());
    });
  };
}

/** Проверка секрета вебхука — вынесено сюда, чтобы не дублировать. */
export function matchesSecret(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  return safeCompare(expected, received);
}

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.toLowerCase().startsWith('bearer ')) return undefined;
  return header.slice(7).trim() || undefined;
}

function unauthorized(res: Response): void {
  res.status(401).json({
    error: { code: 'AUTH_ERROR', message: 'Нужна авторизация.', retryable: false },
  });
}

/** Экспортируется для регистрации в приложении. */
export type { Express };
