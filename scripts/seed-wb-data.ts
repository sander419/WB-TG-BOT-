#!/usr/bin/env node
/**
 * Wildberries Data Seeder
 * Генерирует реалистичные тестовые данные для аналитики
 * Использование: npx tsx scripts/seed-wb-data.ts
 */

import { db } from '../src/db';
import { products, sales, stocks } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

const CATEGORIES = [
  'Одежда', 'Обувь', 'Дом и сад', 'Красота', 'Детские товары',
  'Электроника', 'Спорт', 'Авто', 'Книги', 'Зоотовары'
];

const BRANDS = [
  'Fashion Style', 'Home Comfort', 'Tech Pro', 'Baby Care',
  'Sport Life', 'Auto Master', 'Beauty Secret', 'Eco Home'
];

function generateBarcode() {
  return faker.string.numeric(13);
}

function generatePrice(category: string) {
  const basePrices: Record<string, number> = {
    'Одежда': 1500, 'Обувь': 3000, 'Дом и сад': 2000,
    'Красота': 800, 'Детские товары': 1200, 'Электроника': 5000,
    'Спорт': 2500, 'Авто': 1800, 'Книги': 500, 'Зоотовары': 900
  };
  const base = basePrices[category] || 1000;
  return Math.round(base * (0.5 + Math.random() * 2));
}

async function seedProducts(count: number = 50) {
  console.log(`📦 Генерация ${count} товаров...`);
  
  const productsData = [];
  for (let i = 0; i < count; i++) {
    const category = faker.helpers.arrayElement(CATEGORIES);
    const brand = faker.helpers.arrayElement(BRANDS);
    const productName = faker.commerce.productName();
    
    productsData.push({
      wbArticle: faker.string.numeric(8),
      barcode: generateBarcode(),
      name: `${brand} ${productName}`,
      category,
      brand,
      price: generatePrice(category),
      discount: Math.floor(Math.random() * 40),
      rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      reviews: faker.number.int({ min: 0, max: 500 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Очистка перед вставкой (для дев-среды)
  await db.delete(products);
  
  const inserted = await db.insert(products).values(productsData).returning();
  console.log(`✅ Добавлено ${inserted.length} товаров`);
  return inserted;
}

async function seedSales(productsList: any[], days: number = 30) {
  console.log(`📊 Генерация продаж за ${days} дней...`);
  
  const salesData = [];
  const now = new Date();
  
  for (let day = 0; day < days; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Каждый день продаем случайное количество товаров
    const salesCount = faker.number.int({ min: 5, max: 20 });
    
    for (let i = 0; i < salesCount; i++) {
      const product = faker.helpers.arrayElement(productsList);
      const quantity = faker.number.int({ min: 1, max: 5 });
      
      salesData.push({
        productId: product.id,
        wbArticle: product.wbArticle,
        quantity,
        price: product.price,
        discount: product.discount,
        warehouse: faker.helpers.arrayElement(['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Казань']),
        saleDate: date,
        createdAt: new Date(),
      });
    }
  }

  await db.delete(sales);
  const inserted = await db.insert(sales).values(salesData).returning();
  console.log(`✅ Добавлено ${inserted.length} записей о продажах`);
  return inserted;
}

async function seedStocks(productsList: any[]) {
  console.log('📦 Генерация остатков...');
  
  const warehouses = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Казань', 'Новосибирск'];
  const stocksData = [];
  
  for (const product of productsList) {
    for (const warehouse of warehouses) {
      const quantity = faker.number.int({ min: 0, max: 200 });
      if (quantity > 0) {
        stocksData.push({
          productId: product.id,
          wbArticle: product.wbArticle,
          warehouse,
          quantity,
          reserved: faker.number.int({ min: 0, max: Math.min(10, quantity) }),
          updatedAt: new Date(),
        });
      }
    }
  }

  await db.delete(stocks);
  const inserted = await db.insert(stocks).values(stocksData).returning();
  console.log(`✅ Добавлено ${inserted.length} записей об остатках`);
  return inserted;
}

async function main() {
  console.log('🚀 Запуск сидера данных Wildberries...\n');
  
  try {
    const productsList = await seedProducts(50);
    await seedSales(productsList, 30);
    await seedStocks(productsList);
    
    console.log('\n✨ Сидер завершил работу успешно!');
    console.log('💡 Теперь можно тестировать аналитику с реальными данными');
  } catch (error) {
    console.error('❌ Ошибка при сиде:', error);
    process.exit(1);
  }
}

main();
