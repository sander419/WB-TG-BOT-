/**
 * Тесты разбора и нормализации ответов WB.
 *
 * Важно понимать, что именно они проверяют: НАШУ логику приведения к общим типам
 * на фикстурах ожидаемой формы. Они не подтверждают, что WB отдаёт именно такую
 * форму — это проверяется только боевым токеном (docs/INTEGRATION-WILDBERRIES.md).
 * Зато при смене формы у WB упадёт parseWbResponse с именем поля, а не тихо
 * уедет ноль в отчёт.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMajor } from '../../core/money';
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
  cardBarcode,
  cardImageUrls,
  decodeCardCursor,
  encodeCardCursor,
  normalizeCard,
  normalizeFeedback,
  normalizeSupplierOrder,
  normalizeSupplierStock,
} from './normalize';

const cardsFixture = {
  cards: [
    {
      nmID: 77291048,
      imtID: 12345,
      vendorCode: 'BP-URBAN-01',
      title: 'Рюкзак городской мужской',
      brand: 'UrbanLine',
      subjectName: 'Рюкзаки',
      photos: [{ big: 'https://img.wb.ru/big.jpg', c246x328: 'https://img.wb.ru/small.jpg' }],
      sizes: [{ chrtID: 1, techSize: '0', skus: ['2037364567890'] }],
      updatedAt: '2026-09-04T10:00:00Z',
      // Незнакомое поле: схема обязана его пережить.
      someNewFieldFromWb: 'ignored',
    },
  ],
  cursor: { updatedAt: '2026-09-04T10:00:00Z', nmID: 77291048, total: 184 },
};

const goodsFixture = {
  data: {
    listGoods: [
      {
        nmID: 77291048,
        vendorCode: 'BP-URBAN-01',
        currencyIsoCode4217: 'RUB',
        discount: 15,
        sizes: [{ sizeID: 0, price: 2190, discountedPrice: 1861.5 }],
      },
      { nmID: 999, vendorCode: 'NO-SIZES', sizes: [] },
    ],
  },
};

test('карточки разбираются, незнакомые поля не ломают схему', () => {
  const parsed = parseWbResponse(wbCardsListSchema, cardsFixture, 'cardsList');
  assert.equal(parsed.cards.length, 1);
  assert.equal(parsed.cards[0]?.nmID, 77291048);
});

test('карточка нормализуется в товар платформы', () => {
  const parsed = parseWbResponse(wbCardsListSchema, cardsFixture, 'cardsList');
  const goods = parseWbResponse(wbGoodsFilterSchema, goodsFixture, 'goodsFilter');
  const prices = buildPriceMap(goods.data.listGoods);
  const card = parsed.cards[0];
  assert.ok(card);

  const product = normalizeCard(card, prices.get('77291048'));

  assert.equal(product.externalId, '77291048');
  assert.equal(product.sellerSku, 'BP-URBAN-01');
  assert.equal(product.barcode, '2037364567890');
  assert.equal(product.brand, 'UrbanLine');
  assert.equal(product.category, 'Рюкзаки');
  assert.match(product.url ?? '', /77291048/);
  assert.deepEqual(product.imageUrls, ['https://img.wb.ru/big.jpg']);
});

test('цена и цена со скидкой не путаются местами', () => {
  const goods = parseWbResponse(wbGoodsFilterSchema, goodsFixture, 'goodsFilter');
  const prices = buildPriceMap(goods.data.listGoods);
  const entry = prices.get('77291048');

  assert.ok(entry?.price);
  assert.ok(entry.discountedPrice);
  // В системе деньги в копейках.
  assert.equal(entry.price.amount, 219000);
  assert.equal(entry.discountedPrice.amount, 186150);
  assert.ok(entry.discountedPrice.amount < entry.price.amount, 'покупатель платит меньше базовой цены');
});

test('товар без размеров не роняет карту цен', () => {
  const goods = parseWbResponse(wbGoodsFilterSchema, goodsFixture, 'goodsFilter');
  const prices = buildPriceMap(goods.data.listGoods);
  const entry = prices.get('999');
  assert.ok(entry);
  assert.equal(entry.price, undefined);
  assert.equal(entry.currency, 'RUB');
});

test('строковые числа в ценах приводятся к числам', () => {
  const parsed = parseWbResponse(
    wbGoodsFilterSchema,
    { data: { listGoods: [{ nmID: 1, sizes: [{ price: '1500', discountedPrice: '1200' }] }] } },
    'goodsFilter',
  );
  const prices = buildPriceMap(parsed.data.listGoods);
  assert.equal(prices.get('1')?.price?.amount, 150000);
});

test('карточка без фото и без размеров нормализуется', () => {
  const product = normalizeCard({ nmID: 5, vendorCode: 'X' });
  assert.deepEqual(product.imageUrls, []);
  assert.equal(product.barcode, undefined);
  assert.equal(product.title, 'X', 'без названия подставляем артикул');
});

test('фото берётся в наибольшем доступном размере', () => {
  assert.deepEqual(cardImageUrls({ nmID: 1, vendorCode: 'X', photos: [{ c246x328: 'small.jpg' }] }), [
    'small.jpg',
  ]);
  assert.deepEqual(cardBarcode({ nmID: 1, vendorCode: 'X', sizes: [{ skus: [] }, { skus: ['444'] }] }), '444');
});

test('остатки FBO берут доступное количество, а не количество с товаром в пути', () => {
  const parsed = parseWbResponse(
    wbSupplierStocksSchema,
    [
      {
        lastChangeDate: '2026-09-05T08:00:00Z',
        warehouseName: 'Коледино',
        supplierArticle: 'BP-URBAN-01',
        nmId: 77291048,
        quantity: 12,
        quantityFull: 200,
        inWayToClient: 3,
      },
    ],
    'supplierStocks',
  );

  const stock = normalizeSupplierStock(parsed[0]!);
  assert.equal(stock.quantity, 12, 'товар в пути продать сегодня нельзя');
  assert.equal(stock.fulfillment, 'marketplace');
  assert.equal(stock.warehouseName, 'Коледино');
});

test('выручка считается по фактически уплаченной цене, а не по цене до скидок', () => {
  const parsed = parseWbResponse(
    wbSupplierOrdersSchema,
    [
      {
        date: '2026-09-05T09:15:00Z',
        supplierArticle: 'BP-URBAN-01',
        nmId: 77291048,
        totalPrice: 2190,
        discountPercent: 15,
        finishedPrice: 1861.5,
        srid: 'srid-1',
        regionName: 'Московская',
      },
    ],
    'supplierOrders',
  );

  const order = normalizeSupplierOrder(parsed[0]!);
  assert.equal(toMajor(order.total), 1861.5);
  assert.equal(order.externalId, 'srid-1');
  assert.equal(order.status, 'new');
  assert.equal(order.destinationRegion, 'Московская');
  assert.equal(order.lines.length, 1);
});

test('отменённый заказ помечается статусом', () => {
  const parsed = parseWbResponse(
    wbSupplierOrdersSchema,
    [{ date: '2026-09-05T09:15:00Z', supplierArticle: 'A', nmId: 1, totalPrice: 100, isCancel: true, srid: 's' }],
    'supplierOrders',
  );
  assert.equal(normalizeSupplierOrder(parsed[0]!).status, 'cancelled');
});

test('отзыв склеивает текст, достоинства и недостатки', () => {
  const parsed = parseWbResponse(
    wbFeedbacksSchema,
    {
      data: {
        feedbacks: [
          {
            id: 'fb-1',
            text: 'Пришёл вовремя',
            pros: 'Вместительный',
            cons: 'Молния тугая',
            productValuation: 4,
            createdDate: '2026-09-04T18:00:00Z',
            userName: 'Иван',
            answer: null,
            productDetails: { nmId: 77291048, supplierArticle: 'BP-URBAN-01' },
          },
        ],
        countUnanswered: 1,
      },
    },
    'feedbacks',
  );

  const review = normalizeFeedback(parsed.data.feedbacks[0]!);
  assert.equal(review.externalId, 'fb-1');
  assert.equal(review.productExternalId, '77291048');
  assert.equal(review.rating, 4);
  assert.equal(review.answered, false);
  assert.match(review.text, /Пришёл вовремя/);
  assert.match(review.text, /Молния тугая/);
});

test('отзыв с ответом помечается отвеченным', () => {
  const parsed = parseWbResponse(
    wbFeedbacksSchema,
    {
      data: {
        feedbacks: [
          {
            id: 'fb-2',
            productValuation: 5,
            createdDate: '2026-09-04T18:00:00Z',
            answer: { text: 'Спасибо!' },
            productDetails: { nmId: 1 },
          },
        ],
      },
    },
    'feedbacks',
  );
  assert.equal(normalizeFeedback(parsed.data.feedbacks[0]!).answered, true);
});

test('расхождение формы даёт ошибку с именем поля', () => {
  assert.throws(
    () => parseWbResponse(wbCardsListSchema, { cards: [{ vendorCode: 'нет nmID' }] }, 'cardsList'),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /cardsList/);
      assert.match(error.message, /nmID/);
      return true;
    },
  );
});

test('курсор карточек кодируется и читается обратно', () => {
  const encoded = encodeCardCursor({ updatedAt: '2026-09-04T10:00:00Z', nmID: 77291048 });
  assert.ok(encoded);
  assert.deepEqual(decodeCardCursor(encoded), { updatedAt: '2026-09-04T10:00:00Z', nmID: 77291048 });
});

test('битый или пустой курсор игнорируется, а не роняет синхронизацию', () => {
  assert.equal(decodeCardCursor(undefined), undefined);
  assert.equal(decodeCardCursor('не-base64!!!'), undefined);
  assert.equal(decodeCardCursor(Buffer.from('{"a":1}').toString('base64url')), undefined);
  assert.equal(encodeCardCursor({}), undefined);
});
