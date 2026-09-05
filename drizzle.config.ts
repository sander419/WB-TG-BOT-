import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Конфиг миграций. Генерация: npm run db:generate, применение: npm run db:migrate.
 * Миграции коммитятся в git — прод не должен обновлять схему через push.
 */
export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://commerceos:commerceos@localhost:5432/commerceos',
  },
  strict: true,
  verbose: true,
});
