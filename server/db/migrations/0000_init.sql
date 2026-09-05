CREATE TYPE "public"."action_status" AS ENUM('pending', 'approved', 'rejected', 'executed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."event_severity" AS ENUM('info', 'success', 'warning', 'error', 'decision');--> statement-breakpoint
CREATE TYPE "public"."fulfillment" AS ENUM('marketplace', 'seller');--> statement-breakpoint
CREATE TYPE "public"."marketplace" AS ENUM('wildberries', 'ozon', 'shopify', '1688', 'taobao', 'jd');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."store_status" AS ENUM('pending', 'active', 'error', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('queued', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "action_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid,
	"rule_id" uuid,
	"action" text NOT NULL,
	"status" "action_status" DEFAULT 'pending' NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"result" jsonb,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid,
	"type" text NOT NULL,
	"severity" "event_severity" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'operator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"external_id" text NOT NULL,
	"seller_sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"currency" text NOT NULL,
	"price_minor" integer NOT NULL,
	"commission_minor" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"total_minor" integer NOT NULL,
	"destination_region" text,
	"ordered_at" timestamp with time zone NOT NULL,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"locale" text DEFAULT 'ru' NOT NULL,
	"timezone" text DEFAULT 'Europe/Moscow' NOT NULL,
	"base_currency" text DEFAULT 'RUB' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"seller_sku" text NOT NULL,
	"barcode" text,
	"title" text NOT NULL,
	"brand" text,
	"category" text,
	"url" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency" text NOT NULL,
	"price_minor" integer,
	"discounted_price_minor" integer,
	"cost_minor" integer,
	"rating" real,
	"review_count" integer,
	"raw" jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid,
	"external_id" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text NOT NULL,
	"author_name" text,
	"answered" boolean DEFAULT false NOT NULL,
	"draft_reply" text,
	"created_at_external" timestamp with time zone NOT NULL,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "search_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid,
	"keyword" text NOT NULL,
	"position" integer,
	"frequency" integer,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid,
	"external_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"warehouse_name" text,
	"quantity" integer NOT NULL,
	"fulfillment" "fulfillment" NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"encrypted_extra" text,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_check_ok" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"marketplace" "marketplace" NOT NULL,
	"name" text NOT NULL,
	"external_seller_id" text,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"timezone" text DEFAULT 'Europe/Moscow' NOT NULL,
	"status" "store_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"module" text NOT NULL,
	"status" "sync_status" DEFAULT 'queued' NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"chat_id" bigint NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"active_store_id" uuid,
	"locale" text DEFAULT 'ru' NOT NULL,
	"alerts_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid,
	"created_by_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"locale" text DEFAULT 'ru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_audit" ADD CONSTRAINT "action_audit_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_audit" ADD CONSTRAINT "action_audit_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_audit" ADD CONSTRAINT "action_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_positions" ADD CONSTRAINT "search_positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_positions" ADD CONSTRAINT "search_positions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_positions" ADD CONSTRAINT "search_positions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credentials" ADD CONSTRAINT "store_credentials_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_accounts" ADD CONSTRAINT "telegram_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_accounts" ADD CONSTRAINT "telegram_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_accounts" ADD CONSTRAINT "telegram_accounts_active_store_id_stores_id_fk" FOREIGN KEY ("active_store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_audit_store_time_idx" ON "action_audit" USING btree ("store_id","requested_at");--> statement-breakpoint
CREATE INDEX "events_org_time_idx" ON "events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_uniq" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "order_lines_order_idx" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_store_external_uniq" ON "orders" USING btree ("store_id","external_id");--> statement-breakpoint
CREATE INDEX "orders_store_time_idx" ON "orders" USING btree ("store_id","ordered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_store_external_uniq" ON "products" USING btree ("store_id","external_id");--> statement-breakpoint
CREATE INDEX "products_org_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("store_id","seller_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_store_external_uniq" ON "reviews" USING btree ("store_id","external_id");--> statement-breakpoint
CREATE INDEX "reviews_store_time_idx" ON "reviews" USING btree ("store_id","created_at_external");--> statement-breakpoint
CREATE INDEX "search_positions_lookup_idx" ON "search_positions" USING btree ("store_id","keyword","checked_at");--> statement-breakpoint
CREATE INDEX "stock_snapshots_store_time_idx" ON "stock_snapshots" USING btree ("store_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "store_credentials_store_uniq" ON "store_credentials" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "stores_org_idx" ON "stores" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sync_jobs_store_module_idx" ON "sync_jobs" USING btree ("store_id","module","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_accounts_user_uniq" ON "telegram_accounts" USING btree ("telegram_user_id");--> statement-breakpoint
CREATE INDEX "telegram_link_codes_expiry_idx" ON "telegram_link_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uniq" ON "users" USING btree ("email");