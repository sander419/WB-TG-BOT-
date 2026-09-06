# 🚀 Ready-to-Deploy Modules for WB Analytics

Эта папка содержит готовые к внедрению модули и конфигурации для ускорения разработки и деплоя сервиса WB Analytics.

## 📦 Структура

```
ready-to-deploy/
├── .github/workflows/
│   └── ci-cd.yml            # CI/CD пайплайн (тесты, сборка, деплой)
├── config/
│   └── .env.example         # Шаблон переменных окружения
├── scripts/
│   ├── migrate-and-start.sh # Скрипт запуска с миграциями
│   └── seed-wb-data.ts      # Генератор тестовых данных
├── docs/
│   └── CHECKLIST.md         # Чек-лист пре-лаунча
├── utils/                   # БИБЛИОТЕКА ГОТОВЫХ МОДУЛЕЙ
│   ├── rate-limiter.ts      # Лимитер запросов (защита от DDoS)
│   ├── validator.ts         # Валидация запросов на Zod
│   ├── logger.ts            # Логирование с Winston
│   └── analytics.ts         # Готовые аналитические запросы к БД
├── docker-compose.prod.yml  # Production Docker конфигурация
└── README.md                # Этот файл
```

## 🚀 Быстрый старт

### Шаг 1: Установка зависимостей

```bash
npm install rate-limiter-flexible winston @faker-js/faker --save-dev
```

### Шаг 2: Внедрение утилит в проект

```bash
# Скопировать утилиты в исходный код
cp ready-to-deploy/utils/*.ts src/utils/

# Скопировать скрипты
cp ready-to-deploy/scripts/*.ts scripts/
cp ready-to-deploy/scripts/*.sh scripts/

# Настроить CI/CD
cp -r ready-to-deploy/.github ./.github

# Создать файл окружения
cp ready-to-deploy/config/.env.example config/.env
```

### Шаг 3: Настройка окружения

Отредактируйте `config/.env`:
- Добавьте Wildberries API токен
- Добавьте Telegram bot токен
- Настройте DATABASE_URL
- Укажите JWT секреты

### Шаг 4: Запуск с тестовыми данными

```bash
# Применить миграции
npm run db:migrate

# Сгенерировать реалистичные тестовые данные
npx tsx scripts/seed-wb-data.ts

# Запустить приложение
npm run dev
```

---

## 📚 Библиотека готовых модулей

### 1️⃣ Rate Limiter (`utils/rate-limiter.ts`)

**Назначение:** Защита API от злоупотреблений и DDoS атак.

**Зависимость:** `rate-limiter-flexible`

**Пример использования:**

```typescript
import { publicApiRateLimit, authRateLimit } from './utils/rate-limiter';

// Применить ко всем публичным endpoint'ам
app.use('/api', publicApiRateLimit);

// Применить к чувствительным операциям
app.post('/api/auth/login', authRateLimit, loginHandler);
app.post('/api/auth/register', authRateLimit, registerHandler);
```

**Готовые лимитеры:**
- `publicApiRateLimit` — 100 запросов/мин для обычного API
- `authRateLimit` — 5 запросов/мин для аутентификации
- `wbApiRateLimit` — 30 запросов/сек для WB API

**Преимущества:**
✅ Автоматические заголовки `X-RateLimit-*`  
✅ Гибкая настройка лимитов  
✅ Защита от brute-force  

---

### 2️⃣ Validator (`utils/validator.ts`)

**Назначение:** Валидация входящих запросов с автоматической генерацией ошибок.

**Зависимость:** `zod` (уже установлена)

**Пример использования:**

```typescript
import { validateBody, validateQuery, commonSchemas } from './utils/validator';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  price: z.number().positive('Цена должна быть положительной'),
  category: z.string().min(1, 'Категория обязательна'),
  discount: z.number().min(0).max(90).optional(),
});

app.post(
  '/api/products',
  validateBody(createProductSchema),
  createProductHandler
);

app.get(
  '/api/products',
  validateQuery(commonSchemas.pagination),
  getProductsHandler
);
```

**Готовые схемы (`commonSchemas`):**
- `pagination` — валидация page/limit
- `productId` — UUID товара
- `wbArticle` — артикул Wildberries
- `dateRange` — диапазон дат
- `createProduct` / `updateProduct` — CRUD товаров

**Преимущества:**
✅ Автоматическая типизация  
✅ Понятные ошибки для клиента  
✅ Переиспользуемые схемы  

---

### 3️⃣ Logger (`utils/logger.ts`)

**Назначение:** Централизованное логирование с разными форматами для dev/prod.

**Зависимость:** `winston`

**Пример использования:**

```typescript
import { apiLogger, wbApiLogger, httpLogger } from './utils/logger';

// Middleware для логирования всех HTTP запросов
app.use(httpLogger);

// Логирование в бизнес-логике
apiLogger.info('Product created', { productId: 123, userId: 456 });
wbApiLogger.error('WB API timeout', error, { endpoint: '/api/v3/orders' });
```

**Готовые логгеры:**
- `apiLogger` — для HTTP API
- `dbLogger` — для операций с БД
- `wbApiLogger` — для запросов к Wildberries
- `telegramLogger` — для бота
- `schedulerLogger` — для фоновых задач

**Форматы:**
- **Dev:** Цветной вывод с timestamp
- **Prod:** JSON формат для сбора логами

**Преимущества:**
✅ Разные уровни (debug, info, warn, error)  
✅ Контекстное логирование  
✅ Автоматический stack trace для ошибок  

---

### 4️⃣ Analytics (`utils/analytics.ts`)

**Назначение:** Готовые SQL-запросы для аналитики продаж.

**Зависимость:** Нет (использует Drizzle ORM проекта)

**Пример использования:**

```typescript
import { 
  getSalesMetrics, 
  getTopProducts, 
  getDailySales,
  getWarehouseStock
} from './utils/analytics';

// Общая сводка за месяц
const metrics = await getSalesMetrics(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
// Возвращает: { totalRevenue, totalOrders, averageOrderValue, totalItems }

// Топ-10 товаров по выручке
const topProducts = await getTopProducts(10);

// Ежедневная динамика
const dailySales = await getDailySales(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Остатки по складам
const stock = await getWarehouseStock();
```

**Готовые функции:**
| Функция | Описание |
|---------|----------|
| `getSalesMetrics()` | Выручка, заказы, средний чек |
| `getTopProducts()` | Топ товаров по выручке |
| `getDailySales()` | Динамика продаж по дням |
| `getWarehouseStock()` | Остатки по складам |
| `getLowStockProducts()` | Товары с низким остатком |
| `getCategorySales()` | Продажи по категориям |

**Преимущества:**
✅ Оптимизированные SQL запросы  
✅ Типизированные результаты  
✅ Готово к использованию в контроллерах  

---

### 5️⃣ Data Seeder (`scripts/seed-wb-data.ts`)

**Назначение:** Генерация реалистичных тестовых данных для разработки и демо.

**Зависимость:** `@faker-js/faker`

**Запуск:**
```bash
npx tsx scripts/seed-wb-data.ts
```

**Что генерирует:**
- 📦 **50 товаров** с названиями, категориями, брендами
- 📊 **30 дней истории продаж** (500-600 транзакций)
- 🏭 **Остатки на 5 складах** (Москва, СПб, Екатеринбург, Казань, Новосибирск)

**Преимущества:**
✅ Реалистичные данные (цены, рейтинги, отзывы)  
✅ Быстрое наполнение БД для тестов  
✅ Проверка аналитики на реальных объемах  

---

## 🔧 CI/CD Pipeline

Файл `.github/workflows/ci-cd.yml` автоматически:

1. **При Pull Request:**
   - Запускает линтер (`npm run lint`)
   - Запускает тесты (`npm run test`)
   - Проверяет типы TypeScript

2. **При мерже в `main`:**
   - Собирает Docker образ
   - Пушит образ в registry
   - Готов к деплою

---

## 📋 Чек-лист внедрения

### Базовая настройка
- [ ] Установить зависимости: `npm install rate-limiter-flexible winston @faker-js/faker --save-dev`
- [ ] Скопировать `utils/*.ts` в `src/utils/`
- [ ] Добавить экспорты в `src/utils/index.ts`

### Интеграция в код
- [ ] Добавить `httpLogger` middleware в `src/index.ts`
- [ ] Применить `publicApiRateLimit` к роутам
- [ ] Добавить `validateBody/Query` к обработчикам
- [ ] Использовать `getSalesMetrics` в контроллерах аналитики

### Тестирование
- [ ] Запустить `seed-wb-data.ts` для наполнения БД
- [ ] Проверить работу лимитеров (превысить лимит)
- [ ] Проверить валидацию (отправить некорректные данные)
- [ ] Проверить логи в консоли

### Production readiness
- [ ] Настроить CI/CD pipeline
- [ ] Заполнить `config/.env` боевыми токенами
- [ ] Пройти чек-лист из `docs/CHECKLIST.md`

---

## 🔒 Безопасность

Все модули следуют best practices:

| Модуль | Защита |
|--------|--------|
| Rate Limiter | Brute-force, DDoS |
| Validator | SQL injection, XSS |
| Logger | Не пишет пароли и токены |
| Analytics | Параметризованные запросы |

---

## 📊 Метрики производительности

| Модуль | Влияние на request | Рекомендация для прода |
|--------|-------------------|------------------------|
| Rate Limiter | +2-5ms | Использовать Redis |
| Validator | +1-3ms | Обязательно везде |
| Logger | +1-2ms | Асинхронная запись в файлы |
| Analytics | Зависит от запроса | Индексы в БД обязательны |

---

## 🎯 Следующие шаги

1. **Внедрить утилиты** в текущий код (1-2 часа)
2. **Запустить сидер** для тестирования аналитики (5 минут)
3. **Настроить CI/CD** для автоматизации (30 минут)
4. **Пройти чек-лист** перед деплоем (15 минут)

---

**🎉 Все модули готовы к внедрению!** 

Скопируйте нужные файлы и начните использовать сразу же.
