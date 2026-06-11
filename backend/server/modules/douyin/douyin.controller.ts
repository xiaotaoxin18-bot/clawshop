import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  Inject,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NeedLogin, CanRole, DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { product } from '@server/database/schema';
import { douyinOrderSync, douyinSyncLog } from '@server/database/douyin-schema';
import { count, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { DouyinService } from './douyin.service';
import { DouyinConfigService } from './douyin-config.service';
import type {
  SyncLogListResponse,
  OrderSyncListResponse,
  DouyinProductBindResponse,
  SyncResultResponse,
  DailyPushPayload,
  SnapshotListResponse,
  DailySnapshotResponse,
  TriggerScrapeRequest,
  TriggerScrapeResponse,
  AddShopRequest,
  ShopInfo,
} from './douyin.types';

/**
 * 抖店 REST API 控制器
 *
 * 提供采集推送接收、日志查询、商品绑定管理等功能。
 */
@Controller('api/douyin')
export class DouyinController {
  private readonly logger = new Logger(DouyinController.name);

  constructor(
    private readonly douyinService: DouyinService,
    private readonly douyinConfigService: DouyinConfigService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ==================== 同步日志 ====================

  /**
   * 查询同步日志
   */
  @Get('sync-logs')
  async getSyncLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('syncType') syncType?: string,
    @Query('status') status?: string,
  ): Promise<SyncLogListResponse> {
    return this.douyinService.getSyncLogs(page, pageSize, syncType, status);
  }

  // ==================== 订单管理 ====================

  /**
   * 查询抖店订单同步记录
   */
  @Get('orders')
  async getOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('syncStatus') syncStatus?: string,
  ): Promise<OrderSyncListResponse> {
    return this.douyinService.getOrders(page, pageSize, syncStatus);
  }

  // ==================== 商品绑定管理 ====================

  /**
   * 绑定本地商品到抖店商品
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('products/:localProductId/bind')
  async bindProduct(
    @Param('localProductId') localProductId: string,
    @Body() data: { douyinProductId: string; douyinSkuId?: string },
  ): Promise<DouyinProductBindResponse> {
    const result = await this.douyinService.bindProduct(
      localProductId,
      data.douyinProductId,
      data.douyinSkuId,
    );

    return {
      productId: localProductId,
      douyinProductId: data.douyinProductId,
      douyinSkuId: data.douyinSkuId,
      success: result.success,
      message: result.message,
    };
  }

  /**
   * 解绑本地商品和抖店商品的绑定关系
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete('products/:localProductId/bind')
  async unbindProduct(
    @Param('localProductId') localProductId: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.douyinService.unbindProduct(localProductId);
    return { success: result.success, message: result.message };
  }

  // ==================== 配置管理 ====================

  /**
   * 获取所有抖店配置
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Get('config')
  async getAllConfigs() {
    return this.douyinConfigService.getAllConfigs();
  }

  /**
   * 更新抖店配置
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch('config')
  async updateConfig(
    @Body() data: { configKey: string; configValue: string; description?: string },
  ) {
    await this.douyinConfigService.setConfig(
      data.configKey,
      data.configValue,
      data.description,
    );
    return { success: true, message: '配置已更新' };
  }

  // ==================== 店铺管理 ====================

  /**
   * 获取所有店铺配置
   */
  @Get('shops')
  async listShops(): Promise<ShopInfo[]> {
    return this.douyinConfigService.listShops();
  }

  /**
   * 添加店铺
   */
  @Post('shops')
  async addShop(@Body() data: AddShopRequest): Promise<ShopInfo> {
    return this.douyinConfigService.addShop(data.shop_id, data.shop_name);
  }

  /**
   * 删除店铺
   */
  @Delete('shops/:shopId')
  async deleteShop(@Param('shopId') shopId: string): Promise<{ success: boolean; message: string }> {
    await this.douyinConfigService.deleteShop(shopId);
    return { success: true, message: `店铺 ${shopId} 已删除` };
  }

  // ==================== 浏览器采集推送 ====================

  /**
   * 接收采集器推送的每日数据
   */
  @Post('scrape/push-daily')
  async pushDaily(
    @Body() payload: DailyPushPayload,
  ): Promise<SyncResultResponse> {
    this.logger.log(`收到采集推送: ${payload.snapshot?.date || 'unknown'}`);
    return this.douyinService.saveDailySnapshot(payload);
  }

  /**
   * 查询采集快照列表
   */
  @Get('scrape/snapshots')
  async getSnapshots(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<SnapshotListResponse> {
    return this.douyinService.getSnapshots(page, pageSize);
  }

  /**
   * 获取最新采集快照
   */
  @Get('scrape/latest')
  async getLatestSnapshot(): Promise<DailySnapshotResponse | null> {
    return this.douyinService.getLatestSnapshot();
  }

  /**
   * 手动触发浏览器采集
   * 后端通过 child_process 调用 Python 采集器
   */
  @Post('scrape/trigger')
  async triggerScrape(
    @Body() data: TriggerScrapeRequest,
  ): Promise<TriggerScrapeResponse> {
    return this.douyinService.triggerScrape(data);
  }

  // ==================== 统计概览 ====================

  /**
   * 获取抖店同步概览统计
   */
  @Get('stats')
  async getStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    boundProducts: number;
    recentSyncs: number;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalOrders] = await this.db
      .select({ value: count() })
      .from(douyinOrderSync);

    const [pendingOrders] = await this.db
      .select({ value: count() })
      .from(douyinOrderSync)
      .where(eq(douyinOrderSync.syncStatus, 'pending'));

    const [recentSyncs] = await this.db
      .select({ value: count() })
      .from(douyinSyncLog)
      .where(gte(douyinSyncLog.createdAt, twentyFourHoursAgo));

    const [boundProducts] = await this.db
      .select({ value: count() })
      .from(product)
      .where(isNotNull(product.douyinProductId));

    return {
      totalOrders: Number(totalOrders?.value || 0),
      pendingOrders: Number(pendingOrders?.value || 0),
      boundProducts: Number(boundProducts?.value || 0),
      recentSyncs: Number(recentSyncs?.value || 0),
    };
  }
}
