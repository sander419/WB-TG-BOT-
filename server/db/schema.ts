/**
 * Схема БД (PostgreSQL + Drizzle).
 *
 * Принципы:
 *  - Multi-tenant: у каждой доменной таблицы есть organization_id. Ни один запрос
 *    не выполняется без фильтра по нему.
 *  - Деньги — целые минорные единицы (*_minor) + отдельная колонка валюты.
 *    Проект международный: RUB, CNY, USD в одной таблице.
 *  - Время — timestamptz, всегда UTC. Локальное время магазина считается по stores.timezone.
 *  - Секреты площадок лежат только в store_credentials в зашифрованном виде (AES-256-GCM).
 *  - raw jsonb хранит исходный ответ площадки: помогает при отладке нормализации
 *    и позволяет доставать поля, которые ещё не вынесли в колонки.
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const marketplaceEnum = pgEnum('marketplace', [
  'wildberries',
  'ozon',
  'shopify',
  '1688',
  'taobao',
  'jd',
]);

export const storeStatusEnum = pgEnum('store_status', ['pending', 'active', 'error', 'disabled']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'operator', 'viewer']);
export const syncStatusEnum = pgEnum('sync_status', ['queued', 'running', 'success', 'failed']);
export const eventSeverityEnum = pgEnum('event_severity', ['info', 'success', 'warning', 'error', 'decision']);
export const fulfillmentEnum = pgEnum('fulfillment', ['marketplace', 'seller']);
export const actionStatusEnum = pgEnum('action_status', ['pending', 'approved', 'rejected', 'executed', 'failed']);

const now = sql`now()`;

// --- Арендаторы и люди ------------------------------------------------------

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** Язык интерфейса по умолчанию для новых пользователей организации. */
  locale: text('locale').notNull().default('ru'),
  timezone: text('timezone').notNull().default('Europe/Moscow'),
  /** Валюта отчётности организации (ISO 4217). Витрины могут торговать в других. */
  baseCurrency: text('base_currency').notNull().default('RUB'),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Хранится в нижнем регистре: почта регистронезависима, а уникальный индекс — нет. */
    email: text('email').notNull(),
    name: text('name'),
    /** scrypt$N$r$p$salt$hash, см. server/core/password.ts. */
    passwordHash: text('password_hash'),
    locale: text('locale').notNull().default('ru'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [uniqueIndex('users_email_uniq').on(table.email)],
);

/**
 * Сессии. Не JWT: сессию в таблице можно отозвать — при смене пароля или
 * увольнении сотрудника. Отозвать выданный JWT без такой же таблицы нельзя.
 *
 * Хранится хеш токена, а не сам токен: дамп базы не должен давать возможность
 * войти под чужой сессией.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().default(now),
    /** Для страницы «активные сессии» и разбора инцидентов. */
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [
    uniqueIndex('sessions_token_uniq').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
    index('sessions_expiry_idx').on(table.expiresAt),
  ],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('operator'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [uniqueIndex('memberships_org_user_uniq').on(table.organizationId, table.userId)],
);

// --- Магазины и доступы -----------------------------------------------------

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    marketplace: marketplaceEnum('marketplace').notNull(),
    name: text('name').notNull(),
    /** Идентификатор продавца на стороне площадки, если она его отдаёт. */
    externalSellerId: text('external_seller_id'),
    currency: text('currency').notNull().default('RUB'),
    timezone: text('timezone').notNull().default('Europe/Moscow'),
    status: storeStatusEnum('status').notNull().default('pending'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [index('stores_org_idx').on(table.organizationId)],
);

/**
 * Учётные данные площадки. Отдельная таблица, а не колонка в stores:
 * права на чтение store есть у всех ролей, а на credentials — только у сервисного слоя.
 */
export const storeCredentials = pgTable(
  'store_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    /** Шифротекст в формате v1:iv:tag:data, см. server/core/crypto.ts. */
    encryptedApiKey: text('encrypted_api_key').notNull(),
    /** Площадко-специфичные поля (Ozon Client-Id, домен Shopify) — тоже зашифрованы. */
    encryptedExtra: text('encrypted_extra'),
    /** Категории доступа токена по данным площадки. */
    scopes: jsonb('scopes').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    lastCheckOk: boolean('last_check_ok'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [uniqueIndex('store_credentials_store_uniq').on(table.storeId)],
);

// --- Каталог и операционные данные -----------------------------------------

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    sellerSku: text('seller_sku').notNull(),
    barcode: text('barcode'),
    title: text('title').notNull(),
    brand: text('brand'),
    category: text('category'),
    url: text('url'),
    imageUrls: jsonb('image_urls').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    currency: text('currency').notNull(),
    priceMinor: integer('price_minor'),
    discountedPriceMinor: integer('discounted_price_minor'),
    /** Себестоимость: вводится продавцом, нужна для маржи и ценового пола. */
    costMinor: integer('cost_minor'),
    rating: real('rating'),
    reviewCount: integer('review_count'),
    raw: jsonb('raw'),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [
    uniqueIndex('products_store_external_uniq').on(table.storeId, table.externalId),
    index('products_org_idx').on(table.organizationId),
    index('products_sku_idx').on(table.storeId, table.sellerSku),
  ],
);

export const stockSnapshots = pgTable(
  'stock_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    externalId: text('external_id').notNull(),
    warehouseId: text('warehouse_id').notNull(),
    warehouseName: text('warehouse_name'),
    quantity: integer('quantity').notNull(),
    fulfillment: fulfillmentEnum('fulfillment').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [index('stock_snapshots_store_time_idx').on(table.storeId, table.capturedAt)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    status: text('status').notNull(),
    currency: text('currency').notNull(),
    totalMinor: integer('total_minor').notNull(),
    destinationRegion: text('destination_region'),
    orderedAt: timestamp('ordered_at', { withTimezone: true }).notNull(),
    raw: jsonb('raw'),
  },
  (table) => [
    uniqueIndex('orders_store_external_uniq').on(table.storeId, table.externalId),
    index('orders_store_time_idx').on(table.storeId, table.orderedAt),
  ],
);

export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    externalId: text('external_id').notNull(),
    sellerSku: text('seller_sku').notNull(),
    quantity: integer('quantity').notNull(),
    currency: text('currency').notNull(),
    priceMinor: integer('price_minor').notNull(),
    commissionMinor: integer('commission_minor'),
  },
  (table) => [index('order_lines_order_idx').on(table.orderId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    externalId: text('external_id').notNull(),
    rating: integer('rating').notNull(),
    text: text('text').notNull(),
    authorName: text('author_name'),
    answered: boolean('answered').notNull().default(false),
    /** Черновик ответа от AI до отправки на площадку. */
    draftReply: text('draft_reply'),
    createdAtExternal: timestamp('created_at_external', { withTimezone: true }).notNull(),
    raw: jsonb('raw'),
  },
  (table) => [
    uniqueIndex('reviews_store_external_uniq').on(table.storeId, table.externalId),
    index('reviews_store_time_idx').on(table.storeId, table.createdAtExternal),
  ],
);

export const searchPositions = pgTable(
  'search_positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
    keyword: text('keyword').notNull(),
    /** null — товар не найден в выдаче по этому запросу. */
    position: integer('position'),
    frequency: integer('frequency'),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [index('search_positions_lookup_idx').on(table.storeId, table.keyword, table.checkedAt)],
);

// --- Синхронизация, события, действия --------------------------------------

export const syncJobs = pgTable(
  'sync_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    /** products | stocks | orders | reviews | search_positions | advertising */
    module: text('module').notNull(),
    status: syncStatusEnum('status').notNull().default('queued'),
    itemsProcessed: integer('items_processed').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [index('sync_jobs_store_module_idx').on(table.storeId, table.module, table.createdAt)],
);

/** Поток событий оркестратора: то, что фронтенд сейчас рисует из eventStreamEngine. */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    severity: eventSeverityEnum('severity').notNull().default('info'),
    title: text('title').notNull(),
    /**
     * Ключ подавления повторов для алертов: по нему проверяется, не отправляли ли
     * мы это же самое час назад. Одна и та же проблема, приходящая каждые полчаса,
     * заканчивается отключёнными уведомлениями и пропущенной настоящей бедой.
     */
    dedupKey: text('dedup_key'),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [
    index('events_org_time_idx').on(table.organizationId, table.createdAt),
    index('events_dedup_idx').on(table.storeId, table.dedupKey, table.createdAt),
  ],
);

/**
 * Журнал действий, меняющих данные в маркетплейсе.
 * Пишется ДО вызова API и обновляется после — иначе при падении процесса
 * останется изменённая цена без следа о том, кто её поставил.
 */
export const actionAudit = pgTable(
  'action_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    /** Кто инициировал: пользователь или автоматическое правило. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    ruleId: uuid('rule_id'),
    /** price_update | stock_update | review_reply | content_update */
    action: text('action').notNull(),
    status: actionStatusEnum('status').notNull().default('pending'),
    dryRun: boolean('dry_run').notNull().default(true),
    /** Значения до изменения — основа для отката. */
    before: jsonb('before'),
    after: jsonb('after'),
    result: jsonb('result'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().default(now),
    executedAt: timestamp('executed_at', { withTimezone: true }),
  },
  (table) => [index('action_audit_store_time_idx').on(table.storeId, table.requestedAt)],
);

// --- Telegram ---------------------------------------------------------------

export const telegramAccounts = pgTable(
  'telegram_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Telegram user id не влезает в int32. */
    telegramUserId: bigint('telegram_user_id', { mode: 'bigint' }).notNull(),
    chatId: bigint('chat_id', { mode: 'bigint' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    activeStoreId: uuid('active_store_id').references(() => stores.id, { onDelete: 'set null' }),
    locale: text('locale').notNull().default('ru'),
    alertsEnabled: boolean('alerts_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
  },
  (table) => [uniqueIndex('telegram_accounts_user_uniq').on(table.telegramUserId)],
);

/** Одноразовые коды привязки Telegram к организации, выдаются в веб-интерфейсе. */
export const telegramLinkCodes = pgTable(
  'telegram_link_codes',
  {
    code: text('code').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [index('telegram_link_codes_expiry_idx').on(table.expiresAt)],
);

export const schema = {
  organizations,
  users,
  sessions,
  memberships,
  stores,
  storeCredentials,
  products,
  stockSnapshots,
  orders,
  orderLines,
  reviews,
  searchPositions,
  syncJobs,
  events,
  actionAudit,
  telegramAccounts,
  telegramLinkCodes,
};
