/**
 * Роуты платформенного слоя: диагностика и приём апдейтов Telegram.
 *
 * Отделены от демо-эндпоинтов в server.ts намеренно. Демо возвращает
 * захардкоженные данные и со временем будет удалено; всё под /api/platform/*
 * говорит правду о состоянии системы и остаётся.
 */
import type { Express, Request, Response } from 'express';
import { env, subsystemStatuses } from '../config/env';
import { isEncryptionConfigured, safeCompare } from '../core/crypto';
import { toAppError } from '../core/errors';
import { logger } from '../core/logger';
import { rateLimiters } from '../core/rateLimiter';
import { connectorsSummary } from '../connectors/registry';
import { unverifiedEndpoints } from '../connectors/wildberries/endpoints';
import { isDatabaseConfigured, pingDatabase } from '../db/client';
import { getBot, isTelegramEnabled } from '../telegram/bot';
import { knownUsersCount } from '../telegram/state';

export function registerPlatformRoutes(app: Express): void {
  /**
   * Честный health-check: показывает, что реально настроено, а не «всё ACTIVE».
   * Именно по нему проверяем готовность к подключению маркетплейса.
   */
  app.get('/api/platform/health', async (_req: Request, res: Response) => {
    const database = isDatabaseConfigured() ? await pingDatabase() : { ok: false, message: 'DATABASE_URL не задан' };

    res.json({
      status: 'ok',
      mode: env.NODE_ENV,
      useMockData: env.USE_MOCK_DATA,
      allowMarketplaceWrites: env.ALLOW_MARKETPLACE_WRITES,
      time: new Date().toISOString(),
      subsystems: subsystemStatuses(),
      database,
      encryption: { configured: isEncryptionConfigured() },
      telegram: { enabled: isTelegramEnabled(), mode: env.TELEGRAM_MODE, knownUsers: knownUsersCount() },
      warnings: {
        unverifiedWbEndpoints: unverifiedEndpoints(),
      },
    });
  });

  /** Список площадок и что из них реально реализовано. */
  app.get('/api/platform/connectors', (_req: Request, res: Response) => {
    res.json({ connectors: connectorsSummary() });
  });

  /** Состояние лимитеров — видно, упёрлись ли мы в лимит площадки. */
  app.get('/api/platform/rate-limits', (_req: Request, res: Response) => {
    res.json({ limiters: rateLimiters.snapshot() });
  });

  /**
   * Приём апдейтов Telegram.
   * Секрет проверяется до разбора тела: эндпоинт публичный, и без проверки
   * любой желающий сможет слать боту фальшивые апдейты.
   */
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    const bot = getBot();
    if (!bot || env.TELEGRAM_MODE !== 'webhook') {
      res.status(503).json({ error: { code: 'CONFIG_ERROR', message: 'Webhook-режим не включён' } });
      return;
    }

    const expected = env.TELEGRAM_WEBHOOK_SECRET;
    const received = req.header('x-telegram-bot-api-secret-token');
    if (!expected || !received || !safeCompare(expected, received)) {
      logger.warn({ ip: req.ip }, 'Отклонён запрос на telegram webhook: неверный секрет');
      res.status(401).json({ error: { code: 'AUTH_ERROR', message: 'Неверный секрет вебхука' } });
      return;
    }

    try {
      await bot.handleUpdate(req.body);
      res.status(200).end();
    } catch (error) {
      const appError = toAppError(error);
      logger.error({ err: appError }, 'Ошибка обработки апдейта Telegram');
      // Telegram повторит апдейт при не-2xx; для необрабатываемых ошибок это бесполезно.
      res.status(200).end();
    }
  });
}
