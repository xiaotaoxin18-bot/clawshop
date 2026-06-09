-- Migration: 抖店数据接入 - 新增字段和表

-- 1. product 表新增抖店相关字段
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "douyin_product_id" varchar(100);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "douyin_sku_id" varchar(100);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sale_price" double precision DEFAULT 0;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "spec" varchar(255);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "platform_status" varchar(20);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sales_count" integer DEFAULT 0;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "platform_category" varchar(100);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamptz;

CREATE INDEX IF NOT EXISTS "idx_product_douyin_product_id" ON "product" USING btree ("douyin_product_id" text_ops);

--> statement-breakpoint

-- 2. 抖店订单同步表
CREATE TABLE IF NOT EXISTS "douyin_order_sync" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_id" varchar(100) NOT NULL,
    "order_status" varchar(50) NOT NULL,
    "product_name" varchar(255),
    "product_id" uuid,
    "quantity" integer DEFAULT 0,
    "total_amount" double precision DEFAULT 0,
    "sku_spec" varchar(255),
    "receiver_name" varchar(100),
    "receiver_phone" varchar(50),
    "receiver_address" text,
    "logistics_company" varchar(100),
    "logistics_no" varchar(100),
    "sync_status" varchar(20) DEFAULT 'pending',
    "sync_message" text,
    "order_time" timestamptz,
    "sync_at" timestamptz,
    "_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "_created_by" "user_profile",
    "_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "_updated_by" "user_profile",
    CONSTRAINT "douyin_order_sync_order_id_unique" UNIQUE ("order_id")
);
--> statement-breakpoint
ALTER TABLE "douyin_order_sync" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_douyin_order_sync_order_id" ON "douyin_order_sync" USING btree ("order_id" text_ops);
CREATE INDEX IF NOT EXISTS "idx_douyin_order_sync_status" ON "douyin_order_sync" USING btree ("sync_status" text_ops);
CREATE INDEX IF NOT EXISTS "idx_douyin_order_sync_product_id" ON "douyin_order_sync" USING btree ("product_id" uuid_ops);
--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "douyin_order_sync" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";
CREATE POLICY "修改全部数据" ON "douyin_order_sync" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";
CREATE POLICY "service_role_bypass_policy" ON "douyin_order_sync" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";

--> statement-breakpoint

-- 3. 同步操作日志表
CREATE TABLE IF NOT EXISTS "douyin_sync_log" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "sync_type" varchar(20) NOT NULL,
    "sync_action" varchar(50) NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'success',
    "message" text,
    "detail" jsonb,
    "source" varchar(20) DEFAULT 'webhook',
    "_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "_created_by" "user_profile",
    "_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "douyin_sync_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_douyin_sync_log_type" ON "douyin_sync_log" USING btree ("sync_type" text_ops);
CREATE INDEX IF NOT EXISTS "idx_douyin_sync_log_status" ON "douyin_sync_log" USING btree ("status" text_ops);
CREATE INDEX IF NOT EXISTS "idx_douyin_sync_log_created" ON "douyin_sync_log" USING btree ("_created_at");
--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "douyin_sync_log" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";
CREATE POLICY "修改全部数据" ON "douyin_sync_log" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";
CREATE POLICY "service_role_bypass_policy" ON "douyin_sync_log" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";

--> statement-breakpoint

-- 4. 抖店配置表（凭证、Webhook Secret 等）
CREATE TABLE IF NOT EXISTS "douyin_config" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "config_key" varchar(100) NOT NULL,
    "config_value" text NOT NULL,
    "description" text,
    "_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "_created_by" "user_profile",
    "_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "_updated_by" "user_profile",
    CONSTRAINT "douyin_config_config_key_unique" UNIQUE ("config_key")
);
--> statement-breakpoint
ALTER TABLE "douyin_config" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_douyin_config_key" ON "douyin_config" USING btree ("config_key" text_ops);
--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "douyin_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";
CREATE POLICY "修改全部数据" ON "douyin_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";
CREATE POLICY "service_role_bypass_policy" ON "douyin_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";
