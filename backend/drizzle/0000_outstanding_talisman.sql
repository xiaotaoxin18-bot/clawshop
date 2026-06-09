CREATE TABLE "alert_record" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"alert_type" varchar(20) NOT NULL,
	"current_stock" integer DEFAULT 0,
	"safety_stock" integer DEFAULT 0,
	"short_amount" integer DEFAULT 0,
	"is_read" boolean DEFAULT false,
	"is_handled" boolean DEFAULT false,
	"handled_at" timestamptz,
	"sellable_days" double precision,
	"sellable_status" varchar(20),
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile",
	CONSTRAINT "alert_record_alert_type_check" CHECK ((alert_type)::text = ANY (ARRAY[('emergency'::character varying)::text, ('overstock'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "alert_record" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "automation_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "automation_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_inventory_stats" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"stat_date" date NOT NULL,
	"total_stock_value" double precision DEFAULT 0,
	"total_inbound_quantity" integer DEFAULT 0,
	"total_outbound_quantity" integer DEFAULT 0,
	"alert_count" integer DEFAULT 0,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "daily_inventory_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"smtp_host" varchar(255) NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_user" varchar(255) NOT NULL,
	"smtp_pass" varchar(255) NOT NULL,
	"from_name" varchar(255),
	"from_email" varchar(255),
	"is_ssl" boolean DEFAULT true,
	"is_enabled" boolean DEFAULT true,
	"to_emails" varchar(255)[] DEFAULT '{""}',
	"reminder_interval" integer DEFAULT 60,
	"reminder_types" varchar(50)[] DEFAULT '{"inventory_alert","issue_alert"}',
	"daily_digest_time" varchar(10) DEFAULT '09:00',
	"daily_digest_enabled" boolean DEFAULT false,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "email_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inbound_record" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"operator" varchar(255) NOT NULL,
	"attachments" "file_attachment"[],
	"warehouse" varchar(255),
	"remark" text,
	"order_no" varchar(50),
	"items" jsonb DEFAULT '[]'::jsonb,
	"in_type" varchar(255) DEFAULT 'tear_order',
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "inbound_record" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "issue_field_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"field_type" varchar(50) DEFAULT 'text' NOT NULL,
	"is_required" boolean DEFAULT false,
	"is_enabled" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"options" jsonb,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "issue_field_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "issue_record" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"issue_type_id" uuid NOT NULL,
	"tracking_no" varchar(255),
	"order_no" varchar(255),
	"product_name" varchar(255),
	"description" text,
	"status" varchar(50) DEFAULT 'pending',
	"priority" varchar(50) DEFAULT 'medium',
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"attachments" "file_attachment"[],
	"handler" varchar(255),
	"resolved_at" timestamptz,
	"resolution_note" text,
	"warehouse" varchar(255),
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "issue_record" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "issue_type_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "issue_type_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" "user_profile",
	"notification_enabled" boolean DEFAULT false,
	"auto_email_enabled" boolean DEFAULT false,
	"email_provider" varchar(20) DEFAULT 'smtp',
	"emailjs_config" jsonb,
	"smtp_config" jsonb,
	"feishu_config" jsonb,
	"app_state" jsonb,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_number" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"order_type" varchar(20) NOT NULL,
	"reference_id" uuid,
	"created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "order_number" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oss_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" "user_profile",
	"enabled" boolean DEFAULT false,
	"endpoint" varchar(500),
	"region" varchar(100) DEFAULT 'oss-cn-hangzhou',
	"bucket_name" varchar(255),
	"custom_domain" varchar(500),
	"access_key_id" varchar(255),
	"access_key_secret" varchar(255),
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "oss_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outbound_record" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"operator" varchar(255) NOT NULL,
	"attachments" "file_attachment"[],
	"warehouse" varchar(255),
	"remark" text,
	"order_no" varchar(50),
	"items" jsonb DEFAULT '[]'::jsonb,
	"outbound_type" varchar(20) DEFAULT 'sale',
	"out_type" varchar(255) DEFAULT 'sales',
	"source_warehouse" varchar(255),
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "outbound_record" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"cost_price" double precision DEFAULT 0,
	"current_stock" integer DEFAULT 0,
	"safety_stock" integer DEFAULT 0,
	"image_attachment" "file_attachment",
	"category" varchar(100),
	"sellable_days" double precision,
	"sellable_status" varchar(20),
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "product" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "system_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"address" text,
	"manager" varchar(255),
	"phone" varchar(255),
	"remark" text,
	"is_default" boolean DEFAULT false,
	"_created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" "user_profile",
	"_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" "user_profile"
);
--> statement-breakpoint
ALTER TABLE "warehouse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alert_record" ADD CONSTRAINT "alert_record_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_record" ADD CONSTRAINT "issue_record_issue_type_id_fkey" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_type_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alert_is_read" ON "alert_record" USING btree ("is_read" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_product_id" ON "alert_record" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_alert_type" ON "alert_record" USING btree ("alert_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_automation_config_key" ON "automation_config" USING btree ("config_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_daily_stats_date" ON "daily_inventory_stats" USING btree ("stat_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_inbound_in_type" ON "inbound_record" USING btree ("in_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_inbound_order_no" ON "inbound_record" USING btree ("order_no" text_ops);--> statement-breakpoint
CREATE INDEX "idx_inbound_product_id" ON "inbound_record" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_field_config_enabled" ON "issue_field_config" USING btree ("is_enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_field_config_sort" ON "issue_field_config" USING btree ("sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_record_order" ON "issue_record" USING btree ("order_no" text_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_record_status" ON "issue_record" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_record_tracking" ON "issue_record" USING btree ("tracking_no" text_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_record_type" ON "issue_record" USING btree ("issue_type_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_type_config_enabled" ON "issue_type_config" USING btree ("is_enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_issue_type_config_sort" ON "issue_type_config" USING btree ("sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_notification_settings_user_id" ON "notification_settings" USING btree ("user_id" record_ops);--> statement-breakpoint
CREATE INDEX "idx_order_number_no" ON "order_number" USING btree ("order_no" text_ops);--> statement-breakpoint
CREATE INDEX "idx_order_number_type" ON "order_number" USING btree ("order_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_oss_config_user_id" ON "oss_config" USING btree ("user_id" record_ops);--> statement-breakpoint
CREATE INDEX "idx_outbound_items_gin" ON "outbound_record" USING gin ("items" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_outbound_order_no" ON "outbound_record" USING btree ("order_no" text_ops);--> statement-breakpoint
CREATE INDEX "idx_outbound_out_type" ON "outbound_record" USING btree ("out_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_outbound_product_id" ON "outbound_record" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_outbound_source_warehouse" ON "outbound_record" USING btree ("source_warehouse" text_ops);--> statement-breakpoint
CREATE INDEX "idx_outbound_type" ON "outbound_record" USING btree ("outbound_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_code" ON "product" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_name" ON "product" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_system_config_key" ON "system_config" USING btree ("config_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_warehouse_code" ON "warehouse" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_warehouse_name" ON "warehouse" USING btree ("name" text_ops);--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "alert_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "alert_record" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "alert_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "alert_record" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "automation_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "automation_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "automation_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "automation_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "daily_inventory_stats" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "daily_inventory_stats" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "daily_inventory_stats" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "daily_inventory_stats" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "email_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "email_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "email_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "email_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "inbound_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "inbound_record" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "inbound_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "inbound_record" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "issue_field_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "issue_field_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "issue_field_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "issue_field_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "issue_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "issue_record" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "issue_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "issue_record" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "issue_type_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "issue_type_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "issue_type_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "issue_type_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "notification_settings" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "notification_settings" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "notification_settings" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "notification_settings" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "order_number" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "order_number" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "order_number" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "order_number" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "oss_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "oss_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "oss_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "oss_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "outbound_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "outbound_record" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "outbound_record" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "outbound_record" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "product" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "product" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "product" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "product" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "system_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "system_config" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "system_config" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "system_config" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改本人数据" ON "warehouse" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs" USING (((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text)));--> statement-breakpoint
CREATE POLICY "查看全部数据" ON "warehouse" AS PERMISSIVE FOR SELECT TO "anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "修改全部数据" ON "warehouse" AS PERMISSIVE FOR ALL TO "authenticated_workspace_aadkeahc42wbs";--> statement-breakpoint
CREATE POLICY "service_role_bypass_policy" ON "warehouse" AS PERMISSIVE FOR ALL TO "service_role_workspace_aadkeahc42wbs";