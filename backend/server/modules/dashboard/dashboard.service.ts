import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { product, inboundRecord, outboundRecord, alertRecord, dailyInventoryStats } from '@server/database/schema';
import { eq, and, gte, lte, sql, count, sum, desc } from 'drizzle-orm';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getDashboardStats(): Promise<{
    totalStockValue: number;
    totalProducts: number;
    totalCategories: number;
    totalWarehouses: number;
    totalAlerts: number;
    totalInboundToday: number;
    totalOutboundToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const [totalStats] = await this.db
      .select({
        stockValue: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)`,
        productCount: count(product.id),
      })
      .from(product);

    const [categoryResult] = await this.db
      .selectDistinct({ category: product.category })
      .from(product)
      .where(sql`${product.category} IS NOT NULL`);

    const categories = categoryResult?.category ? [categoryResult.category] : [];

    const [alertStats] = await this.db
      .select({ count: count() })
      .from(alertRecord);

    const [inboundStats] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)` })
      .from(inboundRecord)
      .where(
        and(
          gte(inboundRecord.createdAt, today),
          lte(inboundRecord.createdAt, todayEnd),
        ),
      );

    const [outboundStats] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${outboundRecord.quantity}), 0)` })
      .from(outboundRecord)
      .where(
        and(
          gte(outboundRecord.createdAt, today),
          lte(outboundRecord.createdAt, todayEnd),
        ),
      );

    return {
      totalStockValue: Number(totalStats.stockValue),
      totalProducts: Number(totalStats.productCount),
      totalCategories: categories.length,
      totalWarehouses: 3,
      totalAlerts: Number(alertStats.count),
      totalInboundToday: Number(inboundStats.total),
      totalOutboundToday: Number(outboundStats.total),
    };
  }

  async getInventoryDistribution(): Promise<{
    category: string;
    stockValue: number;
    percentage: number;
  }[]> {
    const stats = await this.db
      .select({
        category: product.category,
        stockValue: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)`,
      })
      .from(product)
      .where(sql`${product.category} IS NOT NULL`)
      .groupBy(product.category);

    const totalValue = stats.reduce((sum, item) => sum + (Number(item.stockValue) || 0), 0);

    return stats.map(item => ({
      category: item.category || '未分类',
      stockValue: Number(item.stockValue),
      percentage: totalValue > 0 ? Math.round((Number(item.stockValue) / totalValue) * 100) : 0,
    }));
  }

  async getRecentAlerts(limit: number = 5): Promise<{
    id: string;
    productId: string;
    productName: string;
    alertType: string;
    currentStock: number;
    safetyStock: number;
    createdAt: string;
  }[]> {
    const alerts = await this.db
      .select()
      .from(alertRecord)
      .orderBy(desc(alertRecord.createdAt))
      .limit(limit);

    return alerts.map(alert => ({
      id: alert.id,
      productId: alert.productId,
      productName: alert.productName,
      alertType: alert.alertType,
      currentStock: alert.currentStock,
      safetyStock: alert.safetyStock,
      createdAt: alert.createdAt.toISOString(),
    }));
  }

  async getRecentTransactions(limit: number = 10): Promise<{
    id: string;
    type: 'inbound' | 'outbound';
    productName: string;
    quantity: number;
    operator: string;
    createdAt: string;
  }[]> {
    const inboundItems = await this.db
      .select({
        id: inboundRecord.id,
        productName: inboundRecord.items,
        quantity: inboundRecord.quantity,
        operator: inboundRecord.operator,
        createdAt: inboundRecord.createdAt,
      })
      .from(inboundRecord)
      .orderBy(desc(inboundRecord.createdAt))
      .limit(limit);

    const outboundItems = await this.db
      .select({
        id: outboundRecord.id,
        productName: outboundRecord.items,
        quantity: outboundRecord.quantity,
        operator: outboundRecord.operator,
        createdAt: outboundRecord.createdAt,
      })
      .from(outboundRecord)
      .orderBy(desc(outboundRecord.createdAt))
      .limit(limit);

    const inboundTrans = inboundItems.map(item => {
      const items = item.productName as any[] || [];
      return {
        id: item.id,
        type: 'inbound' as const,
        productName: items[0]?.productName || '未知货品',
        quantity: item.quantity,
        operator: item.operator,
        createdAt: item.createdAt.toISOString(),
      };
    });

    const outboundTrans = outboundItems.map(item => {
      const items = item.productName as any[] || [];
      return {
        id: item.id,
        type: 'outbound' as const,
        productName: items[0]?.productName || '未知货品',
        quantity: item.quantity,
        operator: item.operator,
        createdAt: item.createdAt.toISOString(),
      };
    });

    return [...inboundTrans, ...outboundTrans]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 基础统计数据
    const [totalStats] = await this.db
      .select({
        stockValue: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)`,
        productCount: count(product.id),
      })
      .from(product);

    // 今日出入库
    const [inboundStats] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)` })
      .from(inboundRecord)
      .where(and(gte(inboundRecord.createdAt, today), lte(inboundRecord.createdAt, todayEnd)));

    const [outboundStats] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${outboundRecord.quantity}), 0)` })
      .from(outboundRecord)
      .where(and(gte(outboundRecord.createdAt, today), lte(outboundRecord.createdAt, todayEnd)));

    // 分类分布
    const categoryStats = await this.db
      .select({
        category: product.category,
        count: count(product.id),
        value: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)`,
      })
      .from(product)
      .where(sql`${product.category} IS NOT NULL`)
      .groupBy(product.category);

    // 分类分布（按商品名称，反映相同商品在不同店铺的分布）
    const nameStats = await this.db
      .select({
        name: product.name,
        count: count(product.id),
        value: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)`,
      })
      .from(product)
      .where(sql`${product.name} IS NOT NULL`)
      .groupBy(product.name)
      .orderBy(desc(count(product.id)))
      .limit(20);

    // 店铺分布
    const shopStats = await this.db
      .select({
        shopId: product.shopId,
        count: count(product.id),
        value: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)`,
      })
      .from(product)
      .where(sql`${product.shopId} IS NOT NULL AND ${product.shopId} != ''`)
      .groupBy(product.shopId);

    // 从入库记录统计仓库分布
    const warehouseInboundStats = await this.db
      .select({
        warehouse: inboundRecord.warehouse,
        count: sql<number>`COUNT(DISTINCT ${inboundRecord.productId})`,
        quantity: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)`,
      })
      .from(inboundRecord)
      .where(sql`${inboundRecord.warehouse} IS NOT NULL`)
      .groupBy(inboundRecord.warehouse);

    // 预警和滞销产品数量
    const [warningResult] = await this.db
      .select({ count: count() })
      .from(product)
      .where(sql`${product.currentStock} < ${product.safetyStock}`);

    const [overstockResult] = await this.db
      .select({ count: count() })
      .from(product)
      .where(eq(product.sellableStatus, 'overstock'));

    // 仓库统计（用于KPI卡片）- 基于入库记录
    const warehouseValues = await this.db
      .select({
        warehouse: inboundRecord.warehouse,
        value: sql<number>`COALESCE(SUM(${inboundRecord.quantity} * ${product.costPrice}), 0)`,
        count: sql<number>`COUNT(DISTINCT ${inboundRecord.productId})`,
        quantity: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)`,
      })
      .from(inboundRecord)
      .innerJoin(product, eq(inboundRecord.productId, product.id))
      .where(sql`${inboundRecord.warehouse} IS NOT NULL`)
      .groupBy(inboundRecord.warehouse);

    // 仓库商品数量统计
    const warehouseProductCounts = await this.db
      .select({
        warehouse: inboundRecord.warehouse,
        value: sql<number>`COALESCE(SUM(${inboundRecord.quantity} * ${product.costPrice}), 0)`,
        count: sql<number>`COUNT(DISTINCT ${inboundRecord.productId})`,
        quantity: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)`,
      })
      .from(inboundRecord)
      .innerJoin(product, eq(inboundRecord.productId, product.id))
      .where(sql`${inboundRecord.warehouse} IS NOT NULL`)
      .groupBy(inboundRecord.warehouse);

    return {
      totalStockValue: Number(totalStats.stockValue),
      totalProductCount: Number(totalStats.productCount),
      todayInbound: Number(inboundStats.total),
      todayOutbound: Number(outboundStats.total),
      warningProductCount: Number(warningResult.count),
      overstockProductCount: Number(overstockResult.count),
      categoryDistribution: categoryStats.map(item => ({
        category: item.category || '未分类',
        count: Number(item.count),
        value: Number(item.value),
      })),
      nameDistribution: nameStats.map(item => ({
        name: item.name || '未知商品',
        count: Number(item.count),
        value: Number(item.value),
      })),
      shopDistribution: shopStats.map(item => ({
        shopId: item.shopId || '',
        count: Number(item.count),
        value: Number(item.value),
      })),
      warehouseDistribution: warehouseInboundStats.map(item => ({
        category: item.warehouse || '默认仓库',
        count: Number(item.count),
        value: Number(item.quantity),
      })),
      warehouseValues: warehouseValues.map(item => ({
        warehouse: item.warehouse || '默认仓库',
        value: Number(item.value),
        count: Number(item.count),
        quantity: Number(item.quantity),
      })),
      warehouseProductCounts: warehouseProductCounts.map(item => ({
        warehouse: item.warehouse || '默认仓库',
        value: Number(item.value),
        count: Number(item.count),
        quantity: Number(item.quantity),
      })),
    };
  }

  async getAlerts() {
    return this.getRecentAlerts(5);
  }

  async getTrendData(days: number = 7): Promise<{
    dates: string[];
    inbound: number[];
    outbound: number[];
    stockValue: number[];
  }> {
    const dates: string[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const inbound: number[] = [];
    const outbound: number[] = [];
    const stockValue: number[] = [];

    for (const date of dates) {
      const startDate = new Date(`${date}T00:00:00Z`);
      const endDate = new Date(`${date}T23:59:59Z`);

      const [inboundResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)` })
        .from(inboundRecord)
        .where(
          and(
            gte(inboundRecord.createdAt, startDate),
            lte(inboundRecord.createdAt, endDate),
          ),
        );

      const [outboundResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${outboundRecord.quantity}), 0)` })
        .from(outboundRecord)
        .where(
          and(
            gte(outboundRecord.createdAt, startDate),
            lte(outboundRecord.createdAt, endDate),
          ),
        );

      const [valueResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${product.currentStock} * ${product.costPrice}), 0)` })
        .from(product);

      inbound.push(Number(inboundResult.total) || 0);
      outbound.push(Number(outboundResult.total) || 0);
      stockValue.push(Math.round((Number(valueResult.total) || 0) / 10000));
    }

    return { dates, inbound, outbound, stockValue };
  }
}
