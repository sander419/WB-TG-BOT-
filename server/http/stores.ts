/**
 * Роуты управления магазинами.
 *
 * ⚠️ Аутентификации в проекте пока нет (docs/ROADMAP.md, этап 7). Эти эндпоинты
 * принимают organizationId из запроса и позволяют сохранить токен маркетплейса —
 * выставлять их в интернет нельзя. Поэтому в production они выключены целиком,
 * пока не появится вход по учётной записи: лучше сломанная кнопка, чем открытый
 * доступ к чужим магазинам.
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { isProduction } from '../config/env';
import { AppError, toAppError, ValidationError } from '../core/errors';
import { logger } from '../core/logger';
import { isDatabaseConfigured } from '../db/client';
import { SYNC_MODULES, type SyncModule } from '../db/repositories/syncJobs';
import { createLinkCode } from '../db/repositories/telegram';
import { connectStore, requestSync, storesOverview, testStoreConnection } from '../services/stores';

const marketplaceSchema = z.enum(['wildberries', 'ozon', 'shopify', '1688', 'taobao', 'jd']);

const connectStoreSchema = z.object({
  organizationId: z.guid(),
  marketplace: marketplaceSchema,
  name: z.string().min(1).max(200),
  apiKey: z.string().min(10),
  extra: z.record(z.string(), z.string()).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

const syncSchema = z.object({
  organizationId: z.guid(),
  modules: z.array(z.enum(['products', 'stocks', 'orders', 'reviews'])).optional(),
});

const organizationQuerySchema = z.object({ organizationId: z.guid() });

/** Общая обёртка: приводит любую ошибку к нашему формату и не отдаёт stack наружу. */
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch((error: unknown) => {
      const appError = toAppError(error);

      // Отказ по правилам — не сбой. Стек в лог не тащим: иначе ожидаемое
      // «в проде выключено» выглядит как авария и топит настоящие ошибки.
      if (appError.httpStatus < 500) {
        logger.warn(
          { code: appError.code, path: req.path, message: appError.message },
          'Запрос отклонён',
        );
      } else {
        logger.error({ err: appError, path: req.path }, 'Ошибка в роуте магазинов');
      }

      if (res.headersSent) {
        next(error);
        return;
      }
      res.status(appError.httpStatus).json(appError.toPublicJson());
    });
  };
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new ValidationError(`Некорректный запрос. ${details}`);
}

function assertUsable(): void {
  if (isProduction) {
    throw new AppError(
      'Управление магазинами выключено в production: не реализована аутентификация (docs/ROADMAP.md, этап 7).',
      { code: 'PERMISSION_DENIED' },
    );
  }
  if (!isDatabaseConfigured()) {
    throw new AppError('Не задан DATABASE_URL — хранить магазины негде.', { code: 'CONFIG_ERROR' });
  }
}

export function registerStoreRoutes(app: Express): void {
  /** Подключить магазин: сохранить токен, проверить его, поставить первичную синхронизацию. */
  app.post(
    '/api/platform/stores',
    handle(async (req, res) => {
      const input = parse(connectStoreSchema, req.body);
      assertUsable();
      const result = await connectStore(input);

      res.status(result.check.ok ? 201 : 400).json({
        store: result.store,
        check: result.check,
        queuedJobs: result.queuedJobs.length,
      });
    }),
  );

  app.get(
    '/api/platform/stores',
    handle(async (req, res) => {
      const { organizationId } = parse(organizationQuerySchema, req.query);
      assertUsable();
      res.json({ stores: await storesOverview(organizationId) });
    }),
  );

  /** Перепроверить токен, ничего не меняя на площадке. */
  app.post(
    '/api/platform/stores/:id/test',
    handle(async (req, res) => {
      const { organizationId } = parse(organizationQuerySchema, req.body);
      assertUsable();
      const storeId = req.params.id as string;
      res.json({ check: await testStoreConnection(organizationId, storeId) });
    }),
  );

  /**
   * Код привязки Telegram. Одноразовый, живёт 15 минут.
   * Продавец отправляет боту `/link КОД` — так бот узнаёт, чей это магазин,
   * не спрашивая ни телефон, ни пароль.
   */
  app.post(
    '/api/platform/stores/:id/telegram-code',
    handle(async (req, res) => {
      const { organizationId } = parse(organizationQuerySchema, req.body);
      assertUsable();
      const storeId = req.params.id as string;

      const { code, expiresAt } = await createLinkCode({ organizationId, storeId });
      res.status(201).json({ code, expiresAt, command: `/link ${code}` });
    }),
  );

  /** Поставить синхронизацию в очередь. Выполнит воркер, не этот запрос. */
  app.post(
    '/api/platform/stores/:id/sync',
    handle(async (req, res) => {
      const body = parse(syncSchema, req.body);
      assertUsable();
      const storeId = req.params.id as string;
      const modules: SyncModule[] = body.modules ?? SYNC_MODULES;
      const jobs = await requestSync(body.organizationId, storeId, modules);

      res.status(202).json({ queued: jobs.length, modules });
    }),
  );
}
