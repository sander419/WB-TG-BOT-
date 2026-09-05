/**
 * Коннектор Wildberries.
 *
 * Состояние: каркас. Реализован только testConnection — он нужен, чтобы проверить
 * боевой токен, не трогая данные. Остальные методы осознанно бросают
 * NotImplementedError с указанием, какой эндпоинт и какой раздел документации
 * закрывает задачу. Это лучше, чем вернуть пустой массив: пустой массив выглядит
 * как «товаров нет» и уводит отладку в сторону.
 *
 * Порядок реализации — docs/ROADMAP.md, этап 2.
 */
import { NotImplementedError } from '../../core/errors';
import { childLogger } from '../../core/logger';
import { WildberriesClient } from './client';
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
} from '../types';

const DOC = 'docs/INTEGRATION-WILDBERRIES.md';

export class WildberriesConnector implements MarketplaceConnector {
  readonly id: MarketplaceId = 'wildberries';
  readonly region: MarketRegion = 'russia';

  /**
   * Что WB умеет в принципе. Флаги отражают возможности площадки, а не готовность
   * нашего кода: готовность видно по тому, бросает метод NotImplementedError или нет.
   */
  readonly capabilities: ConnectorCapabilities = {
    readProducts: true,
    readStocks: true,
    readOrders: true,
    readReviews: true,
    readSearchPositions: true,
    readAdvertising: true,
    writePrices: true,
    writeStocks: true,
    writeContent: true,
    replyToReviews: true,
  };

  async testConnection(ctx: ConnectorContext): Promise<ConnectionCheck> {
    const log = childLogger({ marketplace: this.id, storeId: ctx.storeId });
    const client = new WildberriesClient(ctx);

    const alive = await client.ping();
    if (!alive) {
      return { ok: false, message: 'WB API не ответил на /ping — проверь сеть и доступность хоста.' };
    }

    try {
      const info = await client.call<{ name?: string; sid?: string; tradeMark?: string }>('sellerInfo', {
        retries: 1,
      });
      log.info({ account: info?.name }, 'Токен WB принят');
      return {
        ok: true,
        ...(info?.name === undefined ? {} : { accountName: info.name }),
        message: 'Токен действителен.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `Токен отклонён: ${message}` };
    }
  }

  // --- Чтение ---------------------------------------------------------------

  /** TODO: WB_ENDPOINTS.cardsList, курсор {updatedAt, nmID}, лимит 100 карточек. */
  async listProducts(_ctx: ConnectorContext, _query?: PageQuery): Promise<Page<NormalizedProduct>> {
    throw new NotImplementedError('WildberriesConnector.listProducts', `${DOC} → «Карточки товаров»`);
  }

  /** TODO: FBO — supplierStocks (statistics), FBS — stocksBySku по каждому складу. */
  async listStocks(_ctx: ConnectorContext, _query?: PageQuery): Promise<Page<NormalizedStock>> {
    throw new NotImplementedError('WildberriesConnector.listStocks', `${DOC} → «Остатки»`);
  }

  /** TODO: supplierOrders + supplierSales, склейка по srid. Лимит группы — 1 запрос в минуту. */
  async listOrders(
    _ctx: ConnectorContext,
    _range: DateRangeQuery,
    _query?: PageQuery,
  ): Promise<Page<NormalizedOrder>> {
    throw new NotImplementedError('WildberriesConnector.listOrders', `${DOC} → «Заказы и продажи»`);
  }

  /** TODO: feedbacks, пагинация take/skip, фильтр isAnswered. */
  async listReviews(_ctx: ConnectorContext, _query?: PageQuery): Promise<Page<NormalizedReview>> {
    throw new NotImplementedError('WildberriesConnector.listReviews', `${DOC} → «Отзывы»`);
  }

  /** TODO: отчёт по поисковым запросам (seller-analytics). Заказывается асинхронно. */
  async getSearchPositions(_ctx: ConnectorContext, _keywords: string[]): Promise<SearchPosition[]> {
    throw new NotImplementedError('WildberriesConnector.getSearchPositions', `${DOC} → «Позиции в поиске»`);
  }

  /** TODO: advertCampaigns + /adv/v2/fullstats для расходов. */
  async listAdCampaigns(_ctx: ConnectorContext): Promise<AdCampaign[]> {
    throw new NotImplementedError('WildberriesConnector.listAdCampaigns', `${DOC} → «Реклама»`);
  }

  // --- Запись ---------------------------------------------------------------

  /**
   * TODO: pricesUpload — операция асинхронная, возвращает id задачи; статус
   * опрашивается отдельно. Перед реализацией обязательно: проверка ctx.allowWrites,
   * запись в audit-лог и подтверждение оператора (см. docs/ARCHITECTURE.md → «Безопасные действия»).
   */
  async updatePrices(_ctx: ConnectorContext, _updates: PriceUpdate[]): Promise<WriteResult> {
    throw new NotImplementedError('WildberriesConnector.updatePrices', `${DOC} → «Цены»`);
  }

  /** TODO: stocksUpdate по складу FBS. Для FBO остатки через API не меняются. */
  async updateStocks(_ctx: ConnectorContext, _updates: StockUpdate[]): Promise<WriteResult> {
    throw new NotImplementedError('WildberriesConnector.updateStocks', `${DOC} → «Остатки»`);
  }

  /** TODO: feedbackAnswer, PATCH с id отзыва и текстом. */
  async replyToReview(_ctx: ConnectorContext, _reviewExternalId: string, _text: string): Promise<WriteResult> {
    throw new NotImplementedError('WildberriesConnector.replyToReview', `${DOC} → «Отзывы»`);
  }
}

export const wildberriesConnector = new WildberriesConnector();
