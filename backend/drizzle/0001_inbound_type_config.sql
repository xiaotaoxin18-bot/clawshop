CREATE TABLE "inbound_type_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "inbound_type_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alert_record" ADD COLUMN "shop_id" varchar(100) DEFAULT '';--> statement-breakpoint
ALTER TABLE "inbound_record" ADD COLUMN "shop_id" varchar(100) DEFAULT '';--> statement-breakpoint
ALTER TABLE "outbound_record" ADD COLUMN "shop_id" varchar(100) DEFAULT '';--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "douyin_product_id" varchar(100);--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "douyin_sku_id" varchar(100);--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "sale_price" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "spec" varchar(255);--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "platform_status" varchar(20);--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "sales_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "platform_category" varchar(100);--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "last_sync_at" timestamptz;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "shop_id" varchar(100) DEFAULT '';--> statement-breakpoint
CREATE INDEX "idx_inbound_type_code" ON "inbound_type_config" USING btree ("code" text_ops);--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "inbound_type_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "inbound_type_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "inbound_type_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";