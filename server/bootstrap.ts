/**
 * Точка подключения платформенного слоя к существующему express-приложению.
 *
 * Специально сделана двумя функциями и подключается в server.ts двумя строками:
 * демо-код и новый каркас пока живут рядом, и каркас можно снять одним движением,
 * если что-то пойдёт не так.
 */
import type { Express } from 'express';
import { env, isProduction, subsystemStatuses } from './config/env';
import { logger } from './core/logger';
import { connectorsSummary } from './connectors/registry';
import { unverifiedEndpoints } from './connectors/wildberries/endpoints';
import { closeDatabase } from './db/client';
import { registerAuthRoutes } from './http/auth';
import { rateLimitByIp, requireAuth } from './http/middleware';
import { registerPlatformRoutes } from './http/platform';
import { registerStoreRoutes } from './http/stores';
import { startSyncWorker, stopSyncWorker } from './sync/worker';
import { startTelegramBot, stopTelegramBot } from './telegram/bot';

/**
 * Защита демо-эндпоинтов, которые тратят деньги.
 *
 * `/api/chat`, `/api/generate-*` ходят в Gemini на каждый запрос. Открытые
 * наружу, они превращаются в чужой счёт за наш ключ. В production требуем
 * сессию; в разработке демо продолжает работать без входа, но частота
 * ограничена в обоих режимах.
 *
 * Убирается вместе с самими демо-эндпоинтами на этапе 3 дорожной карты.
 */
export function protectPaidDemoRoutes(app: Express): void {
  const paid = ['/api/chat', '/api/generate-seo', '/api/generate-launch-plan', '/api/generate-review-reply'];
  const limit = rateLimitByIp(30, 60_000);

  for (const path of paid) {
    app.post(path, limit);
    if (isProduction) app.post(path, requireAuth);
  }
}

export function registerPlatform(app: Express): void {
  // За nginx req.ip иначе равен адресу прокси, и ограничение частоты
  // считается на один ключ для всех — то есть не работает.
  if (isProduction) app.set('trust proxy', 1);

  registerPlatformRoutes(app);
  registerAuthRoutes(app);
  registerStoreRoutes(app);
}

/** Стартовый отчёт: что настроено, что нет. Читается в логе за пять секунд. */
function logReadiness(): void {
  for (const subsystem of subsystemStatuses()) {
    if (subsystem.configured) {
      logger.info({ subsystem: subsystem.name }, 'Подсистема настроена');
    } else {
      logger.warn({ subsystem: subsystem.name, missing: subsystem.missing }, 'Подсистема не настроена');
    }
  }

  const implemented = connectorsSummary().filter((connector) => connector.implemented);
  logger.info(
    { implemented: implemented.map((connector) => connector.id) },
    'Коннекторы маркетплейсов зарегистрированы',
  );

  const unverified = unverifiedEndpoints();
  if (unverified.length > 0) {
    logger.warn(
      { count: unverified.length },
      'Пути WB API не сверены с документацией — см. docs/INTEGRATION-WILDBERRIES.md',
    );
  }

  if (env.USE_MOCK_DATA) {
    logger.warn('USE_MOCK_DATA=true: интерфейс показывает демо-данные, а не данные магазина');
  }
  if (env.ALLOW_MARKETPLACE_WRITES) {
    logger.warn('ALLOW_MARKETPLACE_WRITES=true: коннекторам разрешена запись в маркетплейс');
  }
}

export async function startPlatform(): Promise<void> {
  logReadiness();
  try {
    await startTelegramBot();
  } catch (error) {
    // Бот не должен мешать подняться веб-приложению.
    logger.error({ err: error }, 'Не удалось запустить Telegram-бота');
  }

  // Не await: воркер крутит собственный цикл до остановки процесса.
  void startSyncWorker().catch((error: unknown) => {
    logger.error({ err: error }, 'Воркер синхронизации не запустился');
  });

  installShutdownHandlers();
}

let shutdownInstalled = false;

function installShutdownHandlers(): void {
  if (shutdownInstalled) return;
  shutdownInstalled = true;

  const shutdown = (signal: string) => {
    void (async () => {
      logger.info({ signal }, 'Останавливаю сервис');
      stopSyncWorker();
      await stopTelegramBot().catch(() => undefined);
      await closeDatabase().catch(() => undefined);
      process.exit(0);
    })();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}
