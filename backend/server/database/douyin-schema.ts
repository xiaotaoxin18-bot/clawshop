/* eslint-disable */
/**
 * 抖店数据接入 — 数据库表定义
 * 手动维护，不自动生成。
 * product 表的抖店字段定义在 schema.ts 中已有，此处只定义新增表。
 */
import { pgTable, pgPolicy, index, uuid, varchar, doublePrecision, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { customTimestamptz, userProfile } from "./schema";

/**
 * 抖店订单同步记录表
 */
export const douyinOrderSync = pgTable("douyin_order_sync", {
  id: uuid().defaultRandom().notNull(),
  orderId: varchar("order_id", { length: 100 }).notNull(),
  orderStatus: varchar("order_status", { length: 50 }).notNull(),
  productName: varchar("product_name", { length: 255 }),
  localProductId: uuid("product_id"),
  quantity: integer().default(0),
  totalAmount: doublePrecision("total_amount").default(0),
  skuSpec: varchar("sku_spec", { length: 255 }),
  receiverName: varchar("receiver_name", { length: 100 }),
  receiverPhone: varchar("receiver_phone", { length: 50 }),
  receiverAddress: text("receiver_address"),
  logisticsCompany: varchar("logistics_company", { length: 100 }),
  logisticsNo: varchar("logistics_no", { length: 100 }),
  syncStatus: varchar("sync_status", { length: 20 }).default('pending'),
  syncMessage: text("sync_message"),
  orderTime: timestamp("order_time", { withTimezone: true }),
  syncAt: timestamp("sync_at", { withTimezone: true }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_douyin_order_sync_order_id").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
  index("idx_douyin_order_sync_status").using("btree", table.syncStatus.asc().nullsLast().op("text_ops")),
  index("idx_douyin_order_sync_product_id").using("btree", table.localProductId.asc().nullsLast().op("uuid_ops")),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

/**
 * 抖店同步操作日志表
 */
export const douyinSyncLog = pgTable("douyin_sync_log", {
  id: uuid().defaultRandom().notNull(),
  syncType: varchar("sync_type", { length: 20 }).notNull(),
  syncAction: varchar("sync_action", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default('success').notNull(),
  message: text("message"),
  detail: jsonb("detail"),
  source: varchar("source", { length: 20 }).default('webhook'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_douyin_sync_log_type").using("btree", table.syncType.asc().nullsLast().op("text_ops")),
  index("idx_douyin_sync_log_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
  index("idx_douyin_sync_log_created").using("btree", table.createdAt.asc().nullsLast()),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

/**
 * 抖店配置表（凭证、Webhook Secret 等）
 */
export const douyinConfig = pgTable("douyin_config", {
  id: uuid().defaultRandom().notNull(),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_douyin_config_key").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

/**
 * 每日采集快照表 — 浏览器采集器推送的数据
 */
export const douyinDailySnapshot = pgTable("douyin_daily_snapshot", {
  id: uuid().defaultRandom().notNull(),
  snapshotDate: varchar("snapshot_date", { length: 20 }).notNull(),
  productCount: integer("product_count").default(0),
  orderCount: integer("order_count").default(0),
  rejectedCount: integer("rejected_count").default(0),
  revenueData: jsonb("revenue_data"),
  newProducts: jsonb("new_products").default([]),
  delistedProducts: jsonb("delisted_products").default([]),
  allProducts: jsonb("all_products").default([]),
  rawJson: jsonb("raw_json"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_douyin_snapshot_date").using("btree", table.snapshotDate.asc().nullsLast().op("text_ops")),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

// table aliases (consistent with schema.ts pattern)
export const douyinOrderSyncTable = douyinOrderSync;
export const douyinSyncLogTable = douyinSyncLog;
