/**
 * Синхронизация одного модуля данных магазина.
 *
 * Здесь встречаются коннектор (откуда) и репозиторий (куда). Никакой
 * площадко-специфичной логики: если она понадобилась — значит, протекла
 * абстракция коннектора, чинить надо там.
 */
import { childLogger } from '../core/logger';
import { AppError } from '../core/errors';
import { getConnector } from '../connectors/registry';
import type { ConnectorContext, MarketplaceConnector, Page } from '../connectors/types';
import { buildConnectorContext, getStore, markStoreSynced } from '../db/repositories/stores';
import {
  insertStockSnapshots,
  upsertOrders,
  upsertProducts,
  upsertReviews,
  type StoreScope,
} from '../db/repositories/catalog';
import type { SyncModule } from '../db/repositories/syncJobs';

/** Страховка от бесконечной пагинации, если площадка отдаёт курсор по кругу. */
export const MAX_PAGES = 200;

export interface SyncResult {
  module: SyncModule;
  itemsProcessed: number;
}

/** Проходит все страницы, отдавая их пачками. */
export async function forEachPage<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  handle: (items: T[]) => Promise<number>,
): Promise<number> {
  let cursor: string | undefined;
  let processed = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(cursor);
    processed += await handle(result.items);

    if (!result.nextCursor || result.nextCursor === cursor || result.items.length === 0) break;
    cursor = result.nextCursor;
  }

  return processed;
}

export async function runSync(
  organizationId: string,
  storeId: string,
  module: SyncModule,
): Promise<SyncResult> {
  const store = await getStore(organizationId, storeId);
  if (!store) throw new AppError(`Магазин ${storeId} не найден`, { code: 'NOT_FOUND' });

  const connector = getConnector(store.marketplace);
  const ctx = await buildConnectorContext(organizationId, storeId);
  const scope: StoreScope = { organizationId, storeId };
  const log = childLogger({ marketplace: store.marketplace, storeId, module });

  const itemsProcessed = await runModule(connector, ctx, scope, module);

  await markStoreSynced(storeId);
  log.info({ itemsProcessed }, 'Модуль синхронизирован');
  return { module, itemsProcessed };
}

async function runModule(
  connector: MarketplaceConnector,
  ctx: ConnectorContext,
  scope: StoreScope,
  module: SyncModule,
): Promise<number> {
  switch (module) {
    case 'products':
      requireCapability(connector, 'readProducts', module);
      return forEachPage(
        (cursor) => connector.listProducts(ctx, cursor === undefined ? {} : { cursor }),
        (items) => upsertProducts(scope, items),
      );

    case 'stocks':
      requireCapability(connector, 'readStocks', module);
      return forEachPage(
        (cursor) => connector.listStocks(ctx, cursor === undefined ? {} : { cursor }),
        (items) => insertStockSnapshots(scope, items),
      );

    case 'orders': {
      requireCapability(connector, 'readOrders', module);
      // Окно с запасом: заказ может изменить статус задним числом.
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      return forEachPage(
        (cursor) =>
          connector.listOrders(
            ctx,
            { from: from.toISOString(), to: to.toISOString() },
            cursor === undefined ? {} : { cursor },
          ),
        (items) => upsertOrders(scope, items),
      );
    }

    case 'reviews':
      requireCapability(connector, 'readReviews', module);
      return forEachPage(
        (cursor) => connector.listReviews(ctx, cursor === undefined ? {} : { cursor }),
        (items) => upsertReviews(scope, items),
      );
  }
}

function requireCapability(
  connector: MarketplaceConnector,
  capability: keyof MarketplaceConnector['capabilities'],
  module: SyncModule,
): void {
  if (!connector.capabilities[capability]) {
    throw new AppError(`Площадка ${connector.id} не умеет ${module}`, {
      code: 'NOT_IMPLEMENTED',
      context: { capability },
    });
  }
}
