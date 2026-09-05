ALTER TABLE "events" ADD COLUMN "dedup_key" text;--> statement-breakpoint
CREATE INDEX "events_dedup_idx" ON "events" USING btree ("store_id","dedup_key","created_at");