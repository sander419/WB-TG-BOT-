/**
 * Очередь задач синхронизации.
 *
 * Брокера сообщений нет и не нужно: Postgres умеет очередь через
 * `SELECT ... FOR UPDATE SKIP LOCKED`. Два воркера, взявшие задачи одновременно,
 * не подерутся за одну строку — второй просто пропустит заблокированную.
 * Отдельный Redis/RabbitMQ добавит инфраструктуру, но не даст ничего сверх этого
 * на нашем объёме.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { syncJobs } from '../schema';

export type SyncModule = 'products' | 'stocks' | 'orders' | 'reviews';

export const SYNC_MODULES: SyncModule[] = ['products', 'stocks', 'orders', 'reviews'];

export interface ClaimedJob {
  id: string;
  storeId: string;
  module: SyncModule;
}

export async function enqueueSync(storeId: string, modules: SyncModule[] = SYNC_MODULES): Promise<string[]> {
  if (modules.length === 0) return [];
  const rows = await getDb()
    .insert(syncJobs)
    .values(modules.map((module) => ({ storeId, module, status: 'queued' as const })))
    .returning({ id: syncJobs.id });
  return rows.map((row) => row.id);
}

/**
 * Забирает одну задачу и сразу помечает её выполняющейся.
 * Атомарно: между выбором и обновлением никто не успеет вклиниться.
 */
export async function claimNextJob(): Promise<ClaimedJob | undefined> {
  const result = await getDb().execute<{ id: string; store_id: string; module: string }>(sql`
    update sync_jobs
       set status = 'running', started_at = now()
     where id = (
       select id from sync_jobs
        where status = 'queued'
        order by created_at
        limit 1
        for update skip locked
     )
    returning id, store_id, module
  `);

  const row = result.rows[0];
  if (!row) return undefined;
  return { id: row.id, storeId: row.store_id, module: row.module as SyncModule };
}

export async function completeJob(jobId: string, itemsProcessed: number): Promise<void> {
  await getDb()
    .update(syncJobs)
    .set({ status: 'success', itemsProcessed, finishedAt: new Date(), error: null })
    .where(eq(syncJobs.id, jobId));
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await getDb()
    .update(syncJobs)
    // Текст ошибки обрезаем: в ответах площадок бывают простыни HTML.
    .set({ status: 'failed', finishedAt: new Date(), error: error.slice(0, 1000) })
    .where(eq(syncJobs.id, jobId));
}

/**
 * Возвращает зависшие задачи в очередь.
 * Воркер мог упасть между «взял» и «завершил» — без этого задача останется
 * в running навсегда и модуль перестанет обновляться молча.
 */
export async function requeueStaleJobs(olderThanMinutes = 30): Promise<number> {
  const result = await getDb().execute(sql`
    update sync_jobs
       set status = 'queued', started_at = null
     where status = 'running'
       and started_at < now() - make_interval(mins => ${olderThanMinutes})
  `);
  return result.rowCount ?? 0;
}

/** Последнее состояние каждого модуля по магазину — для health и интерфейса. */
export async function latestJobs(storeId: string, limit = 20) {
  return getDb()
    .select()
    .from(syncJobs)
    .where(eq(syncJobs.storeId, storeId))
    .orderBy(desc(syncJobs.createdAt))
    .limit(limit);
}

/**
 * Остались ли по магазину незавершённые задачи любого модуля.
 * Нужно, чтобы считать алерты один раз за цикл, а не после каждого модуля
 * на наполовину обновлённых данных.
 */
export async function hasAnyPendingJob(storeId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: syncJobs.id })
    .from(syncJobs)
    .where(
      and(
        eq(syncJobs.storeId, storeId),
        inArray(syncJobs.status, ['queued', 'running']),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function hasPendingJob(storeId: string, module: SyncModule): Promise<boolean> {
  const rows = await getDb()
    .select({ id: syncJobs.id })
    .from(syncJobs)
    .where(and(eq(syncJobs.storeId, storeId), eq(syncJobs.module, module), eq(syncJobs.status, 'queued')))
    .limit(1);
  return rows.length > 0;
}
