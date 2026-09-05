/**
 * Доступ к магазинам и их учётным данным.
 *
 * Единственное место, где расшифровываются токены площадок. Наружу отдаётся
 * готовый ConnectorContext, а не сам токен, — чтобы секрет не расползался
 * по сервисному слою и не попадал в объекты, которые кто-нибудь залогирует.
 */
import { and, eq } from 'drizzle-orm';
import { decryptSecret, encryptSecret } from '../../core/crypto';
import { AppError } from '../../core/errors';
import { env } from '../../config/env';
import type { ConnectorContext, MarketplaceId, StoreCredentials } from '../../connectors/types';
import { getDb } from '../client';
import { stores, storeCredentials } from '../schema';

export interface CreateStoreInput {
  organizationId: string;
  marketplace: MarketplaceId;
  name: string;
  apiKey: string;
  extra?: Record<string, string>;
  currency?: string;
  timezone?: string;
}

export interface StoreRow {
  id: string;
  organizationId: string;
  marketplace: MarketplaceId;
  name: string;
  currency: string;
  timezone: string;
  status: 'pending' | 'active' | 'error' | 'disabled';
  lastSyncAt: Date | null;
}

/** Создаёт магазин и сохраняет зашифрованные учётные данные одной транзакцией. */
export async function createStore(input: CreateStoreInput): Promise<StoreRow> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(stores)
      .values({
        organizationId: input.organizationId,
        marketplace: input.marketplace,
        name: input.name,
        currency: input.currency ?? env.DEFAULT_CURRENCY,
        timezone: input.timezone ?? env.DEFAULT_TIMEZONE,
        status: 'pending',
      })
      .returning();

    const store = inserted[0];
    if (!store) throw new AppError('Не удалось создать магазин');

    await tx.insert(storeCredentials).values({
      storeId: store.id,
      encryptedApiKey: encryptSecret(input.apiKey),
      ...(input.extra === undefined ? {} : { encryptedExtra: encryptSecret(JSON.stringify(input.extra)) }),
    });

    return toStoreRow(store);
  });
}

export async function listStores(organizationId: string): Promise<StoreRow[]> {
  const rows = await getDb().select().from(stores).where(eq(stores.organizationId, organizationId));
  return rows.map(toStoreRow);
}

export async function getStore(organizationId: string, storeId: string): Promise<StoreRow | undefined> {
  const rows = await getDb()
    .select()
    .from(stores)
    .where(and(eq(stores.organizationId, organizationId), eq(stores.id, storeId)))
    .limit(1);
  const row = rows[0];
  return row ? toStoreRow(row) : undefined;
}

/** Поиск без организации — только для воркера, который получает storeId из очереди. */
export async function getStoreById(storeId: string): Promise<StoreRow | undefined> {
  const rows = await getDb().select().from(stores).where(eq(stores.id, storeId)).limit(1);
  const row = rows[0];
  return row ? toStoreRow(row) : undefined;
}

export async function setStoreStatus(storeId: string, status: StoreRow['status']): Promise<void> {
  await getDb().update(stores).set({ status }).where(eq(stores.id, storeId));
}

export async function markStoreSynced(storeId: string): Promise<void> {
  await getDb().update(stores).set({ lastSyncAt: new Date() }).where(eq(stores.id, storeId));
}

export async function recordCredentialCheck(storeId: string, ok: boolean): Promise<void> {
  await getDb()
    .update(storeCredentials)
    .set({ lastCheckedAt: new Date(), lastCheckOk: ok })
    .where(eq(storeCredentials.storeId, storeId));
}

/**
 * Собирает контекст для коннектора: расшифровывает токен и подставляет
 * валюту, таймзону и право на запись.
 *
 * allowWrites — конъюнкция глобального рубильника и явного разрешения вызова.
 * Даже если сервис попросит запись, при ALLOW_MARKETPLACE_WRITES=false её не будет.
 */
export async function buildConnectorContext(
  organizationId: string,
  storeId: string,
  options: { allowWrites?: boolean } = {},
): Promise<ConnectorContext> {
  const db = getDb();

  const rows = await db
    .select({ store: stores, credentials: storeCredentials })
    .from(stores)
    .innerJoin(storeCredentials, eq(storeCredentials.storeId, stores.id))
    .where(and(eq(stores.organizationId, organizationId), eq(stores.id, storeId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new AppError(`Магазин ${storeId} не найден или у него нет сохранённого токена`, { code: 'NOT_FOUND' });
  }

  const credentials: StoreCredentials = {
    apiKey: decryptSecret(row.credentials.encryptedApiKey),
    ...(row.credentials.encryptedExtra
      ? { extra: JSON.parse(decryptSecret(row.credentials.encryptedExtra)) as Record<string, string> }
      : {}),
  };

  return {
    organizationId,
    storeId,
    credentials,
    currency: row.store.currency,
    timezone: row.store.timezone,
    allowWrites: env.ALLOW_MARKETPLACE_WRITES && (options.allowWrites ?? false),
  };
}

function toStoreRow(row: typeof stores.$inferSelect): StoreRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    marketplace: row.marketplace,
    name: row.name,
    currency: row.currency,
    timezone: row.timezone,
    status: row.status,
    lastSyncAt: row.lastSyncAt,
  };
}
