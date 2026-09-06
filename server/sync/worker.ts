/**
 * Воркер синхронизации: берёт задачи из очереди и выполняет их по одной.
 *
 * Почему фоном, а не в HTTP-запросе: группа статистики WB отдаёт порядка одного
 * запроса в минуту, полный обход каталога занимает минуты. Пользователь не должен
 * ждать этого в браузере, а таймаут прокси не должен ронять синхронизацию.
 *
 * Последовательно, по одной задаче: параллелизм здесь не ускорит — упрёмся
 * в лимиты площадки, зато усложнит отладку.
 *
 * Запускается в том же процессе, что и веб. Когда инстансов станет больше одного,
 * воркер выносится в отдельный процесс: очередь на SKIP LOCKED это уже позволяет.
 */
import { env } from '../config/env';
import { logger } from '../core/logger';
import { toAppError } from '../core/errors';
import { isDatabaseConfigured } from '../db/client';
import { getStoreById, listActiveStores, setStoreStatus } from '../db/repositories/stores';
import {
  claimNextJob,
  completeJob,
  failJob,
  hasAnyPendingJob,
  hasPendingJob,
  requeueStaleJobs,
  SYNC_MODULES,
  enqueueSync,
} from '../db/repositories/syncJobs';
import { runAlertsForStore } from '../services/alerts';
import { runSync } from './runners';

const IDLE_DELAY_MS = 5_000;
const ERROR_DELAY_MS = 30_000;
const STALE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let running = false;
let stopRequested = false;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isWorkerRunning(): boolean {
  return running;
}

/** Обрабатывает одну задачу. Возвращает false, если очередь пуста. */
export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const log = logger.child({ jobId: job.id, storeId: job.storeId, module: job.module });

  try {
    const store = await getStoreById(job.storeId);
    if (!store) {
      await failJob(job.id, `Магазин ${job.storeId} не найден`);
      return true;
    }

    const result = await runSync(store.organizationId, job.storeId, job.module);
    await completeJob(job.id, result.itemsProcessed);

    // Успешная синхронизация снимает статус ошибки, выставленный прошлым падением.
    if (store.status === 'error') await setStoreStatus(store.id, 'active');

    // Алерты считаются один раз за цикл, когда по магазину не осталось задач.
    // Раньше они запускались после каждого модуля: четыре прогона на цикл,
    // и первые три — на полусинхронизированных данных. Остатки уже свежие,
    // а заказы ещё вчерашние — и запас дней выходил неверным.
    if (!(await hasAnyPendingJob(store.id))) {
      try {
        await runAlertsForStore(store.organizationId, store.id);
      } catch (error) {
        log.error({ err: toAppError(error) }, 'Не удалось разослать алерты');
      }
    }

    return true;
  } catch (error) {
    const appError = toAppError(error);
    log.error({ err: appError, code: appError.code }, 'Задача синхронизации упала');
    await failJob(job.id, appError.message);

    // Проблема с токеном — магазин надо чинить руками, дальше молотить бессмысленно.
    if (appError.code === 'AUTH_ERROR' || appError.code === 'CONFIG_ERROR') {
      await setStoreStatus(job.storeId, 'error').catch(() => undefined);
    }
    return true;
  }
}

/**
 * Планировщик: сам ставит синхронизацию активным магазинам.
 *
 * Проверка `hasPendingJob` обязательна — без неё при медленной площадке
 * очередь растёт быстрее, чем разбирается, и воркер молотит устаревшие задачи.
 * Магазины в статусе error пропускаются: у них сломан токен, чинить руками.
 */
export async function scheduleDueSyncs(): Promise<number> {
  if (env.SYNC_INTERVAL_MINUTES === 0) return 0;

  const stores = await listActiveStores();
  const intervalMs = env.SYNC_INTERVAL_MINUTES * 60_000;
  const now = Date.now();
  let queued = 0;

  for (const store of stores) {
    const lastSync = store.lastSyncAt?.getTime() ?? 0;
    if (now - lastSync < intervalMs) continue;

    const pending = await Promise.all(SYNC_MODULES.map((module) => hasPendingJob(store.id, module)));
    if (pending.some(Boolean)) continue;

    const jobs = await enqueueSync(store.id);
    queued += jobs.length;
    logger.info({ storeId: store.id, jobs: jobs.length }, 'Плановая синхронизация поставлена в очередь');
  }

  return queued;
}

export async function startSyncWorker(): Promise<void> {
  if (running) return;
  if (!isDatabaseConfigured()) {
    logger.info('Воркер синхронизации не запущен: нет DATABASE_URL');
    return;
  }

  running = true;
  stopRequested = false;
  logger.info('Воркер синхронизации запущен');

  let lastStaleCheck = 0;

  while (!stopRequested) {
    try {
      if (Date.now() - lastStaleCheck > STALE_CHECK_INTERVAL_MS) {
        lastStaleCheck = Date.now();
        const requeued = await requeueStaleJobs();
        if (requeued > 0) logger.warn({ requeued }, 'Зависшие задачи возвращены в очередь');
        await scheduleDueSyncs();
      }

      const worked = await processNextJob();
      if (!worked) await sleep(IDLE_DELAY_MS);
    } catch (error) {
      // Сюда попадают только сбои самой очереди (например, упала БД).
      logger.error({ err: toAppError(error) }, 'Сбой цикла воркера, пауза перед повтором');
      await sleep(ERROR_DELAY_MS);
    }
  }

  running = false;
  logger.info('Воркер синхронизации остановлен');
}

export function stopSyncWorker(): void {
  stopRequested = true;
}
