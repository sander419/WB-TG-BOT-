/**
 * Сервисный слой магазинов: подключение, проверка токена, запуск синхронизации.
 *
 * Порядок при подключении важен: сначала создаём запись и шифруем токен, потом
 * проверяем его у площадки, и только при успехе ставим статус active и ставим
 * задачи в очередь. Проверять до сохранения нельзя — тогда токен пришлось бы
 * держать в памяти дольше и передавать между слоями.
 */
import { childLogger } from '../core/logger';
import { getConnector } from '../connectors/registry';
import type { ConnectionCheck, MarketplaceId } from '../connectors/types';
import {
  buildConnectorContext,
  createStore,
  getStore,
  listStores,
  recordCredentialCheck,
  setStoreStatus,
  type StoreRow,
} from '../db/repositories/stores';
import { enqueueSync, latestJobs, SYNC_MODULES, type SyncModule } from '../db/repositories/syncJobs';

export interface ConnectStoreInput {
  organizationId: string;
  marketplace: MarketplaceId;
  name: string;
  apiKey: string;
  extra?: Record<string, string>;
  currency?: string;
  timezone?: string;
}

export interface ConnectStoreResult {
  store: StoreRow;
  check: ConnectionCheck;
  queuedJobs: string[];
}

export async function connectStore(input: ConnectStoreInput): Promise<ConnectStoreResult> {
  const store = await createStore(input);
  const log = childLogger({ storeId: store.id, marketplace: store.marketplace });

  const check = await testStoreConnection(input.organizationId, store.id);

  if (!check.ok) {
    log.warn({ message: check.message }, 'Токен не принят площадкой, магазин остаётся в статусе error');
    return { store: { ...store, status: 'error' }, check, queuedJobs: [] };
  }

  await setStoreStatus(store.id, 'active');
  const queuedJobs = await enqueueSync(store.id);
  log.info({ jobs: queuedJobs.length }, 'Магазин подключён, первичная синхронизация поставлена в очередь');

  return { store: { ...store, status: 'active' }, check, queuedJobs };
}

export async function testStoreConnection(organizationId: string, storeId: string): Promise<ConnectionCheck> {
  const store = await getStore(organizationId, storeId);
  if (!store) return { ok: false, message: 'Магазин не найден' };

  const connector = getConnector(store.marketplace);
  const ctx = await buildConnectorContext(organizationId, storeId);

  const check = await connector.testConnection(ctx);
  await recordCredentialCheck(storeId, check.ok);
  if (!check.ok) await setStoreStatus(storeId, 'error');

  return check;
}

export async function requestSync(
  organizationId: string,
  storeId: string,
  modules: SyncModule[] = SYNC_MODULES,
): Promise<string[]> {
  const store = await getStore(organizationId, storeId);
  if (!store) return [];
  return enqueueSync(storeId, modules);
}

export async function storesOverview(organizationId: string): Promise<
  Array<StoreRow & { recentJobs: Awaited<ReturnType<typeof latestJobs>> }>
> {
  const stores = await listStores(organizationId);
  return Promise.all(
    stores.map(async (store) => ({ ...store, recentJobs: await latestJobs(store.id, 8) })),
  );
}
