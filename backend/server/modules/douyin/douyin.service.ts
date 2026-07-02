import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { product, inboundRecord, outboundRecord, alertRecord } from '@server/database/schema';
import { douyinOrderSync, douyinSyncLog, douyinDailySnapshot } from '@server/database/douyin-schema';
import { eq, sql, desc, and, count as drizzleCount } from 'drizzle-orm';
import { spawn } from 'child_process';
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
 * 鎶栧簵鏍稿績鍚屾鏈嶅姟
 *
 * 鑱岃矗锛?
 * 1. 鍟嗗搧/璁㈠崟/搴撳瓨鐨?upsert 鍚屾
 * 2. 璁板綍鍚屾鏃ュ織
 * 3. 鎺ユ敹娴忚鍣ㄩ噰闆嗗櫒鎺ㄩ€佺殑姣忔棩蹇収
 */
@Injectable()
export class DouyinService {
  private readonly logger = new Logger(DouyinService.name);
  private scrapeRunning = false;
  private scrapeRunningLabel: string | null = null;
  private loginChild: ReturnType<typeof spawn> | null = null;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ==================== 鍟嗗搧鍚屾 ====================

  /**
   * 澶勭悊鍟嗗搧鍚屾锛堟姈搴?鈫?鏈湴锛?
   * 鏍规嵁 douyin_product_id 鍖归厤鏈湴鍟嗗搧锛屽瓨鍦ㄥ垯鏇存柊锛屼笉瀛樺湪鍒欏垱寤烘湰鍦板晢鍝佽褰?
   */
  async handleProductSync(
    data: DouyinProductData,
    source: SyncSource = 'webhook',
  ): Promise<SyncResultResponse> {
    try {
      this.logger.log(`鍟嗗搧鍚屾: product_id=${data.douyin_product_id}, name=${data.name}`);

      // 妫€鏌ユ槸鍚﹀凡缁戝畾鏈湴鍟嗗搧
      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.douyinProductId, data.douyin_product_id));

      const now = new Date();

      if (existing) {
        // 鏇存柊宸叉湁鍟嗗搧鐨勬姈搴椾俊鎭?
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

        return { success: true, message: '鍟嗗搧淇℃伅宸叉洿鏂? };
      }

      // 鏈粦瀹?鈥?鍒涘缓鏂板晢鍝佽褰?
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

      return { success: true, message: '鍟嗗搧宸插垱寤?, processedCount: 1 };
    } catch (error: any) {
      this.logger.error(`鍟嗗搧鍚屾澶辫触: ${data.douyin_product_id}`, error?.message || error);
      await this.logSync('product', 'product_created', source, null, 'failed', error?.message);
      return { success: false, message: `鍟嗗搧鍚屾澶辫触: ${error?.message || '鏈煡閿欒'}` };
    }
  }

  /**
   * 缁戝畾鏈湴鍟嗗搧鍒版姈搴楀晢鍝?
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
        return { success: false, message: '鏈湴鍟嗗搧涓嶅瓨鍦? };
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

      return { success: true, message: '缁戝畾鎴愬姛' };
    } catch (error: any) {
      this.logger.error(`缁戝畾澶辫触`, error?.message || error);
      return { success: false, message: `缁戝畾澶辫触: ${error?.message || '鏈煡閿欒'}` };
    }
  }

  /**
   * 瑙ｇ粦鎶栧簵鍟嗗搧
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

      return { success: true, message: '瑙ｇ粦鎴愬姛' };
    } catch (error: any) {
      return { success: false, message: `瑙ｇ粦澶辫触: ${error?.message || '鏈煡閿欒'}` };
    }
  }

  // ==================== 璁㈠崟鍚屾 ====================

  /**
   * 澶勭悊璁㈠崟鍚屾锛堟姈搴?鈫?鏈湴锛?
   */
  async handleOrderSync(
    data: DouyinOrderData,
    source: SyncSource = 'webhook',
  ): Promise<SyncResultResponse> {
    try {
      this.logger.log(`璁㈠崟鍚屾: order_id=${data.order_id}`);

      // 鏌ユ壘鏄惁宸插瓨鍦?
      const [existing] = await this.db
        .select()
        .from(douyinOrderSync)
        .where(eq(douyinOrderSync.orderId, data.order_id));

      // 灏濊瘯鍖归厤鏈湴鍟嗗搧
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

      return { success: true, message: '璁㈠崟鍚屾鎴愬姛', processedCount: 1 };
    } catch (error: any) {
      this.logger.error(`璁㈠崟鍚屾澶辫触: ${data.order_id}`, error?.message || error);
      await this.logSync('order', 'order_created', source, null, 'failed', error?.message);
      return { success: false, message: `璁㈠崟鍚屾澶辫触: ${error?.message || '鏈煡閿欒'}` };
    }
  }

  // ==================== 搴撳瓨鍚屾 ====================

  /**
   * 澶勭悊搴撳瓨鍙樻洿鍚屾锛堟姈搴?鈫?鏈湴锛?
   */
  async handleStockSync(
    data: DouyinStockData,
    source: SyncSource = 'webhook',
  ): Promise<SyncResultResponse> {
    try {
      this.logger.log(`搴撳瓨鍚屾: product_id=${data.douyin_product_id}, quantity=${data.quantity}`);

      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.douyinProductId, data.douyin_product_id));

      if (!existing) {
        await this.logSync('stock', 'stock_changed', source, null, 'failed', '鏈壘鍒板尮閰嶇殑鏈湴鍟嗗搧');
        return { success: false, message: '鏈壘鍒板尮閰嶇殑鏈湴鍟嗗搧锛岃鍏堢粦瀹? };
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

      return { success: true, message: '搴撳瓨鍚屾鎴愬姛' };
    } catch (error: any) {
      this.logger.error(`搴撳瓨鍚屾澶辫触: ${data.douyin_product_id}`, error?.message || error);
      return { success: false, message: `搴撳瓨鍚屾澶辫触: ${error?.message || '鏈煡閿欒'}` };
    }
  }

  // ==================== 鍚屾鏃ュ織 ====================

  /**
   * 璁板綍鍚屾鏃ュ織
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
      this.logger.error('鍐欏叆鍚屾鏃ュ織澶辫触', error);
    }
  }

  /**
   * 鏌ヨ鍚屾鏃ュ織
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
   * 鏌ヨ宸插悓姝ョ殑璁㈠崟璁板綍
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

  // ==================== 娴忚鍣ㄩ噰闆嗘帹閫?====================

  /**
   * 淇濆瓨姣忔棩閲囬泦蹇収锛堟敮鎸佸搴楅摵闅旂锛?
   */
  async saveDailySnapshot(payload: DailyPushPayload): Promise<SyncResultResponse> {
    try {
      const date = payload.snapshot.date;
      const shopId = payload.shop_id || '__default__';

      // 鎸?(shop_id, snapshot_date) 鍞竴閿煡鎵?
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
        this.logger.log(`蹇収宸叉洿鏂? ${date} [${shopId}]`);
      } else {
        await this.db.insert(douyinDailySnapshot).values(snapshotData);
        this.logger.log(`蹇収宸插垱寤? ${date} [${shopId}]`);
      }

      // ========== 鍚屾鍟嗗搧鍒?product 琛?+ 鐢熸垚涓氬姟璁板綍 ==========
      let syncedCount = 0;
      let inboundCount = 0;
      let outboundCount = 0;
      let alertCount = 0;

      // 鑾峰彇璇ュ簵閾虹殑涓婃蹇収锛堢敤浜庡姣旈攢閲忓彉鍖栵級
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
            // 鎸?(shop_id, douyin_product_id) 鍖归厤鍟嗗搧
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

              // 閿€閲忓鍔?鈫?鍒涘缓鍑哄簱璁板綍
              const salesDiff = newSales - oldSales;
              if (salesDiff > 0) {
                await this.db.insert(outboundRecord).values({
                  productId: existing.id,
                  quantity: salesDiff,
                  operator: '鎶栧簵鍚屾',
                  warehouse: '鎶栧簵',
                  shopId: shopId,
                  orderNo: `DY-${date}-${p.douyin_product_id}`,
                  items: [{ productId: existing.id, productName: p.name, quantity: salesDiff }],
                  outboundType: 'sale',
                  outType: 'sales',
                  remark: `鎶栧簵閿€閲忓悓姝${shopId}]: +${salesDiff}`,
                });
                outboundCount++;
              }
            } else {
              // 鏂板晢鍝?鈫?鍒涘缓鍏ュ簱璁板綍
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
                operator: '鎶栧簵鍚屾',
                warehouse: '鎶栧簵',
                shopId: shopId,
                orderNo: `IN-DY-${date}-${p.douyin_product_id}`,
                items: JSON.stringify([{ productId: record.id, productName: p.name, quantity: p.stock || 1 }]),
                inType: 'purchase',
                remark: `鎶栧簵鏂板鍟嗗搧鍚屾[${shopId}]: ${p.name}`,
              });
              inboundCount++;
            }
            syncedCount++;

            // ========== 鐢熸垚棰勮 ==========
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
            this.logger.warn(`澶勭悊鍟嗗搧澶辫触: ${p.douyin_product_id}`, err);
          }
        }
        this.logger.log(`鍚屾瀹屾垚[${shopId}]: ${syncedCount}鍟嗗搧, ${inboundCount}鍏ュ簱, ${outboundCount}鍑哄簱, ${alertCount}棰勮`);
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

      return { success: true, message: `蹇収宸蹭繚瀛榌${shopId}]: ${date}`, processedCount: syncedCount + inboundCount + outboundCount };
    } catch (error: any) {
      this.logger.error(`淇濆瓨蹇収澶辫触`, error?.message || error);
      return { success: false, message: `淇濆瓨蹇収澶辫触: ${error?.message || '鏈煡閿欒'}` };
    }
  }

  /**
   * 鏌ヨ蹇収鍒楄〃
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
   * 鑾峰彇鏈€鏂板揩鐓?
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
   * 鎵嬪姩瑙﹀彂閲囬泦
   * 閫氳繃 child_process 璋冪敤 Python 閲囬泦鍣紝鏀寔鎸囧畾搴楅摵
   */
  private resolveScraperDir(): string {
    const candidates = [
      process.env.SCRAPER_DIR,
      join(process.cwd(), 'scraper'),
      join(process.cwd(), '..', 'scraper'),
      join(__dirname, '..', '..', '..', '..', '..', 'scraper'),
      join(__dirname, '..', '..', '..', '..', 'scraper'),
    ].filter((v): v is string => Boolean(v));

    for (const candidate of candidates) {
      if (fs.existsSync(join(candidate, 'cli.py'))) {
        return candidate;
      }
    }

    throw new Error('未找到 scraper 目录');
  }

  private resolvePythonBinary(): string {
    return process.env.SCRAPER_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  }

  private resolveApiUrl(): string {
    return (
      process.env.DOUYIN_API_URL ||
      process.env.API_URL ||
      `http://127.0.0.1:${process.env.SERVER_PORT || '3000'}`
    );
  }

  private buildDailyPushArgs(shopId?: string): string[] {
    const args = ['cli.py', 'daily-push', '--api-url', this.resolveApiUrl(), '--headless'];
    if (shopId) {
      args.push('--shop-id', shopId);
    }
    return args;
  }

  private buildLoginArgs(shopId?: string): string[] {
    const args = ['cli.py', 'login', '--headless'];
    if (shopId) {
      args.push('--shop-id', shopId);
    }
    return args;
  }

  private async runScraperCommand(
    label: string,
    args: string[],
    waitForExit: boolean,
  ): Promise<{ pid?: number; code?: number | null }> {
    if (this.scrapeRunning) {
      throw new Error(`采集任务正在运行${this.scrapeRunningLabel ? `: ${this.scrapeRunningLabel}` : ''}`);
    }

    const scraperDir = this.resolveScraperDir();
    let python = this.resolvePythonBinary();
    // 优先使用虚拟环境的 Python（服务器部署时通过 venv 安装依赖）
    const venvPythons = [
      join(scraperDir, 'venv', 'bin', 'python3'),
      join(scraperDir, 'venv', 'bin', 'python'),
    ];
    for (const vp of venvPythons) {
      if (fs.existsSync(vp)) { python = vp; break; }
    }
    const shopIndex = args.indexOf('--shop-id');
    const shopId = shopIndex >= 0 ? args[shopIndex + 1] : undefined;
    const jobLabel = shopId ? `${label}:${shopId}` : label;

    this.scrapeRunning = true;
    this.scrapeRunningLabel = jobLabel;
    this.logger.log(`启动采集任务[${jobLabel}]: ${python} ${args.join(' ')}`);

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(python, args, {
        cwd: scraperDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
        windowsHide: process.platform === 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      this.scrapeRunning = false;
      this.scrapeRunningLabel = null;
      throw error;
    }

    const SCRAPE_TIMEOUT = 10 * 60 * 1000; // 10 分钟超时
    let timeoutHandle: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
      this.scrapeRunning = false;
      this.scrapeRunningLabel = null;
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) this.logger.log(`[${jobLabel}] ${text}`);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) this.logger.warn(`[${jobLabel}] ${text}`);
    });

    if (!waitForExit) {
      child.on('close', code => {
        this.logger.log(`采集器退出[${jobLabel}]: code=${code}`);
        cleanup();
      });
      child.on('error', err => {
        this.logger.error(`采集器启动失败[${jobLabel}]: ${err.message}`);
        cleanup();
      });
      return { pid: child.pid ?? undefined };
    }

    return await new Promise((resolve, reject) => {
      // 10 分钟超时自动杀死进程
      timeoutHandle = setTimeout(() => {
        this.logger.warn(`采集任务超时[${jobLabel}]，正在终止`);
        child.kill('SIGTERM');
        // 2秒后强制杀死
        setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2000);
      }, SCRAPE_TIMEOUT);

      child.on('close', code => {
        this.logger.log(`采集器退出[${jobLabel}]: code=${code}`);
        cleanup();
        resolve({ pid: child.pid ?? undefined, code });
      });
      child.on('error', err => {
        this.logger.error(`采集器启动失败[${jobLabel}]: ${err.message}`);
        cleanup();
        reject(err);
      });
    });
  }

  async triggerScrape(data: TriggerScrapeRequest): Promise<TriggerScrapeResponse> {
    try {
      const shopId = data.shop_id?.trim() || undefined;
      const result = await this.runScraperCommand(
        'manual',
        this.buildDailyPushArgs(shopId),
        false,
      );

      return {
        success: true,
        message: shopId ? `店铺 ${shopId} 采集任务已启动` : '采集任务已启动',
        task_id: result.pid?.toString(),
      };
    } catch (error: any) {
      this.logger.error(`触发采集失败: ${error.message}`);
      return { success: false, message: `触发采集失败: ${error.message}` };
    }
  }

  async triggerDailyPush(shopId?: string): Promise<void> {
    await this.runScraperCommand('cron', this.buildDailyPushArgs(shopId), true);
  }

  async triggerLogin(shopId?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.runScraperCommand('login', this.buildLoginArgs(shopId), false);
      return { success: true, message: '登录流程已启动，请稍后查看二维码' };
    } catch (error: any) {
      this.logger.error(`触发登录失败: ${error.message}`);
      return { success: false, message: `触发登录失败: ${error.message}` };
    }
  }

  async uploadCookie(cookies: any[], shopId?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!Array.isArray(cookies) || cookies.length === 0) {
        return { success: false, message: 'Cookie 不能为空' };
      }

      const scraperDir = this.resolveScraperDir();
      const cookiePath = join(scraperDir, shopId ? `cookies_${shopId}.json` : 'cookies.json');
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');

      return {
        success: true,
        message: shopId ? `Cookie 已保存到店铺 ${shopId}` : 'Cookie 已保存',
      };
    } catch (error: any) {
      this.logger.error(`保存 Cookie 失败: ${error.message}`);
      return { success: false, message: `保存 Cookie 失败: ${error.message}` };
    }
  }

  /**
   * 获取登录二维码（base64）
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
   */
  async getLoginStatus(): Promise<{ status: string; qr?: string }> {
    const readyFlag = '/tmp/douyin_login_ready';
    const doneFlag = '/tmp/douyin_login_done';

    if (fs.existsSync(doneFlag)) {
      try { fs.unlinkSync(doneFlag); } catch {}
      return { status: 'done' };
    }
    if (fs.existsSync(readyFlag)) {
      const qr = await this.getLoginQRCode();
      return { status: 'ready', qr: qr || undefined };
    }
    if (fs.existsSync('/tmp/douyin_login_qr.png')) {
      return { status: 'waiting_qr' };
    }
    return { status: 'idle' };
  }
}
export { DouyinConfigService } from './douyin-config.service';
