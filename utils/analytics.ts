import { db } from '../src/db';
import { products, sales, stocks } from '../src/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

/**
 * Аналитические запросы для Wildberries данных
 * Готовые функции для получения метрик и отчетов
 */

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItems: number;
}

export interface ProductAnalytics {
  productId: number;
  name: string;
  article: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  avgPrice: number;
  rating: number;
  reviews: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
  items: number;
}

export interface WarehouseStock {
  warehouse: string;
  totalQuantity: number;
  totalReserved: number;
  availableQuantity: number;
  productsCount: number;
}

/**
 * Получить общую сводку по продажам за период
 */
export async function getSalesMetrics(fromDate: Date, toDate: Date): Promise<SalesMetrics> {
  const result = await db
    .select({
      totalRevenue: sql<number>`SUM(${sales.price} * ${sales.quantity} * (1 - ${sales.discount} / 100.0))`.mapWith(Number),
      totalOrders: sql<number>`COUNT(DISTINCT ${sales.id})`.mapWith(Number),
      totalItems: sql<number>`SUM(${sales.quantity})`.mapWith(Number),
    })
    .from(sales)
    .where(
      and(
        gte(sales.saleDate, fromDate),
        lte(sales.saleDate, toDate)
      )
    );

  const data = result[0];
  const totalRevenue = data.totalRevenue || 0;
  const totalOrders = data.totalOrders || 0;
  const totalItems = data.totalItems || 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalItems,
  };
}

/**
 * Получить топ товаров по выручке
 */
export async function getTopProducts(limit: number = 10, fromDate?: Date, toDate?: Date): Promise<ProductAnalytics[]> {
  const dateFilter = fromDate && toDate 
    ? and(gte(sales.saleDate, fromDate), lte(sales.saleDate, toDate))
    : undefined;

  const result = await db
    .select({
      productId: products.id,
      name: products.name,
      article: products.wbArticle,
      revenue: sql<number>`SUM(${sales.price} * ${sales.quantity} * (1 - ${sales.discount} / 100.0))`.mapWith(Number),
      orders: sql<number>`COUNT(${sales.id})`.mapWith(Number),
      itemsSold: sql<number>`SUM(${sales.quantity})`.mapWith(Number),
      avgPrice: sql<number>`AVG(${sales.price})`.mapWith(Number),
      rating: products.rating,
      reviews: products.reviews,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .where(dateFilter)
    .groupBy(products.id, products.name, products.wbArticle, products.rating, products.reviews)
    .orderBy(desc(sql`revenue`))
    .limit(limit);

  return result.map(row => ({
    productId: row.productId!,
    name: row.name || 'Unknown',
    article: row.article || '',
    revenue: row.revenue || 0,
    orders: row.orders || 0,
    itemsSold: row.itemsSold || 0,
    avgPrice: row.avgPrice || 0,
    rating: row.rating || 0,
    reviews: row.reviews || 0,
  }));
}

/**
 * Получить ежедневные продажи за период
 */
export async function getDailySales(fromDate: Date, toDate: Date): Promise<DailySales[]> {
  const result = await db
    .select({
      date: sql<string>`DATE(${sales.saleDate})`,
      revenue: sql<number>`SUM(${sales.price} * ${sales.quantity} * (1 - ${sales.discount} / 100.0))`.mapWith(Number),
      orders: sql<number>`COUNT(${sales.id})`.mapWith(Number),
      items: sql<number>`SUM(${sales.quantity})`.mapWith(Number),
    })
    .from(sales)
    .where(
      and(
        gte(sales.saleDate, fromDate),
        lte(sales.saleDate, toDate)
      )
    )
    .groupBy(sql`DATE(${sales.saleDate})`)
    .orderBy(sql`DATE(${sales.saleDate})`);

  return result.map(row => ({
    date: row.date,
    revenue: row.revenue || 0,
    orders: row.orders || 0,
    items: row.items || 0,
  }));
}

/**
 * Получить остатки по складам
 */
export async function getWarehouseStock(): Promise<WarehouseStock[]> {
  const result = await db
    .select({
      warehouse: stocks.warehouse,
      totalQuantity: sql<number>`SUM(${stocks.quantity})`.mapWith(Number),
      totalReserved: sql<number>`SUM(${stocks.reserved})`.mapWith(Number),
      availableQuantity: sql<number>`SUM(${stocks.quantity} - ${stocks.reserved})`.mapWith(Number),
      productsCount: sql<number>`COUNT(DISTINCT ${stocks.productId})`.mapWith(Number),
    })
    .from(stocks)
    .groupBy(stocks.warehouse);

  return result.map(row => ({
    warehouse: row.warehouse,
    totalQuantity: row.totalQuantity || 0,
    totalReserved: row.totalReserved || 0,
    availableQuantity: row.availableQuantity || 0,
    productsCount: row.productsCount || 0,
  }));
}

/**
 * Получить товары с низким остатком
 */
export async function getLowStockProducts(threshold: number = 10) {
  const result = await db
    .select({
      productId: products.id,
      name: products.name,
      article: products.wbArticle,
      warehouse: stocks.warehouse,
      quantity: stocks.quantity,
      reserved: stocks.reserved,
    })
    .from(stocks)
    .leftJoin(products, eq(stocks.productId, products.id))
    .where(lte(stocks.quantity, threshold))
    .orderBy(stocks.quantity);

  return result;
}

/**
 * Получить динамику продаж по категориям
 */
export async function getCategorySales(fromDate: Date, toDate: Date) {
  const result = await db
    .select({
      category: products.category,
      revenue: sql<number>`SUM(${sales.price} * ${sales.quantity} * (1 - ${sales.discount} / 100.0))`.mapWith(Number),
      orders: sql<number>`COUNT(${sales.id})`.mapWith(Number),
      itemsSold: sql<number>`SUM(${sales.quantity})`.mapWith(Number),
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .where(
      and(
        gte(sales.saleDate, fromDate),
        lte(sales.saleDate, toDate)
      )
    )
    .groupBy(products.category)
    .orderBy(desc(sql`revenue`));

  return result;
}

/**
 * Рассчитать конверсию (просмотры -> заказы)
 * Требует наличия таблицы просмотров (можно добавить в будущем)
 */
export async function calculateConversionRate(fromDate: Date, toDate: Date) {
  // Заглушка для будущей реализации
  // Конверсия = (Заказы / Просмотры) * 100
  return {
    conversionRate: 0,
    totalViews: 0,
    totalOrders: 0,
  };
}
