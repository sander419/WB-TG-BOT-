/**
 * Роуты управления магазинами.
 *
 * Организация берётся из сессии, а не из тела запроса. Раньше было наоборот,
 * и поэтому роуты приходилось выключать при NODE_ENV=production: подставив
 * чужой organizationId, можно было прочитать чужой магазин. Теперь подделать
 * нечего — идентификатор приходит из membership по токену сессии.
 *
 * Права: смотреть может любой участник, менять — admin и выше, подключать
 * магазин с токеном площадки — тоже admin: этот токен даёт полный доступ
 * к чужому магазину.
 */
import type { Express } from 'express';
import { z } from 'zod';
import { AppError, ValidationError } from '../core/errors';
import { isDatabaseConfigured } from '../db/client';
import { SYNC_MODULES, type SyncModule } from '../db/repositories/syncJobs';
import { createLinkCode } from '../db/repositories/telegram';
import { getStore } from '../db/repositories/stores';
import { connectStore, requestSync, storesOverview, testStoreConnection } from '../services/stores';
import { handle, requireAuth, requireJson, requireRole, tenantOf } from './middleware';

const marketplaceSchema = z.enum(['wildberries', 'ozon', 'shopify', '1688', 'taobao', 'jd']);

const connectStoreSchema = z.object({
  marketplace: marketplaceSchema,
  name: z.string().min(1).max(200),
  apiKey: z.string().min(10),
  extra: z.record(z.string(), z.string()).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

const syncSchema = z.object({
  modules: z.array(z.enum(['products', 'stocks', 'orders', 'reviews'])).optional(),
});

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new ValidationError(`Некорректный запрос. ${details}`);
}

function assertDatabase(): void {
  if (!isDatabaseConfigured()) {
    throw new AppError('Не задан DATABASE_URL — хранить магазины негде.', { code: 'CONFIG_ERROR' });
  }
}

export function registerStoreRoutes(app: Express): void {
  /**
   * Подключить магазин: сохранить токен, проверить его, поставить первичную
   * синхронизацию. Требует admin: сохраняемый токен даёт полный доступ
   * к магазину на площадке.
   */
  app.post(
    '/api/platform/stores',
    requireAuth,
    requireRole('admin'),
    requireJson,
    handle(async (req, res) => {
      assertDatabase();
      const { organizationId } = tenantOf(req);
      const input = parse(connectStoreSchema, req.body);

      const result = await connectStore({ ...input, organizationId });

      res.status(result.check.ok ? 201 : 400).json({
        store: result.store,
        check: result.check,
        queuedJobs: result.queuedJobs.length,
      });
    }),
  );

  app.get(
    '/api/platform/stores',
    requireAuth,
    handle(async (req, res) => {
      assertDatabase();
      const { organizationId } = tenantOf(req);
      res.json({ stores: await storesOverview(organizationId) });
    }),
  );

  /** Перепроверить токен, ничего не меняя на площадке. */
  app.post(
    '/api/platform/stores/:id/test',
    requireAuth,
    requireRole('operator'),
    handle(async (req, res) => {
      assertDatabase();
      const { organizationId } = tenantOf(req);
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
    requireAuth,
    requireRole('operator'),
    handle(async (req, res) => {
      assertDatabase();
      const { organizationId, auth } = tenantOf(req);
      const storeId = req.params.id as string;

      // Проверяем принадлежность магазина: без этого код привязки можно было
      // выписать на чужой магазин, подставив его идентификатор в путь.
      const store = await getStore(organizationId, storeId);
      if (!store) throw new AppError('Магазин не найден', { code: 'NOT_FOUND' });

      const { code, expiresAt } = await createLinkCode({
        organizationId,
        storeId,
        createdByUserId: auth.userId,
      });
      res.status(201).json({ code, expiresAt, command: `/link ${code}` });
    }),
  );

  /** Поставить синхронизацию в очередь. Выполнит воркер, не этот запрос. */
  app.post(
    '/api/platform/stores/:id/sync',
    requireAuth,
    requireRole('operator'),
    requireJson,
    handle(async (req, res) => {
      assertDatabase();
      const { organizationId } = tenantOf(req);
      const body = parse(syncSchema, req.body);
      const storeId = req.params.id as string;
      const modules: SyncModule[] = body.modules ?? SYNC_MODULES;
      const jobs = await requestSync(organizationId, storeId, modules);

      res.status(202).json({ queued: jobs.length, modules });
    }),
  );
}
