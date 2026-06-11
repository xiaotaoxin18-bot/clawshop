import { logger } from '@lark-apaas/client-toolkit/logger';
import axios from 'axios';

// 替换 axiosForBackend，移除对飞书 SDK 的依赖（避免在飞书内嵌浏览器中冲突）
const axiosForBackend = axios.create({
  baseURL: process.env.CLIENT_BASE_PATH || '/',
});
import type {
  CreateProductRequest,
  UpdateProductRequest,
  ProductListParams,
  ProductListResponse,
  Product,
  CreateInboundRequest,
  UpdateInboundRequest,
  InboundListParams,
  InboundListResponse,
  InboundRecord,
  CreateOutboundRequest,
  UpdateOutboundRequest,
  OutboundListParams,
  OutboundListResponse,
  OutboundRecord,
  GetSignedUrlResponse,
  OSSConfig,
  DashboardStatistics,
  AlertItem,
  AlertRecord,
  AlertListParams,
  AlertListResponse,
  AlertStatistics,
  HighFrequencyAlertProduct,
  HandleAlertRequest,
  EmailConfig,
  CreateEmailConfigRequest,
  UpdateEmailConfigRequest,
  SendEmailRequest,
  EmailTestResult,
  AnalyticsData,
  AnalyticsParams,
  UpdateSellableDaysRequest,
  UpdateSellableDaysResult,
  SellableDaysThresholdConfig,
  UpdateThresholdConfigRequest,
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseListParams,
  PaginatedResponse,
  Issue,
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueListParams,
  IssueTypeConfig,
  CreateIssueTypeConfigRequest,
  UpdateIssueTypeConfigRequest,
  IssueFieldConfig,
  CreateIssueFieldConfigRequest,
  UpdateIssueFieldConfigRequest,
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  MigrateLocalStorageRequest,
  OSSConfigDB,
  UpdateOSSConfigRequest,
  MigrateOSSConfigRequest,
  ProductWarehouseStockResponse,
  AutomationTriggerConfig,
  UpdateAutomationTriggerRequest,
  DouyinDailySnapshot,
  DouyinSnapshotListResponse,
} from '@shared/api.interface';

// ==================== 货品管理 API ====================

export async function getProducts(params: ProductListParams): Promise<ProductListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/products',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取货品列表失败', error);
    throw error;
  }
}

export async function getProduct(id: string): Promise<Product> {
  try {
    const response = await axiosForBackend({
      url: `/api/products/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取货品详情失败', error);
    throw error;
  }
}

export async function createProduct(data: CreateProductRequest): Promise<Product> {
  try {
    const response = await axiosForBackend({
      url: '/api/products',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建货品失败', error);
    throw error;
  }
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
  try {
    const response = await axiosForBackend({
      url: `/api/products/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新货品失败', error);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/products/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除货品失败', error);
    throw error;
  }
}

export async function updateSellableDays(data: UpdateSellableDaysRequest): Promise<UpdateSellableDaysResult[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/products/update-sellable-days',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新可售天数失败', error);
    throw error;
  }
}

export async function getProductWarehouseStock(productId: string): Promise<ProductWarehouseStockResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/products/${productId}/warehouse-stock`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取货品仓库库存失败', error);
    throw error;
  }
}

// ==================== 入库管理 API ====================

export async function getInbounds(params: InboundListParams): Promise<InboundListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/inbounds',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取入库列表失败', error);
    throw error;
  }
}

export async function getInboundRecords(params: InboundListParams): Promise<InboundListResponse> {
  return getInbounds(params);
}

export async function getInbound(id: string): Promise<InboundRecord> {
  try {
    const response = await axiosForBackend({
      url: `/api/inbounds/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取入库详情失败', error);
    throw error;
  }
}

export async function getInboundRecord(id: string): Promise<InboundRecord> {
  return getInbound(id);
}

export async function createInbound(data: CreateInboundRequest): Promise<InboundRecord> {
  try {
    const response = await axiosForBackend({
      url: '/api/inbounds',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建入库失败', error);
    throw error;
  }
}

export async function updateInbound(id: string, data: UpdateInboundRequest): Promise<InboundRecord> {
  try {
    const response = await axiosForBackend({
      url: `/api/inbounds/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新入库失败', error);
    throw error;
  }
}

export async function deleteInbound(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/inbounds/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除入库失败', error);
    throw error;
  }
}

// ==================== 出库管理 API ====================

export async function getOutbounds(params: OutboundListParams): Promise<OutboundListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/outbounds',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取出库列表失败', error);
    throw error;
  }
}

export async function getOutbound(id: string): Promise<OutboundRecord> {
  try {
    const response = await axiosForBackend({
      url: `/api/outbounds/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取出库详情失败', error);
    throw error;
  }
}

export async function createOutbound(data: CreateOutboundRequest): Promise<OutboundRecord> {
  try {
    const response = await axiosForBackend({
      url: '/api/outbounds',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建出库失败', error);
    throw error;
  }
}

export async function updateOutbound(id: string, data: UpdateOutboundRequest): Promise<OutboundRecord> {
  try {
    const response = await axiosForBackend({
      url: `/api/outbounds/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新出库失败', error);
    throw error;
  }
}

export async function deleteOutbound(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/outbounds/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除出库失败', error);
    throw error;
  }
}

// ==================== 文件上传 API ====================

export async function getSignedUrl(bucketId: string, filePath: string): Promise<GetSignedUrlResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/file/signed-url',
      method: 'GET',
      params: { bucketId, filePath },
    });
    return response.data;
  } catch (error) {
    logger.error('获取签名URL失败', error);
    throw error;
  }
}

// ==================== 仪表盘 API ====================

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  try {
    const response = await axiosForBackend({
      url: '/api/dashboard/statistics',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取仪表盘统计失败', error);
    throw error;
  }
}

export async function getDashboardAlerts(): Promise<AlertRecord[]> {
  return getAlerts({ page: 1, pageSize: 5, unreadOnly: true }).then(r => r.items as AlertRecord[]);
}

// ==================== 预警中心 API ====================

export async function syncAlerts(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axiosForBackend({
      url: '/api/alerts/sync',
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('同步预警数据失败', error);
    throw error;
  }
}

export async function getAlerts(params: AlertListParams): Promise<AlertListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/alerts',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取预警列表失败', error);
    throw error;
  }
}

export async function handleAlert(id: string, data: HandleAlertRequest): Promise<AlertItem> {
  try {
    const response = await axiosForBackend({
      url: `/api/alerts/${id}/handle`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('处理预警失败', error);
    throw error;
  }
}

export async function markAlertAsRead(id: string): Promise<AlertItem> {
  try {
    const response = await axiosForBackend({
      url: `/api/alerts/${id}/read`,
      method: 'PATCH',
    });
    return response.data;
  } catch (error) {
    logger.error('标记预警已读失败', error);
    throw error;
  }
}

export async function getAlertStatistics(): Promise<AlertStatistics> {
  try {
    const response = await axiosForBackend({
      url: '/api/alerts/statistics',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取预警统计失败', error);
    throw error;
  }
}

export async function getHighFrequencyAlertProducts(): Promise<HighFrequencyAlertProduct[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/alerts/high-frequency',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取高频预警货品失败', error);
    throw error;
  }
}

export async function getHighFrequencyAlerts(): Promise<HighFrequencyAlertProduct[]> {
  return getHighFrequencyAlertProducts();
}

// ==================== 邮件配置 API ====================

export async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const response = await axiosForBackend({
      url: '/api/email/config',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取邮件配置失败', error);
    throw error;
  }
}

export async function createEmailConfig(data: CreateEmailConfigRequest): Promise<EmailConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/email/config',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建邮件配置失败', error);
    throw error;
  }
}

export async function updateEmailConfig(data: UpdateEmailConfigRequest): Promise<EmailConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/email/config',
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新邮件配置失败', error);
    throw error;
  }
}

export async function testEmailConfig(): Promise<EmailTestResult> {
  try {
    const response = await axiosForBackend({
      url: '/api/email/config/test',
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('测试邮件配置失败', error);
    throw error;
  }
}

export async function sendEmail(data: SendEmailRequest): Promise<void> {
  try {
    await axiosForBackend({
      url: '/api/email/send',
      method: 'POST',
      data,
    });
  } catch (error) {
    logger.error('发送邮件失败', error);
    throw error;
  }
}

// ==================== 统计分析 API ====================

export async function getAnalytics(params?: AnalyticsParams): Promise<AnalyticsData> {
  try {
    const response = await axiosForBackend({
      url: '/api/analytics',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取统计数据失败', error);
    throw error;
  }
}

// ==================== 仓库管理 API ====================

export async function getWarehouses(params: WarehouseListParams): Promise<PaginatedResponse<Warehouse>> {
  try {
    const response = await axiosForBackend({
      url: '/api/warehouses',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取仓库列表失败', error);
    throw error;
  }
}

export async function getAllWarehouses(params: WarehouseListParams): Promise<PaginatedResponse<Warehouse>> {
  return getWarehouses(params);
}

export async function getWarehouse(id: string): Promise<Warehouse> {
  try {
    const response = await axiosForBackend({
      url: `/api/warehouses/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取仓库详情失败', error);
    throw error;
  }
}

export async function createWarehouse(data: CreateWarehouseRequest): Promise<Warehouse> {
  try {
    const response = await axiosForBackend({
      url: '/api/warehouses',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建仓库失败', error);
    throw error;
  }
}

export async function updateWarehouse(id: string, data: UpdateWarehouseRequest): Promise<Warehouse> {
  try {
    const response = await axiosForBackend({
      url: `/api/warehouses/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新仓库失败', error);
    throw error;
  }
}

export async function deleteWarehouse(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/warehouses/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除仓库失败', error);
    throw error;
  }
}

// ==================== 问题管理 API ====================

export async function getIssues(params: IssueListParams): Promise<PaginatedResponse<Issue>> {
  try {
    const response = await axiosForBackend({
      url: '/api/issues',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取问题列表失败', error);
    throw error;
  }
}

export async function getIssue(id: string): Promise<Issue> {
  try {
    const response = await axiosForBackend({
      url: `/api/issues/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取问题详情失败', error);
    throw error;
  }
}

export async function createIssue(data: CreateIssueRequest): Promise<Issue> {
  try {
    const response = await axiosForBackend({
      url: '/api/issues',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建问题失败', error);
    throw error;
  }
}

export async function updateIssue(id: string, data: UpdateIssueRequest): Promise<Issue> {
  try {
    const response = await axiosForBackend({
      url: `/api/issues/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新问题失败', error);
    throw error;
  }
}

export async function deleteIssue(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/issues/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除问题失败', error);
    throw error;
  }
}

// 问题类型配置API别名
export async function getIssueTypeConfigs(): Promise<IssueTypeConfig[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/issues/types',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取异常类型配置列表失败', error);
    throw error;
  }
}

export async function createIssueTypeConfig(data: CreateIssueTypeConfigRequest): Promise<IssueTypeConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/issues/types',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建异常类型配置失败', error);
    throw error;
  }
}

export async function updateIssueTypeConfig(id: string, data: UpdateIssueTypeConfigRequest): Promise<IssueTypeConfig> {
  try {
    const response = await axiosForBackend({
      url: `/api/issues/types/${id}`,
      method: 'PUT',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新异常类型配置失败', error);
    throw error;
  }
}

export async function deleteIssueTypeConfig(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/issues/types/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除异常类型配置失败', error);
    throw error;
  }
}

export async function getIssueTypes(): Promise<IssueTypeConfig[]> {
  return getIssueTypeConfigs();
}

export async function createIssueType(data: CreateIssueTypeConfigRequest): Promise<IssueTypeConfig> {
  return createIssueTypeConfig(data);
}

export async function updateIssueType(id: string, data: UpdateIssueTypeConfigRequest): Promise<IssueTypeConfig> {
  return updateIssueTypeConfig(id, data);
}

export async function deleteIssueType(id: string): Promise<void> {
  return deleteIssueTypeConfig(id);
}

// 问题字段配置API别名
export async function getIssueFieldConfigs(): Promise<IssueFieldConfig[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/issues/fields',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取异常字段配置列表失败', error);
    throw error;
  }
}

export async function createIssueFieldConfig(data: CreateIssueFieldConfigRequest): Promise<IssueFieldConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/issues/fields',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建异常字段配置失败', error);
    throw error;
  }
}

export async function updateIssueFieldConfig(id: string, data: UpdateIssueFieldConfigRequest): Promise<IssueFieldConfig> {
  try {
    const response = await axiosForBackend({
      url: `/api/issues/fields/${id}`,
      method: 'PUT',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新异常字段配置失败', error);
    throw error;
  }
}

export async function deleteIssueFieldConfig(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/issues/fields/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除异常字段配置失败', error);
    throw error;
  }
}

export async function getIssueFields(): Promise<IssueFieldConfig[]> {
  return getIssueFieldConfigs();
}

export async function createIssueField(data: CreateIssueFieldConfigRequest): Promise<IssueFieldConfig> {
  return createIssueFieldConfig(data);
}

export async function updateIssueField(id: string, data: UpdateIssueFieldConfigRequest): Promise<IssueFieldConfig> {
  return updateIssueFieldConfig(id, data);
}

export async function deleteIssueField(id: string): Promise<void> {
  return deleteIssueFieldConfig(id);
}

// ==================== 通知设置 API ====================

export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const response = await axiosForBackend({
      url: '/api/notifications/settings',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取通知设置失败', error);
    throw error;
  }
}

export async function updateNotificationSettings(data: UpdateNotificationSettingsRequest): Promise<NotificationSettings> {
  try {
    const response = await axiosForBackend({
      url: '/api/notifications/settings',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新通知设置失败', error);
    throw error;
  }
}

export async function saveNotificationSettings(data: UpdateNotificationSettingsRequest): Promise<NotificationSettings> {
  return updateNotificationSettings(data);
}

export async function migrateLocalStorage(data: MigrateLocalStorageRequest): Promise<void> {
  try {
    await axiosForBackend({
      url: '/api/notifications/migrate',
      method: 'POST',
      data,
    });
  } catch (error) {
    logger.error('迁移本地存储失败', error);
    throw error;
  }
}

export async function migrateLocalStorageSettings(data: MigrateLocalStorageRequest): Promise<void> {
  return migrateLocalStorage(data);
}

// ==================== OSS 配置 API ====================

export async function getOSSConfigFromDB(): Promise<OSSConfigDB | null> {
  try {
    const response = await axiosForBackend({
      url: '/api/file/config/oss',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取OSS配置失败', error);
    throw error;
  }
}

export async function getOSSConfig(): Promise<OSSConfigDB | null> {
  return getOSSConfigFromDB();
}

export async function saveOSSConfigToDB(data: UpdateOSSConfigRequest): Promise<OSSConfigDB> {
  try {
    const response = await axiosForBackend({
      url: '/api/file/config/oss',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('保存OSS配置失败', error);
    throw error;
  }
}

export async function saveOSSConfig(data: UpdateOSSConfigRequest): Promise<OSSConfigDB> {
  return saveOSSConfigToDB(data);
}

export async function migrateOSSConfig(data: MigrateOSSConfigRequest): Promise<void> {
  try {
    await axiosForBackend({
      url: '/api/file/config/oss/migrate',
      method: 'POST',
      data,
    });
  } catch (error) {
    logger.error('迁移OSS配置失败', error);
    throw error;
  }
}

// ==================== 自动化任务配置 API ====================

export async function getAutomationConfig(): Promise<AutomationTriggerConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/products/config/automation',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取自动化配置失败', error);
    throw error;
  }
}

export async function updateAutomationConfig(data: UpdateAutomationTriggerRequest): Promise<AutomationTriggerConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/products/config/automation',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新自动化配置失败', error);
    throw error;
  }
}

// ==================== 系统配置 API ====================

export async function getThresholdConfig(): Promise<SellableDaysThresholdConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/system-config/threshold',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取预警阈值配置失败', error);
    throw error;
  }
}

export async function updateThresholdConfig(data: UpdateThresholdConfigRequest): Promise<SellableDaysThresholdConfig> {
  try {
    const response = await axiosForBackend({
      url: '/api/system-config/threshold',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新预警阈值配置失败', error);
    throw error;
  }
}

// ==================== 抖店采集快照 API ====================

export async function getDouyinLatestSnapshot(): Promise<DouyinDailySnapshot | null> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/scrape/latest',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取最新抖店快照失败', error);
    throw error;
  }
}

export async function getDouyinSnapshots(page: number = 1, pageSize: number = 20): Promise<DouyinSnapshotListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/scrape/snapshots',
      method: 'GET',
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取抖店快照列表失败', error);
    throw error;
  }
}

/** 手动触发采集 */
export async function triggerDouyinScrape(shopId?: string): Promise<{ success: boolean; message: string; task_id?: string }> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/scrape/trigger',
      method: 'POST',
      data: { shop_id: shopId || undefined },
    });
    return response.data;
  } catch (error) {
    logger.error('触发采集失败', error);
    throw error;
  }
}

/** 获取店铺列表 */
export async function getShops(): Promise<{ shop_id: string; shop_name: string; created_at: string }[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/shops',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取店铺列表失败', error);
    return [];
  }
}

/** 添加店铺 */
export async function addShop(shopId: string, shopName?: string): Promise<{ shop_id: string; shop_name: string; created_at: string }> {
  const response = await axiosForBackend({
    url: '/api/douyin/shops',
    method: 'POST',
    data: { shop_id: shopId, shop_name: shopName },
  });
  return response.data;
}

/** 删除店铺 */
export async function deleteShop(shopId: string): Promise<{ success: boolean; message: string }> {
  const response = await axiosForBackend({
    url: `/api/douyin/shops/${shopId}`,
    method: 'DELETE',
  });
  return response.data;
}
