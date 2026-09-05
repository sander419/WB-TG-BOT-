/**
 * Реестр коннекторов. Единственное место, где система знает список площадок.
 *
 * Добавление новой площадки: реализовать MarketplaceConnector и зарегистрировать здесь.
 * Больше никаких правок — бот, дашборд и движок правил ходят через getConnector().
 */
import { AppError } from '../core/errors';
import { createPlaceholderConnector } from './placeholder';
import { wildberriesConnector } from './wildberries';
import type { MarketplaceConnector, MarketplaceId } from './types';

const connectors = new Map<MarketplaceId, MarketplaceConnector>();

function register(connector: MarketplaceConnector): void {
  connectors.set(connector.id, connector);
}

register(wildberriesConnector);

// Площадки из дорожной карты. Заглушки, чтобы UI честно показывал «не подключено».
register(createPlaceholderConnector('ozon', 'russia', 'docs/ROADMAP.md → этап 4'));
register(createPlaceholderConnector('shopify', 'global', 'docs/ROADMAP.md → этап 5'));
register(createPlaceholderConnector('1688', 'china', 'docs/ROADMAP.md → этап 6'));
register(createPlaceholderConnector('taobao', 'china', 'docs/ROADMAP.md → этап 6'));
register(createPlaceholderConnector('jd', 'china', 'docs/ROADMAP.md → этап 6'));

export function getConnector(id: MarketplaceId): MarketplaceConnector {
  const connector = connectors.get(id);
  if (!connector) {
    throw new AppError(`Неизвестная площадка: ${id}`, { code: 'NOT_FOUND' });
  }
  return connector;
}

export function listConnectors(): MarketplaceConnector[] {
  return [...connectors.values()];
}

/** Сводка для /api/platform/connectors и стартового лога. */
export function connectorsSummary(): Array<{
  id: MarketplaceId;
  region: string;
  implemented: boolean;
  capabilities: MarketplaceConnector['capabilities'];
}> {
  return listConnectors().map((connector) => ({
    id: connector.id,
    region: connector.region,
    // Заглушки не умеют ничего: все флаги false.
    implemented: Object.values(connector.capabilities).some(Boolean),
    capabilities: connector.capabilities,
  }));
}
