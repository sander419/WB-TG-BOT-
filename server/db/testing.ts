/**
 * Оснастка для интеграционных тестов на живой БД.
 *
 * Изоляция сделана через отдельную организацию на каждый тест, а не через
 * откат транзакции: репозитории берут соединение сами (`getDb()`), присоединить
 * их к внешней транзакции без переделки всего слоя нельзя. Организация с
 * уникальным именем плюс каскадное удаление в `finally` дают ту же изоляцию
 * и заодно проверяют, что каскады в схеме расставлены верно.
 *
 * Тесты пропускаются, если БД не настроена: разработчик без Postgres не должен
 * получать красную сборку из-за отсутствия инфраструктуры. В CI база есть,
 * поэтому там они выполняются всегда.
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from './client';
import { organizations, stores, storeCredentials } from './schema';
import { isEncryptionConfigured } from '../core/crypto';
import type { MarketplaceId } from '../connectors/types';

/** Есть ли всё нужное для интеграционных тестов. */
export const canRunDbTests = isDatabaseConfigured() && isEncryptionConfigured();

export const skipWithoutDb = {
  skip: canRunDbTests ? false : 'нет DATABASE_URL или SECRETS_ENCRYPTION_KEY',
};

export interface TestTenant {
  organizationId: string;
  storeId: string;
}

export interface CreateTenantOptions {
  marketplace?: MarketplaceId;
  currency?: string;
  timezone?: string;
  /** Зашифрованный токен создаётся, только если он задан. */
  encryptedApiKey?: string;
  status?: 'pending' | 'active' | 'error' | 'disabled';
}

/** Создаёт изолированную организацию с одним магазином. */
export async function createTenant(options: CreateTenantOptions = {}): Promise<TestTenant> {
  const db = getDb();

  const org = await db
    .insert(organizations)
    .values({
      // uuid в имени: параллельные тесты не должны видеть друг друга.
      name: `test-${randomUUID()}`,
      timezone: options.timezone ?? 'Europe/Moscow',
      baseCurrency: options.currency ?? 'RUB',
    })
    .returning({ id: organizations.id });

  const organizationId = org[0]?.id;
  if (!organizationId) throw new Error('Тестовая организация не создалась');

  const store = await db
    .insert(stores)
    .values({
      organizationId,
      marketplace: options.marketplace ?? 'wildberries',
      name: 'Тестовый магазин',
      currency: options.currency ?? 'RUB',
      timezone: options.timezone ?? 'Europe/Moscow',
      status: options.status ?? 'active',
    })
    .returning({ id: stores.id });

  const storeId = store[0]?.id;
  if (!storeId) throw new Error('Тестовый магазин не создался');

  if (options.encryptedApiKey !== undefined) {
    await db.insert(storeCredentials).values({ storeId, encryptedApiKey: options.encryptedApiKey });
  }

  return { organizationId, storeId };
}

/** Удаляет организацию со всем содержимым. */
export async function dropTenant(organizationId: string): Promise<void> {
  await getDb().delete(organizations).where(eq(organizations.id, organizationId));
}

/**
 * Запускает тело теста на свежей организации и убирает её в любом случае.
 * Падение теста не должно оставлять мусор в базе разработчика.
 */
export async function withTenant<T>(
  body: (tenant: TestTenant) => Promise<T>,
  options: CreateTenantOptions = {},
): Promise<T> {
  const tenant = await createTenant(options);
  try {
    return await body(tenant);
  } finally {
    await dropTenant(tenant.organizationId);
  }
}
