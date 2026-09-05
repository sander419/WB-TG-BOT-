/**
 * Точка подключения платформенного слоя к существующему express-приложению.
 *
 * Специально сделана двумя функциями и подключается в server.ts двумя строками:
 * демо-код и новый каркас пока живут рядом, и каркас можно снять одним движением,
 * если что-то пойдёт не так.
 */
import type { Express } from 'express';
import { env, subsystemStatuses } from './config/env';
import { logger } from './core/logger';
import { connectorsSummary } from './connectors/registry';
import { unverifiedEndpoints } from './connectors/wildberries/endpoints';
import { closeDatabase } from './db/client';
import { registerPlatformRoutes } from './http/platform';
import { startTelegramBot, stopTelegramBot } from './telegram/bot';

export function registerPlatform(app: Express): void {
  registerPlatformRoutes(app);
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
  installShutdownHandlers();
}

let shutdownInstalled = false;

function installShutdownHandlers(): void {
  if (shutdownInstalled) return;
  shutdownInstalled = true;

  const shutdown = (signal: string) => {
    void (async () => {
      logger.info({ signal }, 'Останавливаю сервис');
      await stopTelegramBot().catch(() => undefined);
      await closeDatabase().catch(() => undefined);
      process.exit(0);
    })();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}
