/**
 * Коннектор Wildberries.
 *
 * Состояние: чтение написано (карточки, цены, остатки FBO, заказы, отзывы),
 * но НЕ проверено на боевом токене — формы ответов и пути помечены как
 * неподтверждённые, см. endpoints.ts и docs/INTEGRATION-WILDBERRIES.md.
 * Разбор идёт через zod: расхождение формы даёт громкую ошибку с именем поля,
 * а не тихо потерянные данные.
 *
 * Запись (цены, остатки, ответы на отзывы) осознанно не реализована: сначала
 * сутки чтения на боевом токене, потом запись. Порядок — docs/ROADMAP.md, этап 4.
 */
import { NotImplementedError } from '../../core/errors';
import { childLogger } from '../../core/logger';
import { WildberriesClient } from './client';
import {
  parseWbResponse,
  wbCardsListSchema,
  wbFeedbacksSchema,
  wbGoodsFilterSchema,
  wbSupplierOrdersSchema,
  wbSupplierStocksSchema,
} from './schemas';
import {
  buildPriceMap,
  decodeCardCursor,
  encodeCardCursor,
  normalizeCard,
  normalizeFeedback,
  normalizeSupplierOrder,
  normalizeSupplierStock,
  type WbPriceEntry,
} from './normalize';
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
const DEFAULT_PAGE_LIMIT = 100;
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
const PRICE_PAGE_LIMIT = 1000;

/**
 * Дата, с которой запрашиваются остатки и заказы, если период не задан.
 * WB требует dateFrom обязательно; «с начала времён» — так забираем всё.
 */
const EPOCH_DATE = '2019-06-20';

interface PriceCacheEntry {
  expiresAt: number;
  prices: Map<string, WbPriceEntry>;
}

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

  /**
   * Цены лежат в отдельной группе API от карточек, поэтому на каждую страницу
   * карточек пришлось бы делать лишний запрос. Держим карту цен по магазину
   * с коротким TTL: за пять минут цена не успевает разъехаться настолько,
   * чтобы это влияло на решения, а лимит группы «Цены» экономится заметно.
   */
  private readonly priceCache = new Map<string, PriceCacheEntry>();

  async testConnection(ctx: ConnectorContext): Promise<ConnectionCheck> {
    const log = childLogger({ marketplace: this.id, storeId: ctx.storeId });
    const client = new WildberriesClient(ctx);

    const probe = await client.probe();
    if (probe === 'unreachable') {
      return { ok: false, message: 'WB API недоступен: не отвечает ни на один запрос. Проверь сеть.' };
    }
    if (probe === 'unauthorized') {
      return { ok: false, message: 'Хост WB отвечает, но токен не принят. Проверь токен и его категории.' };
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

  async listProducts(ctx: ConnectorContext, query: PageQuery = {}): Promise<Page<NormalizedProduct>> {
    const client = new WildberriesClient(ctx);
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = decodeCardCursor(query.cursor);

    const response = await client.call('cardsList', {
      body: {
        settings: {
          cursor: { limit, ...(cursor ?? {}) },
          filter: { withPhoto: -1 },
        },
      },
    });

    const parsed = parseWbResponse(wbCardsListSchema, response, 'cardsList');
    const prices = await this.getPriceMap(ctx);

    const items = parsed.cards.map((card) => normalizeCard(card, prices.get(String(card.nmID))));

    // Курсор отдаём, только если страница полная: иначе это последняя страница.
    const nextCursor = parsed.cards.length < limit ? undefined : encodeCardCursor(parsed.cursor ?? {});

    return { items, ...(nextCursor === undefined ? {} : { nextCursor }) };
  }

  /**
   * Остатки на складах WB (FBO). Остатки FBS живут в другой группе API и
   * запрашиваются по каждому складу продавца отдельно — это отдельная задача,
   * складывать их с FBO без разделения по fulfillment нельзя.
   */
  async listStocks(ctx: ConnectorContext, _query: PageQuery = {}): Promise<Page<NormalizedStock>> {
    const client = new WildberriesClient(ctx);

    const response = await client.call('supplierStocks', {
      query: { dateFrom: EPOCH_DATE },
      // Группа статистики отдаёт примерно один запрос в минуту: ретраи здесь дороги.
      retries: 1,
      timeoutMs: 120_000,
    });

    const parsed = parseWbResponse(wbSupplierStocksSchema, response, 'supplierStocks');
    return { items: parsed.map(normalizeSupplierStock) };
  }

  /**
   * Заказы за период. WB отдаёт по строке на позицию, ключ строки — srid.
   * Верхняя граница периода фильтруется на нашей стороне: параметра «до» у метода нет.
   */
  async listOrders(
    ctx: ConnectorContext,
    range: DateRangeQuery,
    _query: PageQuery = {},
  ): Promise<Page<NormalizedOrder>> {
    const client = new WildberriesClient(ctx);

    const response = await client.call('supplierOrders', {
      query: { dateFrom: range.from, flag: 0 },
      retries: 1,
      timeoutMs: 120_000,
    });

    const parsed = parseWbResponse(wbSupplierOrdersSchema, response, 'supplierOrders');
    const upperBound = Date.parse(range.to);

    const items = parsed
      .filter((order) => {
        const orderedAt = Date.parse(order.date);
        return Number.isNaN(orderedAt) || orderedAt < upperBound;
      })
      .map((order) => normalizeSupplierOrder(order, ctx.currency));

    return { items };
  }

  /**
   * Отзывы без ответа — операционно важная выборка.
   * TODO: отвеченные отзывы нужны для анализа тональности; добавить вторым
   * проходом с isAnswered=true, когда дойдём до Review Intelligence.
   */
  async listReviews(ctx: ConnectorContext, query: PageQuery = {}): Promise<Page<NormalizedReview>> {
    const client = new WildberriesClient(ctx);
    const take = query.limit ?? 50;
    const skip = Number(query.cursor ?? 0) || 0;

    const response = await client.call('feedbacks', {
      query: { isAnswered: false, take, skip },
    });

    const parsed = parseWbResponse(wbFeedbacksSchema, response, 'feedbacks');
    const items = parsed.data.feedbacks.map(normalizeFeedback);
    const nextCursor = items.length < take ? undefined : String(skip + take);

    return { items, ...(nextCursor === undefined ? {} : { nextCursor }) };
  }

  /** TODO: отчёт по поисковым запросам (seller-analytics) заказывается асинхронно. */
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
   * запись в action_audit со снимком «до» и подтверждение оператора
   * (docs/ARCHITECTURE.md → «Безопасные действия»).
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

  // --- Внутреннее -----------------------------------------------------------

  /** Карта цен по nmID с коротким кэшем на магазин. */
  private async getPriceMap(ctx: ConnectorContext): Promise<Map<string, WbPriceEntry>> {
    const cached = this.priceCache.get(ctx.storeId);
    if (cached && cached.expiresAt > Date.now()) return cached.prices;

    const client = new WildberriesClient(ctx);
    const goods: Parameters<typeof buildPriceMap>[0] = [];

    // Пагинация по offset: список цен обычно укладывается в несколько страниц.
    for (let offset = 0; ; offset += PRICE_PAGE_LIMIT) {
      const response = await client.call('goodsFilter', {
        query: { limit: PRICE_PAGE_LIMIT, offset },
      });
      const parsed = parseWbResponse(wbGoodsFilterSchema, response, 'goodsFilter');
      goods.push(...parsed.data.listGoods);
      if (parsed.data.listGoods.length < PRICE_PAGE_LIMIT) break;
    }

    const prices = buildPriceMap(goods, ctx.currency);
    this.priceCache.set(ctx.storeId, { expiresAt: Date.now() + PRICE_CACHE_TTL_MS, prices });
    return prices;
  }

  /** Сброс кэша цен — вызывается после успешной записи цен. */
  invalidatePriceCache(storeId: string): void {
    this.priceCache.delete(storeId);
  }
}

export const wildberriesConnector = new WildberriesConnector();
