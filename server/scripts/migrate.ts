/**
 * Применение миграций в продакшене: node dist/migrate.cjs
 *
 * Отдельно от `npm run db:migrate`, который зовёт drizzle-kit. drizzle-kit —
 * dev-зависимость, в рантайм-образе её нет и быть не должно: инструменты
 * разработки в проде это лишняя поверхность атаки и лишние сто мегабайт.
 * Мигратор из drizzle-orm умеет то же самое и уже есть в продакшен-зависимостях.
 *
 * Ждёт базу, но конечное число попыток и только на ошибках соединения:
 * бесконечный цикл вокруг миграции превращает сломанный SQL в вечное ожидание.
 */
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 2000;

const out = (line: string) => process.stdout.write(`${line}\n`);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Ошибки, при которых имеет смысл подождать: база ещё поднимается. */
function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ETIMEDOUT' ||
    code === '57P03' // cannot_connect_now: сервер стартует
  );
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    process.stderr.write('DATABASE_URL не задан — применять миграции некуда.\n');
    process.exit(1);
  }

  const migrationsFolder = process.env.MIGRATIONS_FOLDER ?? path.join('server', 'db', 'migrations');
  const pool = new pg.Pool({ connectionString, max: 1 });

  try {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const client = await pool.connect();
        client.release();
        break;
      } catch (error) {
        if (!isConnectionError(error) || attempt >= MAX_ATTEMPTS) {
          process.stderr.write(
            `База недоступна: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          process.exit(1);
        }
        out(`База ещё не отвечает (попытка ${attempt} из ${MAX_ATTEMPTS}), жду…`);
        await sleep(RETRY_DELAY_MS);
      }
    }

    out(`Применяю миграции из ${migrationsFolder}…`);
    await migrate(drizzle(pool), { migrationsFolder });
    out('Миграции применены.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Миграции не применены: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
