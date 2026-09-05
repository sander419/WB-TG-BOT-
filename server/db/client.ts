/**
 * Подключение к PostgreSQL.
 *
 * Ленивое: пул создаётся при первом обращении. Приложение должно подниматься
 * и без БД (демо-режим, USE_MOCK_DATA=true) — тогда /api/platform/health честно
 * скажет, что хранилище не настроено, вместо падения процесса на старте.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { env } from '../config/env';
import { ConfigError } from '../core/errors';
import { logger } from '../core/logger';
import { schema } from './schema';

let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (db) return db;

  if (!env.DATABASE_URL) {
    throw new ConfigError(
      'DATABASE_URL не задан. Подними Postgres (docker compose up -d db) и пропиши строку подключения в .env.',
    );
  }

  pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_MAX_POOL,
    ...(env.DATABASE_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  pool.on('error', (error: Error) => {
    logger.error({ err: error }, 'Ошибка пула PostgreSQL');
  });

  db = drizzle(pool, { schema });
  logger.info('Пул PostgreSQL создан');
  return db;
}

/** Проверка живости для health-check. Не бросает — возвращает результат. */
export async function pingDatabase(): Promise<{ ok: boolean; message?: string }> {
  if (!isDatabaseConfigured()) return { ok: false, message: 'DATABASE_URL не задан' };
  try {
    await getDb().execute(sql`select 1`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
  db = null;
  logger.info('Пул PostgreSQL закрыт');
}

export { schema };
