/**
 * Приведение ответов Wildberries к нормализованным типам платформы.
 *
 * Отдельный файл от клиента и от коннектора: это чистые функции без сети,
 * их можно (и нужно) покрывать тестами на фикстурах. Именно здесь чаще всего
 * появляются тихие ошибки — перепутанная цена со скидкой, потерянные возвраты,
 * сложенные вместе FBO и FBS.
 */
import { fromMajor, type Money } from '../../core/money';
import type {
  NormalizedOrder,
  NormalizedProduct,
  NormalizedReview,
  NormalizedStock,
} from '../types';
import type { WbCard, WbFeedback, WbGood, WbSupplierOrder, WbSupplierStock } from './schemas';

/** Цены товара, собранные из группы «Цены и скидки». */
export interface WbPriceEntry {
  price?: Money;
  discountedPrice?: Money;
  currency: string;
}

export function cardImageUrls(card: WbCard): string[] {
  return (card.photos ?? [])
    .map((photo) => photo.big ?? photo.c516x688 ?? photo.c246x328 ?? photo.square)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

/** Первый штрихкод из размерной сетки. Плоская модель товара — см. ROADMAP, вопрос про размеры. */
export function cardBarcode(card: WbCard): string | undefined {
  for (const size of card.sizes ?? []) {
    const first = size.skus?.[0];
    if (first) return first;
  }
  return undefined;
}

export function normalizeCard(card: WbCard, prices?: WbPriceEntry): NormalizedProduct {
  const barcode = cardBarcode(card);
  return {
    externalId: String(card.nmID),
    sellerSku: card.vendorCode,
    ...(barcode === undefined ? {} : { barcode }),
    title: card.title ?? card.vendorCode,
    ...(card.brand === undefined ? {} : { brand: card.brand }),
    ...(card.subjectName === undefined ? {} : { category: card.subjectName }),
    url: `https://www.wildberries.ru/catalog/${card.nmID}/detail.aspx`,
    imageUrls: cardImageUrls(card),
    ...(prices?.price === undefined ? {} : { price: prices.price }),
    ...(prices?.discountedPrice === undefined ? {} : { discountedPrice: prices.discountedPrice }),
    raw: card,
  };
}

/**
 * Карта цен по nmID.
 *
 * Цена и цена со скидкой — разные поля: покупатель видит вторую. Берём цену
 * первого размера: у WB цена задаётся на размер, но у подавляющего большинства
 * товаров она одна на все размеры. Магазины с разной ценой по размерам —
 * отдельная задача вместе с сущностью варианта товара.
 */
export function buildPriceMap(goods: WbGood[], fallbackCurrency = 'RUB'): Map<string, WbPriceEntry> {
  const map = new Map<string, WbPriceEntry>();

  for (const good of goods) {
    const currency = good.currencyIsoCode4217 ?? fallbackCurrency;
    const size = good.sizes?.[0];
    if (!size) {
      map.set(String(good.nmID), { currency });
      continue;
    }
    map.set(String(good.nmID), {
      currency,
      ...(size.price === undefined ? {} : { price: fromMajor(size.price, currency) }),
      ...(size.discountedPrice === undefined
        ? {}
        : { discountedPrice: fromMajor(size.discountedPrice, currency) }),
    });
  }

  return map;
}

/**
 * Остатки FBO из группы статистики.
 *
 * quantity — доступно к продаже; quantityFull включает товар в пути. Для риска
 * out-of-stock важно первое: то, что едет на склад, продать сегодня нельзя.
 */
export function normalizeSupplierStock(stock: WbSupplierStock): NormalizedStock {
  return {
    externalId: String(stock.nmId),
    sellerSku: stock.supplierArticle,
    warehouseId: stock.warehouseName,
    warehouseName: stock.warehouseName,
    quantity: stock.quantity,
    fulfillment: 'marketplace',
    updatedAt: stock.lastChangeDate,
  };
}

/**
 * Заказ WB — это одна позиция, а не корзина: в ответе строка на каждый товар.
 * Собираем заказ из одной строки, ключ — srid.
 *
 * finishedPrice — то, что реально заплатил покупатель (с учётом скидки WB).
 * totalPrice — цена до скидок. Считать выручку по totalPrice значит завысить её.
 */
export function normalizeSupplierOrder(order: WbSupplierOrder, currency = 'RUB'): NormalizedOrder {
  const paid = order.finishedPrice ?? order.priceWithDisc ?? order.totalPrice;
  const total = fromMajor(paid, currency);

  return {
    externalId: order.srid,
    createdAt: order.date,
    status: order.isCancel ? 'cancelled' : 'new',
    total,
    lines: [
      {
        externalId: String(order.nmId),
        sellerSku: order.supplierArticle,
        quantity: 1,
        price: total,
      },
    ],
    ...(order.regionName === undefined ? {} : { destinationRegion: order.regionName }),
    raw: order,
  };
}

/** Отзыв. Достоинства и недостатки — отдельные поля, склеиваем в один текст. */
export function normalizeFeedback(feedback: WbFeedback): NormalizedReview {
  const parts = [feedback.text, feedback.pros, feedback.cons].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );

  return {
    externalId: feedback.id,
    productExternalId: String(feedback.productDetails.nmId),
    createdAt: feedback.createdDate,
    rating: feedback.productValuation,
    text: parts.join('\n'),
    ...(feedback.userName === undefined ? {} : { authorName: feedback.userName }),
    answered: feedback.answer !== null && feedback.answer !== undefined,
    raw: feedback,
  };
}

/**
 * Курсор карточек WB составной: пара (updatedAt, nmID). Наружу отдаём одной
 * непрозрачной строкой, чтобы вызывающий код не знал устройства площадки.
 */
export function encodeCardCursor(cursor: { updatedAt?: string; nmID?: number }): string | undefined {
  if (!cursor.updatedAt || cursor.nmID === undefined) return undefined;
  return Buffer.from(JSON.stringify({ updatedAt: cursor.updatedAt, nmID: cursor.nmID }), 'utf8').toString(
    'base64url',
  );
}

export function decodeCardCursor(cursor: string | undefined): { updatedAt: string; nmID: number } | undefined {
  if (!cursor) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'updatedAt' in parsed &&
      'nmID' in parsed &&
      typeof (parsed as { updatedAt: unknown }).updatedAt === 'string' &&
      typeof (parsed as { nmID: unknown }).nmID === 'number'
    ) {
      return parsed as { updatedAt: string; nmID: number };
    }
    return undefined;
  } catch {
    return undefined;
  }
}
