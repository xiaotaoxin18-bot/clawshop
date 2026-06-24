/* eslint-disable */
/** auto generated, do not edit */
import { pgTable, index, pgPolicy, uuid, varchar, doublePrecision, integer, text, jsonb, boolean, foreignKey, check, date, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

/** Escape single quotes in SQL string literals */
function escapeLiteral(str: string): string {
  return `'${str.replace(/'/g, "''")}'`;
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number};
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number){
    if(value == null) return value as any;
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if(typeof value === 'string') {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if(value instanceof Date) return value;
    return new Date(value);
  },
});

export const product = pgTable("product", {
  id: uuid().defaultRandom().notNull(),
  name: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 255 }).notNull(),
  costPrice: doublePrecision("cost_price").default(0),
  currentStock: integer("current_stock").default(0),
  safetyStock: integer("safety_stock").default(0),
  imageAttachment: fileAttachment("image_attachment"),
  category: varchar({ length: 100 }),
  sellableDays: doublePrecision("sellable_days"),
  sellableStatus: varchar("sellable_status", { length: 20 }),
  // Douyin platform fields
  douyinProductId: varchar("douyin_product_id", { length: 100 }),
  douyinSkuId: varchar("douyin_sku_id", { length: 100 }),
  salePrice: doublePrecision("sale_price").default(0),
  spec: varchar("spec", { length: 255 }),
  platformStatus: varchar("platform_status", { length: 20 }),
  salesCount: integer("sales_count").default(0),
  platformCategory: varchar("platform_category", { length: 100 }),
  lastSyncAt: customTimestamptz("last_sync_at"),
  shopId: varchar("shop_id", { length: 100 }).default(''),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_product_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
  index("idx_product_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const inboundRecord = pgTable("inbound_record", {
  id: uuid().defaultRandom().notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer().default(0).notNull(),
  operator: varchar({ length: 255 }).notNull(),
  attachments: fileAttachmentArray("attachments"),
  warehouse: varchar({ length: 255 }),
  remark: text(),
  orderNo: varchar("order_no", { length: 50 }),
  /**
   * 入库货品项列表 [{productId, productName, quantity}]
   */
  items: jsonb().default([]),
  inType: varchar("in_type", { length: 255 }).default('tear_order'),
  shopId: varchar("shop_id", { length: 100 }).default(''),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_inbound_in_type").using("btree", table.inType.asc().nullsLast().op("text_ops")),
  index("idx_inbound_order_no").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
  index("idx_inbound_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const emailConfig = pgTable("email_config", {
  id: uuid().defaultRandom().notNull(),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull(),
  smtpPort: integer("smtp_port").default(587).notNull(),
  smtpUser: varchar("smtp_user", { length: 255 }).notNull(),
  smtpPass: varchar("smtp_pass", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }),
  fromEmail: varchar("from_email", { length: 255 }),
  isSsl: boolean("is_ssl").default(true),
  isEnabled: boolean("is_enabled").default(true),
  toEmails: varchar("to_emails", { length: 255 }).array().default([""]),
  reminderInterval: integer("reminder_interval").default(60),
  reminderTypes: varchar("reminder_types", { length: 50 }).array().default(["inventory_alert", "issue_alert"]),
  dailyDigestTime: varchar("daily_digest_time", { length: 10 }).default('09:00'),
  dailyDigestEnabled: boolean("daily_digest_enabled").default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const outboundRecord = pgTable("outbound_record", {
  id: uuid().defaultRandom().notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer().default(0).notNull(),
  operator: varchar({ length: 255 }).notNull(),
  attachments: fileAttachmentArray("attachments"),
  warehouse: varchar({ length: 255 }),
  remark: text(),
  orderNo: varchar("order_no", { length: 50 }),
  /**
   * 出库货品项列表 [{productId, productName, quantity}]
   */
  items: jsonb().default([]),
  outboundType: varchar("outbound_type", { length: 20 }).default('sale'),
  outType: varchar("out_type", { length: 255 }).default('sales'),
  sourceWarehouse: varchar("source_warehouse", { length: 255 }),
  shopId: varchar("shop_id", { length: 100 }).default(''),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_outbound_items_gin").using("gin", table.items.asc().nullsLast().op("jsonb_path_ops")),
  index("idx_outbound_order_no").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
  index("idx_outbound_out_type").using("btree", table.outType.asc().nullsLast().op("text_ops")),
  index("idx_outbound_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
  index("idx_outbound_source_warehouse").using("btree", table.sourceWarehouse.asc().nullsLast().op("text_ops")),
  index("idx_outbound_type").using("btree", table.outboundType.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const alertRecord = pgTable("alert_record", {
  id: uuid().defaultRandom().notNull(),
  productId: uuid("product_id").notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  alertType: varchar("alert_type", { length: 20 }).notNull(),
  currentStock: integer("current_stock").default(0),
  safetyStock: integer("safety_stock").default(0),
  shortAmount: integer("short_amount").default(0),
  isRead: boolean("is_read").default(false),
  isHandled: boolean("is_handled").default(false),
  handledAt: customTimestamptz('handled_at'),
  sellableDays: doublePrecision("sellable_days"),
  sellableStatus: varchar("sellable_status", { length: 20 }),
  shopId: varchar("shop_id", { length: 100 }).default(''),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_alert_is_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
  index("idx_alert_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
  index("idx_alert_type").using("btree", table.alertType.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [product.id],
    name: "alert_record_product_id_fkey"
  }),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
  check("alert_record_alert_type_check", sql`(alert_type)::text = ANY (ARRAY[('emergency'::character varying)::text, ('overstock'::character varying)::text])`),
]);

export const orderNumber = pgTable("order_number", {
  id: uuid().defaultRandom().notNull(),
  orderNo: varchar("order_no", { length: 50 }).notNull(),
  orderType: varchar("order_type", { length: 20 }).notNull(),
  referenceId: uuid("reference_id"),
  createdAt: customTimestamptz('created_at').default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_order_number_no").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
  index("idx_order_number_type").using("btree", table.orderType.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const dailyInventoryStats = pgTable("daily_inventory_stats", {
  id: uuid().defaultRandom().notNull(),
  statDate: date("stat_date").notNull(),
  totalStockValue: doublePrecision("total_stock_value").default(0),
  totalInboundQuantity: integer("total_inbound_quantity").default(0),
  totalOutboundQuantity: integer("total_outbound_quantity").default(0),
  alertCount: integer("alert_count").default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_daily_stats_date").using("btree", table.statDate.asc().nullsLast().op("date_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const warehouse = pgTable("warehouse", {
  id: uuid().defaultRandom().notNull(),
  name: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 255 }).notNull(),
  address: text(),
  manager: varchar({ length: 255 }),
  phone: varchar({ length: 255 }),
  remark: text(),
  isDefault: boolean("is_default").default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_warehouse_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
  index("idx_warehouse_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const inboundTypeConfig = pgTable("inbound_type_config", {
  id: uuid().defaultRandom().notNull(),
  name: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 255 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_inbound_type_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const issueTypeConfig = pgTable("issue_type_config", {
  id: uuid().defaultRandom().notNull(),
  name: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 100 }).notNull(),
  description: text(),
  isEnabled: boolean("is_enabled").default(true),
  sortOrder: integer("sort_order").default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_issue_type_config_enabled").using("btree", table.isEnabled.asc().nullsLast().op("bool_ops")),
  index("idx_issue_type_config_sort").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const issueFieldConfig = pgTable("issue_field_config", {
  id: uuid().defaultRandom().notNull(),
  name: varchar({ length: 255 }).notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).default('text').notNull(),
  isRequired: boolean("is_required").default(false),
  isEnabled: boolean("is_enabled").default(true),
  sortOrder: integer("sort_order").default(0),
  /**
   * @type { Array<{ label: string; value: string }> }
   */
  options: jsonb(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_issue_field_config_enabled").using("btree", table.isEnabled.asc().nullsLast().op("bool_ops")),
  index("idx_issue_field_config_sort").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const issueRecord = pgTable("issue_record", {
  id: uuid().defaultRandom().notNull(),
  issueTypeId: uuid("issue_type_id").notNull(),
  trackingNo: varchar("tracking_no", { length: 255 }),
  orderNo: varchar("order_no", { length: 255 }),
  productName: varchar("product_name", { length: 255 }),
  description: text(),
  status: varchar({ length: 50 }).default('pending'),
  priority: varchar({ length: 50 }).default('medium'),
  /**
   * @type { Record<string, any> }
   */
  customFields: jsonb("custom_fields").default({}),
  attachments: fileAttachmentArray("attachments"),
  handler: varchar({ length: 255 }),
  resolvedAt: customTimestamptz('resolved_at'),
  resolutionNote: text("resolution_note"),
  warehouse: varchar({ length: 255 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_issue_record_order").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
  index("idx_issue_record_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
  index("idx_issue_record_tracking").using("btree", table.trackingNo.asc().nullsLast().op("text_ops")),
  index("idx_issue_record_type").using("btree", table.issueTypeId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.issueTypeId],
    foreignColumns: [issueTypeConfig.id],
    name: "issue_record_issue_type_id_fkey"
  }),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const notificationSettings = pgTable("notification_settings", {
  id: uuid().defaultRandom().notNull(),
  userId: userProfile("user_id"),
  notificationEnabled: boolean("notification_enabled").default(false),
  autoEmailEnabled: boolean("auto_email_enabled").default(false),
  emailProvider: varchar("email_provider", { length: 20 }).default('smtp'),
  /**
   * EmailJS配置JSON
   */
  emailjsConfig: jsonb("emailjs_config"),
  /**
   * SMTP配置JSON
   */
  smtpConfig: jsonb("smtp_config"),
  /**
   * 飞书配置JSON
   */
  feishuConfig: jsonb("feishu_config"),
  /**
   * 应用级状态JSON
   */
  appState: jsonb("app_state"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_notification_settings_user_id").using("btree", table.userId.asc().nullsLast().op("record_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const ossConfig = pgTable("oss_config", {
  id: uuid().defaultRandom().notNull(),
  userId: userProfile("user_id"),
  enabled: boolean().default(false),
  endpoint: varchar({ length: 500 }),
  region: varchar({ length: 100 }).default('oss-cn-hangzhou'),
  bucketName: varchar("bucket_name", { length: 255 }),
  customDomain: varchar("custom_domain", { length: 500 }),
  accessKeyId: varchar("access_key_id", { length: 255 }),
  accessKeySecret: varchar("access_key_secret", { length: 255 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_oss_config_user_id").using("btree", table.userId.asc().nullsLast().op("record_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const automationConfig = pgTable("automation_config", {
  id: uuid().defaultRandom().notNull(),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  /**
   * 配置值JSON
   */
  configValue: jsonb("config_value").default({}).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_automation_config_key").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

export const systemConfig = pgTable("system_config", {
  id: uuid().defaultRandom().notNull(),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  configValue: text("config_value").notNull(),
  description: text(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_system_config_key").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = ((_created_by).user_id)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadkeahc42wbs", "authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadkeahc42wbs"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadkeahc42wbs"] }),
]);

// table aliases
export const alertRecordTable = alertRecord;
export const automationConfigTable = automationConfig;
export const dailyInventoryStatsTable = dailyInventoryStats;
export const emailConfigTable = emailConfig;
export const inboundRecordTable = inboundRecord;
export const issueFieldConfigTable = issueFieldConfig;
export const issueRecordTable = issueRecord;
export const issueTypeConfigTable = issueTypeConfig;
export const notificationSettingsTable = notificationSettings;
export const orderNumberTable = orderNumber;
export const ossConfigTable = ossConfig;
export const outboundRecordTable = outboundRecord;
export const productTable = product;
export const systemConfigTable = systemConfig;
export const warehouseTable = warehouse;
export const inboundTypeConfigTable = inboundTypeConfig;
