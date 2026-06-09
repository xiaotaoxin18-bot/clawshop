import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { orderNumber } from '@server/database/schema';
import { eq, and, sql, gte, lt } from 'drizzle-orm';

@Injectable()
export class OrderNumberService {
  private readonly logger = new Logger(OrderNumberService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 生成新的订单编号
   * 格式: YYYYMMDD + 2位序号 (01-99)
   * 示例: 2026021401, 2026021402, ...
   * 每天从01开始，最大99
   * 出库和入库共享同一个订单号序列
   */
  async generateOrderNumber(orderType: 'inbound' | 'outbound', referenceId: string): Promise<string> {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      // 获取今天所有订单号（出库和入库共享序列，不按orderType过滤）
      const todayRecords = await this.db
        .select({ orderNo: orderNumber.orderNo })
        .from(orderNumber)
        .where(
          sql`CAST(${orderNumber.orderNo} AS TEXT) LIKE ${dateStr + '%'}`
        )
        .orderBy(sql`CAST(SUBSTRING(CAST(${orderNumber.orderNo} AS TEXT) FROM 9) AS INTEGER) DESC`);

      let nextSeq = 1;
      if (todayRecords.length > 0) {
        // 提取最大序号
        const maxRecord = todayRecords[0];
        const match = maxRecord.orderNo.match(/\d{8}(\d{2})/);
        if (match) {
          const currentSeq = parseInt(match[1], 10);
          if (!isNaN(currentSeq)) {
            nextSeq = currentSeq + 1;
          }
        }
      }

      if (nextSeq > 99) {
        throw new Error('今日订单号已用完，最大99');
      }

      const orderNo = `${dateStr}${String(nextSeq).padStart(2, '0')}`;

      // 插入订单号记录
      await this.db.insert(orderNumber).values({
        orderNo,
        orderType,
        referenceId,
      });

      this.logger.log(`生成订单号: ${orderNo}, 类型: ${orderType}`);
      return orderNo;
    } catch (error) {
      this.logger.error('生成订单号失败', error);
      throw error;
    }
  }

  /**
   * 获取下一个订单号（预览用，不实际生成）
   * 出库和入库共享同一个订单号序列
   */
  async peekNextOrderNumber(orderType: 'inbound' | 'outbound'): Promise<string> {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      // 获取今天所有订单号（出库和入库共享序列，不按orderType过滤）
      const [maxRecord] = await this.db
        .select({ orderNo: orderNumber.orderNo })
        .from(orderNumber)
        .where(
          sql`CAST(${orderNumber.orderNo} AS TEXT) LIKE ${dateStr + '%'}`
        )
        .orderBy(sql`CAST(SUBSTRING(CAST(${orderNumber.orderNo} AS TEXT) FROM 9) AS INTEGER) DESC`)
        .limit(1);

      let nextSeq = 1;
      if (maxRecord?.orderNo) {
        const match = maxRecord.orderNo.match(/\d{8}(\d{2})/);
        if (match) {
          const currentSeq = parseInt(match[1], 10);
          if (!isNaN(currentSeq)) {
            nextSeq = currentSeq + 1;
          }
        }
      }

      if (nextSeq > 99) {
        return '已用完';
      }

      return `${dateStr}${String(nextSeq).padStart(2, '0')}`;
    } catch (error) {
      this.logger.error('获取下一个订单号失败', error);
      throw error;
    }
  }
}
