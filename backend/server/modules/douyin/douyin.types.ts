/** 抖店同步相关类型定义 */

/** Webhook 事件类型 */
export type DouyinWebhookEvent = 'product' | 'order' | 'stock';

/** 同步来源 */
export type SyncSource = 'webhook' | 'manual' | 'cron';

/** 同步状态 */
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed';

/** 同步操作类型 */
export type SyncAction =
  | 'product_created'
  | 'product_updated'
  | 'product_bound'
  | 'product_unbound'
  | 'order_created'
  | 'order_updated'
  | 'stock_changed'
  | 'stock_writeback'
  | 'manual_sync';

/** 商品同步数据 */
export interface DouyinProductData {
  douyin_product_id: string;
  douyin_sku_id?: string;
  name: string;
  code?: string;
  sale_price?: number;
  spec?: string;
  platform_status?: string;
  sales_count?: number;
  platform_category?: string;
  image_url?: string;
}

/** 订单同步数据 */
export interface DouyinOrderData {
  order_id: string;
  order_status: string;
  product_name?: string;
  quantity?: number;
  total_amount?: number;
  sku_spec?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  logistics_company?: string;
  logistics_no?: string;
  order_time?: string;
}

/** 库存变更数据 */
export interface DouyinStockData {
  douyin_product_id: string;
  douyin_sku_id?: string;
  quantity: number;
  changed_at?: string;
}

/** 抖店同步日志记录 */
export interface SyncLogRecord {
  id: string;
  syncType: SyncAction;
  status: 'success' | 'failed';
  message?: string;
  detail?: Record<string, any>;
  source: SyncSource;
  createdAt: string;
}

/** 抖店订单同步记录 */
export interface OrderSyncRecord {
  id: string;
  orderId: string;
  orderStatus: string;
  productName?: string;
  localProductId?: string;
  quantity: number;
  totalAmount: number;
  skuSpec?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  logisticsCompany?: string;
  logisticsNo?: string;
  syncStatus: SyncStatus;
  syncMessage?: string;
  orderTime?: string;
  syncAt?: string;
  createdAt: string;
}

/** 抖店配置项 */
export interface DouyinConfig {
  configKey: string;
  configValue: string;
  description?: string;
}

/** REST API 响应类型 */
export interface SyncLogListResponse {
  items: SyncLogRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderSyncListResponse {
  items: OrderSyncRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DouyinProductBindResponse {
  productId: string;
  douyinProductId: string;
  douyinSkuId?: string;
  success: boolean;
  message?: string;
}

export interface SyncResultResponse {
  success: boolean;
  message: string;
  processedCount?: number;
}

// ==================== 浏览器采集推送相关类型 ====================

/** 采集器推送的单个商品数据 */
export interface ScrapeProductItem {
  douyin_product_id: string;
  name: string;
  listed_date: string;
  status?: string;
  sale_price?: number;
  sales_count?: number;
  stock?: number;
  category?: string;
  image_url?: string;
}

/** 采集器推送的变动商品 */
export interface ScrapeChanges {
  new_products: ScrapeProductItem[];
  delisted_products: ScrapeProductItem[];
}

/** 采集器推送的日快照数据 */
export interface DailyPushPayload {
  snapshot: {
    date: string;
    product_count: number;
    order_count: number;
    rejected_count: number;
    order_statuses?: Record<string, number>;
    revenue_data?: Record<string, string> | null;
    review_data?: Record<string, string> | null;
  };
  products: ScrapeProductItem[];
  changes: ScrapeChanges;
}

/** 日快照响应 */
export interface DailySnapshotResponse {
  id: string;
  snapshotDate: string;
  productCount: number;
  orderCount: number;
  rejectedCount: number;
  revenueData: Record<string, any> | null;
  newProducts: ScrapeProductItem[];
  delistedProducts: ScrapeProductItem[];
  allProducts: ScrapeProductItem[];
  createdAt: string;
}

/** 快照列表响应 */
export interface SnapshotListResponse {
  items: DailySnapshotResponse[];
  total: number;
  page: number;
  pageSize: number;
}
