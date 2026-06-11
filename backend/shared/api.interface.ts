/* 前后端共享的类型定义 */

// ==================== 基础类型 ====================

/** 文件附件信息 */
export interface FileAttachment {
  bucket_id: string;
  file_path: string;
  download_url?: string;
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 分页响应结构 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 货品管理 ====================

/** 货品状态（基于可售天数） */
export type ProductStatus = 'emergency' | 'safe' | 'normal' | 'overstock';

/** 可售状态（基于可售天数分级） */
export type SellableStatus = 'emergency' | 'safe' | 'normal' | 'overstock';

/** 货品基础信息 */
export interface Product {
  id: string;
  name: string;
  code: string;
  costPrice?: number;
  currentStock: number;
  safetyStock: number;
  sellableDays: number | null;
  sellableStatus: SellableStatus;
  stockValue?: number;
  status: ProductStatus;
  imageAttachment: FileAttachment | null;
  category: string | null;
  salePrice?: number;
  salesCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建货品请求 */
export interface CreateProductRequest {
  name: string;
  code: string;
  costPrice: number;
  currentStock?: number;
  safetyStock: number;
  imageAttachment?: FileAttachment | null;
  category?: string | null;
}

/** 更新货品请求 */
export interface UpdateProductRequest {
  name?: string;
  code?: string;
  costPrice?: number;
  currentStock?: number;
  safetyStock?: number;
  imageAttachment?: FileAttachment | null;
  category?: string | null;
}

/** 货品列表响应 */
export type ProductListResponse = PaginatedResponse<Product>;

/** 货品列表查询参数 */
export interface ProductListParams extends PaginationParams {
  keyword?: string;
  status?: ProductStatus;
  warehouse?: string;
  sortField?: 'currentStock' | 'sellableDays';
  sortOrder?: 'asc' | 'desc';
}

/** 货品各仓库库存信息 */
export interface ProductWarehouseStock {
  warehouseId: string;
  warehouseName: string;
  inboundQuantity: number;
  outboundQuantity: number;
  currentStock: number;
  stockValue: number;
}

/** 货品仓库库存响应 */
export interface ProductWarehouseStockResponse {
  productId: string;
  productName: string;
  totalStock: number;
  warehouses: ProductWarehouseStock[];
}

/** 更新可售天数请求 */
export interface UpdateSellableDaysRequest {
  productIds?: string[];
}

/** 可售天数更新结果 */
export interface UpdateSellableDaysResult {
  productId: string;
  productName: string;
  oldSellableDays: number | null;
  newSellableDays: number;
  updated: boolean;
}

/** 系统配置项 */
export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 可售天数预警阈值配置 */
export interface SellableDaysThresholdConfig {
  emergencyDays: number;
  safeDays: number;
  overstockDays: number;
}

/** 更新预警阈值配置请求 */
export interface UpdateThresholdConfigRequest {
  emergencyDays?: number;
  safeDays?: number;
  overstockDays?: number;
}

/** 自动化任务配置 */
export interface AutomationTriggerConfig {
  name: string;
  description: string;
  active: boolean;
  triggerType: 'cron' | 'record_change';
  triggerCondition: {
    expression?: string;
    timeZone?: string;
  };
  executionIntervalDays: number;
}

/** 更新自动化任务配置请求 */
export interface UpdateAutomationTriggerRequest {
  executionIntervalDays: number;
  active?: boolean;
}

// ==================== 入库管理 ====================

/** 入库类型 */
export type InboundType = 'tear_order' | 'inventory_check' | 'purchase';

/** 入库类型显示名称映射 */
export const InboundTypeMap: Record<InboundType, string> = {
  tear_order: '撕单入库',
  inventory_check: '盘点入库',
  purchase: '采购入库',
};

/** 入库货品项 */
export interface InboundItem {
  productId: string;
  productName?: string;
  quantity: number;
}

/** 入库记录 - 订单级聚合 */
export interface InboundRecord {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  operator: string;
  warehouse?: string;
  remark?: string;
  orderNo?: string;
  inType: InboundType;
  attachments: FileAttachment[];
  attachmentCount: number;
  items: InboundItem[];
  itemCount: number;
  totalQuantity: number;
  createdAt: string;
}

/** 创建入库记录请求 */
export interface CreateInboundRequest {
  items: InboundItem[];
  operator: string;
  warehouse?: string;
  remark?: string;
  inType?: InboundType;
  attachments?: FileAttachment[];
}

/** 更新入库记录请求 */
export interface UpdateInboundRequest {
  quantity?: number;
  operator?: string;
  attachments?: FileAttachment[] | null;
}

/** 入库记录列表响应 */
export type InboundListResponse = PaginatedResponse<InboundRecord>;

/** 入库记录列表查询参数 */
export interface InboundListParams extends PaginationParams {
  productId?: string;
  orderNo?: string;
  inType?: InboundType;
  startDate?: string;
  endDate?: string;
}

/** 入库记录详情响应 */
export interface InboundDetailResponse extends InboundRecord {
  product: Product;
}

// ==================== 出库管理 ====================

/** 出库类型 */
export type OutboundType = 'sales' | 'transfer' | 'inventory_check' | 'tear_order';

/** 出库类型显示名称映射 */
export const OutboundTypeMap: Record<OutboundType, string> = {
  sales: '销售出库',
  transfer: '调拨出库',
  inventory_check: '盘点出库',
  tear_order: '撕单出库',
};

/** 出库货品项 */
export interface OutboundItem {
  productId: string;
  productName?: string;
  quantity: number;
}

/** 出库记录 - 订单级聚合 */
export interface OutboundRecord {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  operator: string;
  warehouse?: string;
  remark?: string;
  orderNo?: string;
  outType: OutboundType;
  /** 出库细分类型 */
  outboundType?: string;
  /** 调拨出库：来源仓库 */
  sourceWarehouse?: string;
  attachments: FileAttachment[];
  attachmentCount: number;
  items: OutboundItem[];
  itemCount: number;
  totalQuantity: number;
  createdAt: string;
}

/** 创建出库记录请求 */
export interface CreateOutboundRequest {
  items: OutboundItem[];
  operator: string;
  warehouse?: string;
  remark?: string;
  outType?: OutboundType;
  /** 出库细分类型 */
  outboundType?: string;
  /** 调拨出库：来源仓库 */
  sourceWarehouse?: string;
  attachments?: FileAttachment[];
}

/** 更新出库记录请求 */
export interface UpdateOutboundRequest {
  quantity?: number;
  operator?: string;
  attachments?: FileAttachment[] | null;
}

/** 出库记录列表响应 */
export type OutboundListResponse = PaginatedResponse<OutboundRecord>;

/** 出库记录列表查询参数 */
export interface OutboundListParams extends PaginationParams {
  productId?: string;
  orderNo?: string;
  outType?: OutboundType;
  /** 出库细分类型 */
  outboundType?: string;
  startDate?: string;
  endDate?: string;
}

/** 出库记录详情响应 */
export interface OutboundDetailResponse extends OutboundRecord {
  product: Product;
}

// ==================== 预警中心 ====================

/** 预警类型（基于可售天数） */
export type AlertType = 'emergency' | 'overstock';

/** 预警记录 */
export interface AlertRecord {
  id: string;
  productId: string;
  productName: string;
  alertType: AlertType;
  currentStock: number;
  safetyStock: number;
  shortAmount: number;
  sellableDays: number | null;
  sellableStatus: SellableStatus;
  isRead: boolean;
  isHandled: boolean;
  handledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 预警列表查询参数 */
export interface AlertListParams extends PaginationParams {
  alertType?: AlertType;
  isHandled?: boolean;
  isRead?: boolean;
  unreadOnly?: boolean;
  startDate?: string;
  endDate?: string;
}

/** 预警列表响应 */
export type AlertListResponse = PaginatedResponse<AlertRecord>;

/** 预警统计 */
export interface AlertStatistics {
  totalCount: number;
  pendingCount: number;
  emergencyCount: number;
  overstockCount: number;
  thisMonthCount: number;
  handledCount: number;
  handleRate: number;
}

/** 高频预警货品 */
export interface HighFrequencyAlertProduct {
  productId: string;
  productName: string;
  alertCount: number;
  lastAlertAt: string;
}

/** 处理预警请求 */
export interface HandleAlertRequest {
  isHandled: boolean;
}

/** 更新预警状态请求 */
export interface UpdateAlertStatusRequest {
  isRead?: boolean;
  isHandled?: boolean;
}

// ==================== 邮件配置 ====================

/** 邮件配置 */
export interface EmailConfig {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromName?: string;
  fromEmail?: string;
  isSsl: boolean;
  isEnabled: boolean;
  /** 默认收件人邮箱列表 */
  toEmails?: string[];
  /** 自动提醒检查间隔（分钟） */
  reminderInterval?: number;
  /** 触发自动提醒的类型 */
  reminderTypes?: string[];
  /** 每日汇总邮件发送时间，格式HH:MM */
  dailyDigestTime?: string;
  /** 是否启用每日汇总邮件 */
  dailyDigestEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 创建邮件配置请求 */
export interface CreateEmailConfigRequest {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromName?: string;
  fromEmail?: string;
  isSsl?: boolean;
  isEnabled?: boolean;
  toEmails?: string[];
  reminderInterval?: number;
  reminderTypes?: string[];
  dailyDigestTime?: string;
  dailyDigestEnabled?: boolean;
}

/** 更新邮件配置请求 */
export interface UpdateEmailConfigRequest {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromName?: string;
  fromEmail?: string;
  isSsl?: boolean;
  isEnabled?: boolean;
  toEmails?: string[];
  reminderInterval?: number;
  reminderTypes?: string[];
  dailyDigestTime?: string;
  dailyDigestEnabled?: boolean;
}

/** 发送邮件请求 */
export interface SendEmailRequest {
  to: string;
  subject: string;
  content: string;
  isHtml?: boolean;
  /** 可选：自定义 SMTP 配置，如果不传则使用系统配置的 SMTP */
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromName?: string;
    fromEmail?: string;
    isSsl?: boolean;
  };
}

/** 邮件测试结果 */
export interface EmailTestResult {
  success: boolean;
  message: string;
}

// ==================== 通知设置 ====================

export type EmailProvider = 'emailjs' | 'smtp' | 'feishu';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  toEmails: string;
}

export interface SMTPConfig {
  toEmails: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  isSsl: boolean;
  fromName: string;
  fromEmail: string;
  reminderInterval: number;
  reminderTypes: string[];
  dailyDigestTime: string;
  dailyDigestEnabled: boolean;
}

export interface FeishuConfig {
  webhookUrl: string;
  secret?: string;
  atMobiles?: string;
  atUserIds?: string;
}

export interface NotificationAppState {
  lastNotified?: Record<string, string>;
  emailSent?: string[];
  dailyDigestSent?: string;
}

export interface NotificationSettings {
  id: string;
  notificationEnabled: boolean;
  autoEmailEnabled: boolean;
  emailProvider: EmailProvider;
  emailjsConfig?: EmailJSConfig;
  smtpConfig?: SMTPConfig;
  feishuConfig?: FeishuConfig;
  appState?: NotificationAppState;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationSettingsRequest {
  notificationEnabled?: boolean;
  autoEmailEnabled?: boolean;
  emailProvider?: EmailProvider;
  emailjsConfig?: EmailJSConfig;
  smtpConfig?: SMTPConfig;
  feishuConfig?: FeishuConfig;
  appState?: NotificationAppState;
}

export interface MigrateLocalStorageRequest {
  notificationEnabled?: boolean;
  emailProvider?: EmailProvider;
  emailjsConfig?: EmailJSConfig;
  smtpConfig?: SMTPConfig;
  feishuConfig?: FeishuConfig;
  autoEmailEnabled?: boolean;
  appState?: NotificationAppState;
}

// ==================== 数据统计 ====================

/** 每日库存统计 */
export interface DailyInventoryStats {
  id: string;
  statDate: string;
  totalStockValue: number;
  totalInboundQuantity: number;
  totalOutboundQuantity: number;
  alertCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 库存成本趋势数据 */
export interface StockValueTrend {
  date: string;
  value: number;
}

/** 仓库库存趋势数据 */
export interface WarehouseStockTrend {
  date: string;
  warehouse: string;
  quantity: number;
}

/** 出入库趋势数据 */
export interface InOutboundTrend {
  date: string;
  inbound: number;
  outbound: number;
}

/** 货品周转排行项 */
export interface ProductTurnoverItem {
  productId: string;
  productName: string;
  category?: string;
  inboundQuantity: number;
  outboundQuantity: number;
  currentStock: number;
  turnoverRate: number;
  avgTurnoverDays: number;
}

/** 数据统计响应 */
export interface AnalyticsData {
  stockValueTrend: StockValueTrend[];
  inOutboundTrend: InOutboundTrend[];
  turnoverTop15: ProductTurnoverItem[];
  monthlyInbound: number;
  monthlyOutbound: number;
  avgTurnoverDays: number;
  alertHandleRate: number;
  warehouseStockTrend: WarehouseStockTrend[];
}

/** 数据统计查询参数 */
export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
}

// ==================== 库存总览统计 ====================

/** 仓库统计项 */
export interface WarehouseStats {
  warehouse: string;
  value: number;
  count: number;
  quantity: number;
}

/** 分类统计项 */
export interface CategoryStats {
  category: string;
  value: number;
  count: number;
}

/** 预警项 */
export interface AlertItem {
  id: string;
  productId: string;
  productName: string;
  alertType: AlertType;
  currentStock: number;
  safetyStock: number;
  shortAmount: number;
  isRead: boolean;
  createdAt: string;
}

/** 库存总览统计响应 */
export interface DashboardStatistics {
  totalStockValue: number;
  warehouseValues: WarehouseStats[];
  totalProductCount: number;
  warehouseProductCounts: WarehouseStats[];
  warningProductCount: number;
  overstockProductCount: number;
  todayInbound: number;
  todayOutbound: number;
  categoryDistribution: CategoryStats[];
  nameDistribution: { name: string; count: number; value: number }[];
  shopDistribution: { shopId: string; count: number; value: number }[];
  warehouseDistribution: CategoryStats[];
}

// ==================== 通用响应 ====================

/** 通用操作响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

// ==================== 文件服务 ====================

/** OSS 配置 */
export interface OSSConfig {
  bucket?: string;
  bucketName?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  endpoint?: string;
  region?: string;
  customDomain?: string;
}

/** 获取签名URL请求 */
export interface GetSignedUrlRequest {
  bucket: string;
  path: string;
  config: OSSConfig;
  expires?: number;
}

/** 获取签名URL响应 */
export interface GetSignedUrlResponse {
  url: string;
  downloadUrl: string;
  expiresIn: number;
  expires?: number;
}

// ==================== Issue 模块 ====================

/** Issue 状态 */
export type IssueStatus = 'pending' | 'processing' | 'resolved' | 'closed';

/** Issue 优先级 */
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';

/** Issue 数据 */
export interface Issue {
  id: string;
  issueTypeId: string;
  /** 关联的异常类型信息 */
  issueType?: IssueTypeConfig;
  trackingNo?: string;
  orderNo?: string;
  productName?: string;
  description?: string;
  status: IssueStatus;
  priority?: IssuePriority;
  customFields?: Record<string, any>;
  attachments?: FileAttachment[];
  handler?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  warehouse?: string;
  createdAt: string;
  updatedAt: string;
}

/** 创建 Issue 请求 */
export interface CreateIssueRequest {
  issueTypeId: string;
  trackingNo?: string;
  orderNo?: string;
  productName?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  customFields?: Record<string, any>;
  attachments?: FileAttachment[];
  handler?: string;
  resolutionNote?: string;
  warehouse?: string;
}

/** 更新 Issue 请求 */
export interface UpdateIssueRequest {
  issueTypeId?: string;
  trackingNo?: string;
  orderNo?: string;
  productName?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  customFields?: Record<string, any>;
  attachments?: FileAttachment[];
  handler?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  warehouse?: string;
}

/** Issue 列表查询参数 */
export interface IssueListParams extends PaginationParams {
  status?: IssueStatus;
  type?: string;
}

// ==================== 仓库管理 ====================

/** 仓库信息 */
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  manager?: string;
  phone?: string;
  remark?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 创建仓库请求 */
export interface CreateWarehouseRequest {
  name: string;
  code: string;
  address?: string;
  manager?: string;
  phone?: string;
  remark?: string;
  isDefault?: boolean;
}

/** 更新仓库请求 */
export interface UpdateWarehouseRequest {
  name?: string;
  code?: string;
  address?: string;
  manager?: string;
  phone?: string;
  remark?: string;
  isDefault?: boolean;
}

/** 仓库列表查询参数 */
export interface WarehouseListParams extends PaginationParams {
  keyword?: string;
}

// ==================== 异常类型配置 ====================

/** 异常类型配置 */
export interface IssueTypeConfig {
  id: string;
  name: string;
  code: string;
  description?: string;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建异常类型请求 */
export interface CreateIssueTypeConfigRequest {
  name: string;
  code: string;
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

/** 更新异常类型请求 */
export interface UpdateIssueTypeConfigRequest {
  name?: string;
  code?: string;
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

/** 字段选项 */
export interface FieldOption {
  label: string;
  value: string;
}

/** 问题件字段配置 */
export interface IssueFieldConfig {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'warehouse';
  isRequired: boolean;
  isEnabled: boolean;
  sortOrder: number;
  options?: FieldOption[];
  createdAt: string;
  updatedAt: string;
}

/** 创建字段配置请求 */
export interface CreateIssueFieldConfigRequest {
  name: string;
  fieldKey: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'warehouse';
  isRequired?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
  options?: FieldOption[];
}

/** 更新字段配置请求 */
export interface UpdateIssueFieldConfigRequest {
  name?: string;
  fieldKey?: string;
  fieldType?: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'warehouse';
  isRequired?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
  options?: FieldOption[];
}

// ==================== OSS 配置 ====================

/** OSS 配置（数据库存储版本） */
export interface OSSConfigDB {
  id: string;
  enabled: boolean;
  endpoint: string;
  region: string;
  bucketName: string;
  customDomain: string;
  accessKeyId: string;
  accessKeySecret: string;
  createdAt: string;
  updatedAt: string;
}

/** 更新 OSS 配置请求 */
export interface UpdateOSSConfigRequest {
  enabled?: boolean;
  endpoint?: string;
  region?: string;
  bucketName?: string;
  customDomain?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
}

/** 从 localStorage 迁移 OSS 配置请求 */
export interface MigrateOSSConfigRequest {
  enabled?: boolean;
  endpoint?: string;
  region?: string;
  bucketName?: string;
  customDomain?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
}

// ==================== 抖店采集快照 ====================

export interface DouyinSnapshotProduct {
  douyin_product_id: string;
  name: string;
  listed_date: string;
  status?: string;
  sale_price?: number;
  sales_count?: number;
  image_url?: string;
}

export interface DouyinDailySnapshot {
  id: string;
  snapshotDate: string;
  productCount: number;
  orderCount: number;
  rejectedCount: number;
  revenueData: Record<string, any> | null;
  newProducts: DouyinSnapshotProduct[];
  delistedProducts: DouyinSnapshotProduct[];
  allProducts: DouyinSnapshotProduct[];
  createdAt: string;
}

export interface DouyinSnapshotListResponse {
  items: DouyinDailySnapshot[];
  total: number;
  page: number;
  pageSize: number;
}
