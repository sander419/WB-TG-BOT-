/**
 * Заготовка коннектора для площадок, до которых ещё не дошли руки.
 *
 * Зачем она есть: реестр должен знать про все площадки из дорожной карты, чтобы
 * UI показывал их в списке и честно писал «не подключено», а не притворялся,
 * что площадки не существует. Все методы бросают NotImplementedError.
 */
import { NotImplementedError } from '../core/errors';
import type {
  AdCampaign,
  ConnectionCheck,
  ConnectorCapabilities,
  ConnectorContext,
  DateRangeQuery,
  MarketplaceConnector,
  MarketplaceId,
  MarketRegion,
  NormalizedOrder,
  NormalizedProduct,
  NormalizedReview,
  NormalizedStock,
  Page,
  PageQuery,
  PriceUpdate,
  SearchPosition,
  StockUpdate,
  WriteResult,
} from './types';
import { NO_CAPABILITIES } from './types';

export function createPlaceholderConnector(
  id: MarketplaceId,
  region: MarketRegion,
  docRef: string,
  capabilities: Partial<ConnectorCapabilities> = {},
): MarketplaceConnector {
  const fail = (method: string): never => {
    throw new NotImplementedError(`Коннектор ${id}: ${method}`, docRef);
  };

  return {
    id,
    region,
    capabilities: { ...NO_CAPABILITIES, ...capabilities },

    async testConnection(_ctx: ConnectorContext): Promise<ConnectionCheck> {
      return { ok: false, message: `Коннектор ${id} ещё не реализован. См. ${docRef}` };
    },
    async listProducts(_ctx: ConnectorContext, _query?: PageQuery): Promise<Page<NormalizedProduct>> {
      return fail('listProducts');
    },
    async listStocks(_ctx: ConnectorContext, _query?: PageQuery): Promise<Page<NormalizedStock>> {
      return fail('listStocks');
    },
    async listOrders(
      _ctx: ConnectorContext,
      _range: DateRangeQuery,
      _query?: PageQuery,
    ): Promise<Page<NormalizedOrder>> {
      return fail('listOrders');
    },
    async listReviews(_ctx: ConnectorContext, _query?: PageQuery): Promise<Page<NormalizedReview>> {
      return fail('listReviews');
    },
    async getSearchPositions(_ctx: ConnectorContext, _keywords: string[]): Promise<SearchPosition[]> {
      return fail('getSearchPositions');
    },
    async listAdCampaigns(_ctx: ConnectorContext): Promise<AdCampaign[]> {
      return fail('listAdCampaigns');
    },
    async updatePrices(_ctx: ConnectorContext, _updates: PriceUpdate[]): Promise<WriteResult> {
      return fail('updatePrices');
    },
    async updateStocks(_ctx: ConnectorContext, _updates: StockUpdate[]): Promise<WriteResult> {
      return fail('updateStocks');
    },
    async replyToReview(_ctx: ConnectorContext, _reviewExternalId: string, _text: string): Promise<WriteResult> {
      return fail('replyToReview');
    },
  };
}
