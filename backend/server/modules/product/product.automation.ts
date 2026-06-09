import { Injectable, Logger } from '@nestjs/common';
import { Automation, BindTrigger } from '@lark-apaas/fullstack-nestjs-core';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { Inject } from '@nestjs/common';
import { product, outboundRecord } from '@server/database/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

/**
 * 产品自动化任务服务
 * 自动更新可售天数：基于每个产品的当前库存和最近14天销售数据
 */
@Automation()
export class ProductAutomationService {
  private readonly logger = new Logger(ProductAutomationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 计算产品在指定天数内的销售出库总量
   */
  private async calculateSalesOutbound(productId: string, days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        totalQuantity: sql<number>`COALESCE(SUM(${outboundRecord.quantity}), 0)`,
      })
      .from(outboundRecord)
      .where(
        and(
          sql`${outboundRecord.items} @> ${JSON.stringify([{ productId }])}::jsonb`,
          eq(outboundRecord.outboundType, 'sale'),
          gte(outboundRecord.createdAt, startDate),
        ),
      );

    return Number(result[0]?.totalQuantity) || 0;
  }

  @BindTrigger('inventory_safety_stock_auto_update')
  async updateSellableDaysFromOutbound() {
    this.logger.log('开始执行可售天数自动更新任务');

    try {
      // 导入product service来获取阈值配置
      const { ProductService } = await import('./product.service');
      const productService = new ProductService(this.db);
      const config = await productService.getThresholdConfig();

      // 查询所有产品
      const products = await this.db.select().from(product);

      let updatedCount = 0;

      for (const prod of products) {
        const currentStock = prod.currentStock || 0;
        
        // 计算可售天数
        const newSellableDays = await productService.calculateSellableDays(prod.id, currentStock);
        const newSellableStatus = productService['calculateSellableStatus'](newSellableDays, config);

        // 更新可售天数和状态
        if (newSellableDays !== prod.sellableDays) {
          await this.db
            .update(product)
            .set({
              sellableDays: newSellableDays,
              sellableStatus: newSellableStatus,
            })
            .where(eq(product.id, prod.id));

          this.logger.log(
            `更新产品 [${prod.name}] 可售天数: ${prod.sellableDays ?? '-'} -> ${newSellableDays.toFixed(1)}天 (状态: ${newSellableStatus})`,
          );
          updatedCount++;
        }
      }

      this.logger.log(
        `安全库存线自动更新任务完成，共更新 ${updatedCount} 个产品`,
      );
    } catch (error) {
      this.logger.error('安全库存线自动更新任务失败', error);
      throw error;
    }
  }
}
