/**
 * Схемы ответов Wildberries.
 *
 * ⚠️ Формы собраны по памяти о документации и НЕ подтверждены боевыми запросами.
 * Сверить вместе с путями из endpoints.ts — чек-лист в docs/INTEGRATION-WILDBERRIES.md.
 *
 * Почему zod, а не голый каст типа: при расхождении формы мы получаем громкую
 * ошибку с указанием поля, а не тихо уехавший `undefined`, который всплывёт
 * через неделю в виде нулевой выручки в отчёте. Незнакомые поля zod отбрасывает
 * молча — добавление полей на стороне WB нас не ломает.
 */
import { z } from 'zod';
import { ConnectorError } from '../../core/errors';

const SOURCE = 'wildberries';

/** Числа WB иногда приходят строками — приводим на границе. */
const numberish = z.union([z.number(), z.string().transform(Number)]).pipe(z.number());

// --- Карточки товаров: POST /content/v2/get/cards/list ----------------------

export const wbPhotoSchema = z
  .object({
    big: z.string().optional(),
    c516x688: z.string().optional(),
    c246x328: z.string().optional(),
    square: z.string().optional(),
  })
  .loose();

export const wbSkuSchema = z
  .object({
    chrtID: z.number().optional(),
    techSize: z.string().optional(),
    skus: z.array(z.string()).optional(),
  })
  .loose();

export const wbCardSchema = z
  .object({
    nmID: z.number(),
    imtID: z.number().optional(),
    vendorCode: z.string(),
    title: z.string().optional(),
    brand: z.string().optional(),
    subjectName: z.string().optional(),
    photos: z.array(wbPhotoSchema).optional(),
    sizes: z.array(wbSkuSchema).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .loose();

export const wbCardsListSchema = z.object({
  cards: z.array(wbCardSchema),
  cursor: z
    .object({
      updatedAt: z.string().optional(),
      nmID: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
});

// --- Цены: GET /api/v2/list/goods/filter ------------------------------------

export const wbGoodSizeSchema = z
  .object({
    sizeID: z.number().optional(),
    price: numberish.optional(),
    discountedPrice: numberish.optional(),
    techSizeName: z.string().optional(),
  })
  .loose();

export const wbGoodSchema = z
  .object({
    nmID: z.number(),
    vendorCode: z.string().optional(),
    sizes: z.array(wbGoodSizeSchema).optional(),
    currencyIsoCode4217: z.string().optional(),
    discount: numberish.optional(),
  })
  .loose();

export const wbGoodsFilterSchema = z.object({
  data: z.object({ listGoods: z.array(wbGoodSchema) }),
});

// --- Остатки FBO: GET /api/v1/supplier/stocks -------------------------------

export const wbSupplierStockSchema = z
  .object({
    lastChangeDate: z.string(),
    warehouseName: z.string(),
    supplierArticle: z.string(),
    nmId: z.number(),
    barcode: z.string().optional(),
    quantity: z.number(),
    quantityFull: z.number().optional(),
    inWayToClient: z.number().optional(),
    inWayFromClient: z.number().optional(),
    brand: z.string().optional(),
    subject: z.string().optional(),
    techSize: z.string().optional(),
  })
  .loose();

export const wbSupplierStocksSchema = z.array(wbSupplierStockSchema);

// --- Заказы: GET /api/v1/supplier/orders ------------------------------------

export const wbSupplierOrderSchema = z
  .object({
    date: z.string(),
    lastChangeDate: z.string().optional(),
    warehouseName: z.string().optional(),
    regionName: z.string().optional(),
    oblastOkrugName: z.string().optional(),
    countryName: z.string().optional(),
    supplierArticle: z.string(),
    nmId: z.number(),
    barcode: z.string().optional(),
    totalPrice: numberish,
    discountPercent: numberish.optional(),
    finishedPrice: numberish.optional(),
    priceWithDisc: numberish.optional(),
    isCancel: z.boolean().optional(),
    cancelDate: z.string().optional(),
    srid: z.string(),
    gNumber: z.string().optional(),
  })
  .loose();

export const wbSupplierOrdersSchema = z.array(wbSupplierOrderSchema);

// --- Отзывы: GET /api/v1/feedbacks ------------------------------------------

export const wbFeedbackSchema = z
  .object({
    id: z.string(),
    text: z.string().optional(),
    pros: z.string().optional(),
    cons: z.string().optional(),
    productValuation: z.number(),
    createdDate: z.string(),
    userName: z.string().optional(),
    answer: z.unknown().nullable().optional(),
    productDetails: z
      .object({
        nmId: z.number(),
        productName: z.string().optional(),
        supplierArticle: z.string().optional(),
      })
      .loose(),
  })
  .loose();

export const wbFeedbacksSchema = z.object({
  data: z.object({
    feedbacks: z.array(wbFeedbackSchema),
    countUnanswered: z.number().optional(),
    countArchive: z.number().optional(),
  }),
});

// --- Разбор -----------------------------------------------------------------

export type WbCard = z.infer<typeof wbCardSchema>;
export type WbGood = z.infer<typeof wbGoodSchema>;
export type WbSupplierStock = z.infer<typeof wbSupplierStockSchema>;
export type WbSupplierOrder = z.infer<typeof wbSupplierOrderSchema>;
export type WbFeedback = z.infer<typeof wbFeedbackSchema>;

/**
 * Разбирает ответ WB и падает с указанием конкретного поля.
 * Сообщение попадает в лог и в /api/platform/health — по нему сразу видно,
 * какая именно форма разошлась с документацией.
 */
export function parseWbResponse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details = result.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(корень)'}: ${issue.message}`)
    .join('; ');

  throw new ConnectorError(SOURCE, `Ответ WB не совпал с ожидаемой формой в ${operation}. ${details}`, {
    code: 'VALIDATION_ERROR',
    context: { operation, issues: result.error.issues.length },
  });
}
