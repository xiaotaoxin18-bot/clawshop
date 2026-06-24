import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { product, inboundRecord, outboundRecord, alertRecord } from '@server/database/schema';
import { douyinOrderSync, douyinSyncLog, douyinDailySnapshot } from '@server/database/douyin-schema';
import { eq, sql, desc, and, count as drizzleCount } from 'drizzle-orm';
import { exec } from 'child_process';
import { join } from 'path';
import * as fs from 'fs';
import type {
  DouyinProductData,
  DouyinOrderData,
  DouyinStockData,
  SyncLogRecord,
  OrderSyncRecord,
  SyncAction,
  SyncSource,
  SyncResultResponse,
  DailyPushPayload,
  DailySnapshotResponse,
  SnapshotListResponse,
  TriggerScrapeRequest,
  TriggerScrapeResponse,
} from './douyin.types';

/**
 * 抖店核心同步服务
 *
 * 职责：
 * 1. 商品/订单/库存的 upsert 同步
 * 2. 记录同步日志
 * 3. 接收浏览器采集器推送的每日快照
 */
@Injectable()
export class DouyinService {
  private readonly logger = new Logger(DouyinService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ==================== 商品同步 ====================

  /**
   * 处理商品同步（抖店 → 本地）
   * 根据 douyin_product_id 匹配本地商品，存在则更新，不存在则创建本地商品记录
   */
  async handleProductSync(
    data: DouyinProductData,
    source: SyncSource = 'webhook',
  ): Promise<SyncResultResponse> {
    try {
      this.logger.log(`商品同步: product_id=${data.douyin_product_id}, name=${data.name}`);

      // 检查是否已绑定本地商品
      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.douyinProductId, data.douyin_product_id));

      const now = new Date();

      if (existing) {
        // 更新已有商品的抖店信息
        await this.db
          .update(product)
          .set({
            douyinSkuId: data.douyin_sku_id || existing.douyinSkuId,
            salePrice: data.sale_price ?? existing.salePrice,
            spec: data.spec || existing.spec,
            platformStatus: data.platform_status || existing.platformStatus,
            salesCount: data.sales_count ?? existing.salesCount,
            platformCategory: data.platform_category || existing.platformCategory,
            lastSyncAt: now,
          })
          .where(eq(product.id, existing.id));

        await this.logSync('product', 'product_updated', source, {
          productId: existing.id,
          douyinProductId: data.douyin_product_id,
        });

        return { success: true, message: '商品信息已更新' };
      }

      // 未绑定 — 创建新商品记录
      const [record] = await this.db
        .insert(product)
        .values({
          name: data.name,
          code: data.code || `DY-${data.douyin_product_id}`,
          douyinProductId: data.douyin_product_id,
          douyinSkuId: data.douyin_sku_id,
          salePrice: data.sale_price || 0,
          spec: data.spec,
          platformStatus: data.platform_status,
          salesCount: data.sales_count || 0,
          platformCategory: data.platform_category,
          lastSyncAt: now,
        })
        .returning();

      await this.logSync('product', 'product_created', source, {
        productId: record.id,
        douyinProductId: data.douyin_product_id,
      });

      return { success: true, message: '商品已创建', processedCount: 1 };
    } catch (error: any) {
      this.logger.error(`商品同步失败: ${data.douyin_product_id}`, error?.message || error);
      await this.logSync('product', 'product_created', source, null, 'failed', error?.message);
      return { success: false, message: `商品同步失败: ${error?.message || '未知错误'}` };
    }
  }

  /**
   * 绑定本地商品到抖店商品
   */
  async bindProduct(
    localProductId: string,
    douyinProductId: string,
    douyinSkuId?: string,
  ): Promise<SyncResultResponse> {
    try {
      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, localProductId));

      if (!existing) {
        return { success: false, message: '本地商品不存在' };
      }

      await this.db
        .update(product)
        .set({
          douyinProductId,
          douyinSkuId: douyinSkuId || null,
          lastSyncAt: new Date(),
        })
        .where(eq(product.id, localProductId));

      await this.logSync('product', 'product_bound', 'manual', {
        productId: localProductId,
        douyinProductId,
        douyinSkuId,
      });

      return { success: true, message: '绑定成功' };
    } catch (error: any) {
      this.logger.error(`绑定失败`, error?.message || error);
      return { success: false, message: `绑定失败: ${error?.message || '未知错误'}` };
    }
  }

  /**
   * 解绑抖店商品
   */
  async unbindProduct(localProductId: string): Promise<SyncResultResponse> {
    try {
      await this.db
        .update(product)
        .set({
          douyinProductId: null,
          douyinSkuId: null,
          platformStatus: null,
          lastSyncAt: null,
        })
        .where(eq(product.id, localProductId));

      await this.logSync('product', 'product_unbound', 'manual', {
        productId: localProductId,
      });

      return { success: true, message: '解绑成功' };
    } catch (error: any) {
      return { success: false, message: `解绑失败: ${error?.message || '未知错误'}` };
    }
  }

  // ==================== 订单同步 ====================

  /**
   * 处理订单同步（抖店 → 本地）
   */
  async handleOrderSync(
    data: DouyinOrderData,
    source: SyncSource = 'webhook',
  ): Promise<SyncResultResponse> {
    try {
      this.logger.log(`订单同步: order_id=${data.order_id}`);

      // 查找是否已存在
      const [existing] = await this.db
        .select()
        .from(douyinOrderSync)
        .where(eq(douyinOrderSync.orderId, data.order_id));

      // 尝试匹配本地商品
      let localProductId: string | null = null;
      if (data.product_name) {
        const [matched] = await this.db
          .select()
          .from(product)
          .where(eq(product.name, data.product_name));
        if (matched) {
          localProductId = matched.id;
        }
      }

      const now = new Date();
      const orderValues = {
        orderId: data.order_id,
        orderStatus: data.order_status,
        productName: data.product_name,
        localProductId: localProductId,
        quantity: data.quantity || 0,
        totalAmount: data.total_amount || 0,
        skuSpec: data.sku_spec,
        receiverName: data.receiver_name,
        receiverPhone: data.receiver_phone,
        receiverAddress: data.receiver_address,
        logisticsCompany: data.logistics_company,
        logisticsNo: data.logistics_no,
        syncStatus: 'success' as const,
        syncMessage: null as string | null,
        orderTime: data.order_time ? new Date(data.order_time) : null,
        syncAt: now,
      };

      if (existing) {
        await this.db
          .update(douyinOrderSync)
          .set(orderValues)
          .where(eq(douyinOrderSync.orderId, data.order_id));
      } else {
        await this.db.insert(douyinOrderSync).values(orderValues);
      }

      await this.logSync('order', 'order_created', source, {
        orderId: data.order_id,
        localProductId,
      });

      return { success: true, message: '订单同步成功', processedCount: 1 };
    } catch (error: any) {
      this.logger.error(`订单同步失败: ${data.order_id}`, error?.message || error);
      await this.logSync('order', 'order_created', source, null, 'failed', error?.message);
      return { success: false, message: `订单同步失败: ${error?.message || '未知错误'}` };
    }
  }

  // ==================== 库存同步 ====================

  /**
   * 处理库存变更同步（抖店 → 本地）
   */
  async handleStockSync(
    data: DouyinStockData,
    source: SyncSource = 'webhook',
  ): Promise<SyncResultResponse> {
    try {
      this.logger.log(`库存同步: product_id=${data.douyin_product_id}, quantity=${data.quantity}`);

      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.douyinProductId, data.douyin_product_id));

      if (!existing) {
        await this.logSync('stock', 'stock_changed', source, null, 'failed', '未找到匹配的本地商品');
        return { success: false, message: '未找到匹配的本地商品，请先绑定' };
      }

      await this.db
        .update(product)
        .set({
          currentStock: data.quantity,
          lastSyncAt: new Date(),
        })
        .where(eq(product.id, existing.id));

      await this.logSync('stock', 'stock_changed', source, {
        productId: existing.id,
        oldStock: existing.currentStock,
        newStock: data.quantity,
      });

      return { success: true, message: '库存同步成功' };
    } catch (error: any) {
      this.logger.error(`库存同步失败: ${data.douyin_product_id}`, error?.message || error);
      return { success: false, message: `库存同步失败: ${error?.message || '未知错误'}` };
    }
  }

  // ==================== 同步日志 ====================

  /**
   * 记录同步日志
   */
  private async logSync(
    syncType: string,
    syncAction: SyncAction,
    source: SyncSource,
    detail: Record<string, any> | null,
    status: 'success' | 'failed' = 'success',
    message?: string,
  ): Promise<void> {
    try {
      await this.db.insert(douyinSyncLog).values({
        syncType,
        syncAction,
        status,
        message: message || null,
        detail: detail as any,
        source,
      });
    } catch (error) {
      this.logger.error('写入同步日志失败', error);
    }
  }

  /**
   * 查询同步日志
   */
  async getSyncLogs(
    page: number = 1,
    pageSize: number = 20,
    syncType?: string,
    status?: string,
  ): Promise<{ items: SyncLogRecord[]; total: number; page: number; pageSize: number }> {
    const conditions = [];
    if (syncType) conditions.push(eq(douyinSyncLog.syncType, syncType));
    if (status) conditions.push(eq(douyinSyncLog.status, status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ total: drizzleCount() })
      .from(douyinSyncLog)
      .where(where || sql`TRUE`);

    const records = await this.db
      .select()
      .from(douyinSyncLog)
      .where(where || sql`TRUE`)
      .orderBy(desc(douyinSyncLog.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: records.map(r => ({
        id: r.id,
        syncType: r.syncType as SyncAction,
        status: r.status as 'success' | 'failed',
        message: r.message || undefined,
        detail: r.detail as Record<string, any> | undefined,
        source: (r.source || 'webhook') as SyncSource,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(countResult.total),
      page,
      pageSize,
    };
  }

  /**
   * 查询已同步的订单记录
   */
  async getOrders(
    page: number = 1,
    pageSize: number = 20,
    syncStatus?: string,
  ): Promise<{ items: OrderSyncRecord[]; total: number; page: number; pageSize: number }> {
    const conditions = [];
    if (syncStatus) conditions.push(eq(douyinOrderSync.syncStatus, syncStatus));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ total: drizzleCount() })
      .from(douyinOrderSync)
      .where(where || sql`TRUE`);

    const records = await this.db
      .select()
      .from(douyinOrderSync)
      .where(where || sql`TRUE`)
      .orderBy(desc(douyinOrderSync.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: records.map(r => ({
        id: r.id,
        orderId: r.orderId,
        orderStatus: r.orderStatus,
        productName: r.productName || undefined,
        localProductId: r.localProductId || undefined,
        quantity: r.quantity || 0,
        totalAmount: r.totalAmount || 0,
        skuSpec: r.skuSpec || undefined,
        receiverName: r.receiverName || undefined,
        receiverPhone: r.receiverPhone || undefined,
        receiverAddress: r.receiverAddress || undefined,
        logisticsCompany: r.logisticsCompany || undefined,
        logisticsNo: r.logisticsNo || undefined,
        syncStatus: r.syncStatus as any,
        syncMessage: r.syncMessage || undefined,
        orderTime: r.orderTime?.toISOString(),
        syncAt: r.syncAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(countResult.total),
      page,
      pageSize,
    };
  }

  // ==================== 浏览器采集推送 ====================

  /**
   * 保存每日采集快照（支持多店铺隔离）
   */
  async saveDailySnapshot(payload: DailyPushPayload): Promise<SyncResultResponse> {
    try {
      const date = payload.snapshot.date;
      const shopId = payload.shop_id || '__default__';

      // 按 (shop_id, snapshot_date) 唯一键查找
      const [existing] = await this.db
        .select()
        .from(douyinDailySnapshot)
        .where(and(
          eq(douyinDailySnapshot.snapshotDate, date),
          eq(douyinDailySnapshot.shopId , shopId),
        ));

      const snapshotData = {
        snapshotDate: date,
        shopId: shopId,
        productCount: payload.snapshot.product_count,
        orderCount: payload.snapshot.order_count,
        rejectedCount: payload.snapshot.rejected_count,
        revenueData: {
          ...(payload.snapshot.revenue_data || {}),
          order_statuses: payload.snapshot.order_statuses || null,
          reviews: payload.snapshot.review_data || null,
        } as any,
        newProducts: payload.changes?.new_products || [],
        delistedProducts: payload.changes?.delisted_products || [],
        allProducts: payload.products || [],
        rawJson: payload as any,
      } as any;

      if (existing) {
        await this.db
          .update(douyinDailySnapshot)
          .set(snapshotData)
          .where(eq(douyinDailySnapshot.id, existing.id));
        this.logger.log(`快照已更新: ${date} [${shopId}]`);
      } else {
        await this.db.insert(douyinDailySnapshot).values(snapshotData);
        this.logger.log(`快照已创建: ${date} [${shopId}]`);
      }

      // ========== 同步商品到 product 表 + 生成业务记录 ==========
      let syncedCount = 0;
      let inboundCount = 0;
      let outboundCount = 0;
      let alertCount = 0;

      // 获取该店铺的上次快照（用于对比销量变化）
      const [prevSnapshot] = await this.db
        .select()
        .from(douyinDailySnapshot)
        .where(and(
          sql`${douyinDailySnapshot.snapshotDate} < ${date}`,
          eq(douyinDailySnapshot.shopId , shopId),
        ))
        .orderBy(desc(douyinDailySnapshot.snapshotDate))
        .limit(1);
      const prevProducts: any[] = (prevSnapshot?.allProducts || []) as any[];
      const prevSalesMap = new Map<string, number>();
      for (const pp of prevProducts) {
        if (pp.douyin_product_id) {
          prevSalesMap.set(pp.douyin_product_id, pp.sales_count || 0);
        }
      }

      if (payload.products && payload.products.length > 0) {
        for (const p of payload.products) {
          try {
            // 按 (shop_id, douyin_product_id) 匹配商品
            const [existing] = await this.db
              .select()
              .from(product)
              .where(and(
                eq(product.douyinProductId, p.douyin_product_id),
                eq(product.shopId , shopId),
              ));

            const now = new Date();
            if (existing) {
              const oldSales = existing.salesCount || 0;
              const newSales = p.sales_count || 0;
              await this.db
                .update(product)
                .set({
                  name: p.name,
                  salePrice: p.sale_price ?? existing.salePrice,
                  salesCount: newSales,
                  currentStock: p.stock ?? existing.currentStock,
                  category: p.category || existing.category,
                  platformStatus: p.status || 'active',
                  shopId: shopId,
                  sellableStatus: p.stock && p.stock > 0 ? 'normal' : 'emergency',
                  lastSyncAt: now,
                })
                .where(eq(product.id, existing.id));

              // 销量增加 → 创建出库记录
              const salesDiff = newSales - oldSales;
              if (salesDiff > 0) {
                await this.db.insert(outboundRecord).values({
                  productId: existing.id,
                  quantity: salesDiff,
                  operator: '抖店同步',
                  warehouse: '抖店',
                  shopId: shopId,
                  orderNo: `DY-${date}-${p.douyin_product_id}`,
                  items: [{ productId: existing.id, productName: p.name, quantity: salesDiff }],
                  outboundType: 'sale',
                  outType: 'sales',
                  remark: `抖店销量同步[${shopId}]: +${salesDiff}`,
                });
                outboundCount++;
              }
            } else {
              // 新商品 → 创建入库记录
              const [record] = await this.db
                .insert(product)
                .values({
                  name: p.name,
                  code: `DY-${p.douyin_product_id}`,
                  douyinProductId: p.douyin_product_id,
                  salePrice: p.sale_price || 0,
                  salesCount: p.sales_count || 0,
                  currentStock: p.stock || 0,
                  category: p.category || '',
                  platformStatus: p.status || 'active',
                  shopId: shopId,
                  sellableStatus: p.stock && p.stock > 0 ? 'normal' : 'emergency',
                  lastSyncAt: now,
                })
                .returning();

              await this.db.insert(inboundRecord).values({
                productId: record.id,
                quantity: p.stock || 1,
                operator: '抖店同步',
                warehouse: '抖店',
                shopId: shopId,
                orderNo: `IN-DY-${date}-${p.douyin_product_id}`,
                items: JSON.stringify([{ productId: record.id, productName: p.name, quantity: p.stock || 1 }]),
                inType: 'purchase',
                remark: `抖店新增商品同步[${shopId}]: ${p.name}`,
              });
              inboundCount++;
            }
            syncedCount++;

            // ========== 生成预警 ==========
            const currentStock = p.stock ?? 0;
            const sales = p.sales_count ?? 0;
            if (currentStock === 0 && sales > 0) {
              await this.db.insert(alertRecord).values({
                productId: existing?.id || '',
                productName: p.name,
                alertType: 'emergency',
                currentStock: currentStock,
                safetyStock: 10,
                shortAmount: 10,
                shopId: shopId,
                sellableDays: 0,
                sellableStatus: 'emergency',
              });
              alertCount++;
            }
          } catch (err) {
            this.logger.warn(`处理商品失败: ${p.douyin_product_id}`, err);
          }
        }
        this.logger.log(`同步完成[${shopId}]: ${syncedCount}商品, ${inboundCount}入库, ${outboundCount}出库, ${alertCount}预警`);
      }

      await this.logSync('snapshot', 'manual_sync', 'manual', {
        shopId,
        date,
        productCount: payload.snapshot.product_count,
        orderCount: payload.snapshot.order_count,
        syncedProducts: syncedCount,
        inboundCreated: inboundCount,
        outboundCreated: outboundCount,
        alertCreated: alertCount,
      });

      return { success: true, message: `快照已保存[${shopId}]: ${date}`, processedCount: syncedCount + inboundCount + outboundCount };
    } catch (error: any) {
      this.logger.error(`保存快照失败`, error?.message || error);
      return { success: false, message: `保存快照失败: ${error?.message || '未知错误'}` };
    }
  }

  /**
   * 查询快照列表
   */
  async getSnapshots(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<SnapshotListResponse> {
    const [countResult] = await this.db
      .select({ total: drizzleCount() })
      .from(douyinDailySnapshot);

    const records = await this.db
      .select()
      .from(douyinDailySnapshot)
      .orderBy(desc(douyinDailySnapshot.snapshotDate))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: records.map(r => ({
        id: r.id,
        snapshotDate: r.snapshotDate,
        productCount: r.productCount || 0,
        orderCount: r.orderCount || 0,
        rejectedCount: r.rejectedCount || 0,
        revenueData: r.revenueData as Record<string, any> | null,
        newProducts: (r.newProducts || []) as any[],
        delistedProducts: (r.delistedProducts || []) as any[],
        allProducts: (r.allProducts || []) as any[],
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(countResult.total),
      page,
      pageSize,
    };
  }

  /**
   * 获取最新快照
   */
  async getLatestSnapshot(): Promise<DailySnapshotResponse | null> {
    const [record] = await this.db
      .select()
      .from(douyinDailySnapshot)
      .orderBy(desc(douyinDailySnapshot.snapshotDate))
      .limit(1);

    if (!record) return null;

    return {
      id: record.id,
      snapshotDate: record.snapshotDate,
      productCount: record.productCount || 0,
      orderCount: record.orderCount || 0,
      rejectedCount: record.rejectedCount || 0,
      revenueData: record.revenueData as Record<string, any> | null,
      newProducts: (record.newProducts || []) as any[],
      delistedProducts: (record.delistedProducts || []) as any[],
      allProducts: (record.allProducts || []) as any[],
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * 手动触发采集
   * 通过 child_process 调用 Python 采集器，支持指定店铺
   */
  async triggerScrape(data: TriggerScrapeRequest): Promise<TriggerScrapeResponse> {
    const scraperDir = join(__dirname, '..', '..', '..', '..', '..', 'scraper');
    const apiUrl = process.env.SERVER_HOST
      ? `http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT || '3000'}`
      : 'http://localhost:3000';

    let cmd = `cd /d "${scraperDir}" && python cli.py daily-push --api-url ${apiUrl}`;
    if (data.shop_id) {
      cmd += ` --shop-id "${data.shop_id}"`;
    }

    this.logger.log(`触发采集: ${cmd}`);

    try {
      const child = exec(cmd, {
        cwd: scraperDir,
        timeout: 600000, // 10 分钟超时
        windowsHide: false, // 显示浏览器窗口
      });

      child.stdout?.on('data', (chunk: string) => {
        this.logger.log(`[采集器] ${chunk.trim()}`);
      });
      child.stderr?.on('data', (chunk: string) => {
        this.logger.warn(`[采集器] ${chunk.trim()}`);
      });
      child.on('close', (code: number | null) => {
        this.logger.log(`采集器进程退出, code=${code}`);
      });
      child.on('error', (err: Error) => {
        this.logger.error(`采集器启动失败: ${err.message}`);
      });

      return {
        success: true,
        message: data.shop_id
          ? `店铺 ${data.shop_id} 采集任务已启动，浏览器将自动打开`
          : '采集任务已启动，浏览器将自动打开',
        task_id: child.pid?.toString(),
      };
    } catch (error: any) {
      this.logger.error(`触发采集失败: ${error.message}`);
      return { success: false, message: `触发采集失败: ${error.message}` };
    }
  /**
   * 触发抖店扫码登录
   * 启动 Python 采集器的 login 命令，截图二维码供前端展示
   */
  async triggerLogin(): Promise<{ success: boolean; message: string }> {
    const scraperDir = join(__dirname, '..', '..', '..', '..', '..', 'scraper');
    const cmd = `cd "${scraperDir}" && xvfb-run bash run-collect.sh login`;

    this.logger.log(`触发登录: ${cmd}`);

    try {
      const child = exec(cmd, {
        cwd: scraperDir,
        timeout: 600000,
      });

      child.stdout?.on('data', (chunk: string) => {
        this.logger.log(`[登录] ${chunk.trim()}`);
      });
      child.stderr?.on('data', (chunk: string) => {
        this.logger.warn(`[登录] ${chunk.trim()}`);
      });
      child.on('exit', (code: number | null) => {
        this.logger.log(`登录进程退出, code=${code}`);
      });
      child.on('error', (err: Error) => {
        this.logger.error(`登录进程启动失败: ${err.message}`);
      });

      return { success: true, message: '登录流程已启动，请稍后查看二维码' };
    } catch (error: any) {
      this.logger.error(`触发登录失败: ${error.message}`);
      return { success: false, message: `触发登录失败: ${error.message}` };
    }
  }

  /**
   * 获取登录二维码截图（base64）
   */
  async getLoginQRCode(): Promise<string | null> {
    const qrPath = '/tmp/douyin_login_qr.png';
    try {
      if (!fs.existsSync(qrPath)) return null;
      const data = fs.readFileSync(qrPath);
      return `data:image/png;base64,${data.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /**
   * 获取登录状态
   * - waiting_qr: 等待二维码就绪
   * - ready: 二维码已就绪，等待扫码
   * - done: 登录成功
   * - idle: 无登录任务
   */
  async getLoginStatus(): Promise<{ status: string; qr?: string }> {
    const readyFlag = '/tmp/douyin_login_ready';
    const doneFlag = '/tmp/douyin_login_done';

    if (fs.existsSync(doneFlag)) {
      // 清理标记
      try { fs.unlinkSync(doneFlag); } catch {}
      return { status: 'done' };
    }
    if (fs.existsSync(readyFlag)) {
      const qr = await this.getLoginQRCode();
      return { status: 'ready', qr: qr || undefined };
    }
    // 检查是否有截图文件（截图正在生成中）
    if (fs.existsSync('/tmp/douyin_login_qr.png')) {
      return { status: 'waiting_qr' };
    }
    return { status: 'idle' };
  }
}
export { DouyinConfigService } from './douyin-config.service';
