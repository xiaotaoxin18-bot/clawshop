import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { alertRecord, product } from '@server/database/schema';
import { eq, desc, and, sql, count, gte } from 'drizzle-orm';
import type {
  AlertRecord,
  AlertListParams,
  AlertListResponse,
  AlertStatistics,
  HighFrequencyAlertProduct,
  HandleAlertRequest,
  AlertType,
  SellableStatus,
  UpdateAlertStatusRequest,
} from '@shared/api.interface';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async createFromProductStock(productId: string): Promise<AlertRecord | null> {
    const [productData] = await this.db
      .select()
      .from(product)
      .where(eq(product.id, productId));

    if (!productData) {
      return null;
    }

    const currentStock = productData.currentStock || 0;
    const safetyStock = productData.safetyStock || 0;
    
    if (currentStock >= safetyStock) {
      return null;
    }

    const existingAlerts = await this.db
      .select()
      .from(alertRecord)
      .where(
        and(
          eq(alertRecord.productId, productId),
          eq(alertRecord.alertType, 'emergency'),
          eq(alertRecord.isHandled, false),
        ),
      );

    if (existingAlerts.length > 0) {
      return this.mapToAlertRecord(existingAlerts[0]);
    }

    const [record] = await this.db
      .insert(alertRecord)
      .values({
        productId: productData.id,
        productName: productData.name,
        alertType: 'emergency',
        currentStock: currentStock,
        safetyStock: safetyStock,
        shortAmount: safetyStock - currentStock,
        sellableDays: productData.sellableDays,
        sellableStatus: productData.sellableStatus,
      })
      .returning();

    return this.mapToAlertRecord(record);
  }

  // 查询预警列表
  async findAll(params: AlertListParams): Promise<AlertListResponse> {
    try {
      const { page = 1, pageSize = 20, alertType, isHandled } = params;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (alertType) {
        conditions.push(eq(alertRecord.alertType, alertType));
      }
      if (params.unreadOnly) {
        conditions.push(eq(alertRecord.isRead, false));
      }
      if (isHandled !== undefined) {
        conditions.push(eq(alertRecord.isHandled, isHandled));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.db
        .select({ count: count() })
        .from(alertRecord)
        .where(whereClause || sql`TRUE`);

      const query = whereClause
        ? this.db.select().from(alertRecord).where(whereClause)
        : this.db.select().from(alertRecord);

      const records = await query
        .orderBy(desc(alertRecord.createdAt))
        .limit(pageSize)
        .offset(offset);

      const items = records.map(record => this.mapToAlertRecord(record));

      return {
        items,
        total: Number(countResult.count),
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error('获取预警列表失败', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<AlertRecord> {
    try {
      const [record] = await this.db
        .select()
        .from(alertRecord)
        .where(eq(alertRecord.id, id));

      if (!record) {
        throw new NotFoundException('预警记录不存在');
      }

      return this.mapToAlertRecord(record);
    } catch (error) {
      this.logger.error('获取预警详情失败', error);
      throw error;
    }
  }

  async updateStatus(id: string, data: UpdateAlertStatusRequest): Promise<AlertRecord> {
    try {
      const [existing] = await this.db
        .select()
        .from(alertRecord)
        .where(eq(alertRecord.id, id));

      if (!existing) {
        throw new NotFoundException('预警记录不存在');
      }

      const updateData: Partial<typeof alertRecord.$inferInsert> = {};
      if (data.isRead !== undefined) updateData.isRead = data.isRead;
      if (data.isHandled !== undefined) {
        updateData.isHandled = data.isHandled;
        if (data.isHandled) {
          updateData.handledAt = new Date();
        }
      }

      const [record] = await this.db
        .update(alertRecord)
        .set(updateData)
        .where(eq(alertRecord.id, id))
        .returning();

      return this.mapToAlertRecord(record);
    } catch (error) {
      this.logger.error('更新预警状态失败', error);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<AlertRecord> {
    return this.updateStatus(id, { isRead: true });
  }

  async markAsHandled(id: string): Promise<AlertRecord> {
    return this.updateStatus(id, { isHandled: true });
  }

  async getStatistics(): Promise<AlertStatistics> {
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(alertRecord);

    const [pendingResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.isHandled, false));

    const [emergencyResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.alertType, 'emergency'));

    const [overstockResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.alertType, 'overstock'));

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(gte(alertRecord.createdAt, firstDayOfMonth));

    const [handledResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.isHandled, true));

    const total = Number(totalResult.count) || 1;
    const handled = Number(handledResult.count);

    return {
      totalCount: Number(totalResult.count),
      pendingCount: Number(pendingResult.count),
      emergencyCount: Number(emergencyResult.count),
      overstockCount: Number(overstockResult.count),
      thisMonthCount: Number(thisMonthResult.count),
      handledCount: handled,
      handleRate: Math.round((handled / total) * 100),
    };
  }

  async getHighFrequencyAlerts(limit: number): Promise<HighFrequencyAlertProduct[]> {
    const result = await this.db
      .select({
        productId: alertRecord.productId,
        productName: alertRecord.productName,
        alertCount: count(alertRecord.id),
        lastAlertAt: sql<string>`MAX(${alertRecord.createdAt})::text`,
      })
      .from(alertRecord)
      .groupBy(alertRecord.productId, alertRecord.productName)
      .orderBy(desc(sql`COUNT(${alertRecord.id})`))
      .limit(limit);

    return result.map(item => ({
      productId: item.productId,
      productName: item.productName,
      alertCount: Number(item.alertCount),
      lastAlertAt: item.lastAlertAt,
    }));
  }

  async handleAlert(id: string, data: HandleAlertRequest): Promise<AlertRecord> {
    return this.updateStatus(id, { isHandled: data.isHandled });
  }

  async getNotificationSettings(userId: string): Promise<any> {
    return {
      email: true,
      inApp: true,
      emergencyOnly: false,
    };
  }

  async saveNotificationSettings(userId: string, data: any): Promise<any> {
    return data;
  }

  async migrateLocalStorage(userId: string, data: any): Promise<any> {
    return { success: true, migrated: 0 };
  }

  async syncAlertsFromProducts(): Promise<void> {
    const products = await this.db.select().from(product);

    for (const prod of products) {
      const currentStock = prod.currentStock || 0;
      const safetyStock = prod.safetyStock || 0;

      if (currentStock < safetyStock) {
        const existingAlerts = await this.db
          .select()
          .from(alertRecord)
          .where(
            and(
              eq(alertRecord.productId, prod.id),
              eq(alertRecord.alertType, 'emergency'),
              eq(alertRecord.isHandled, false),
            ),
          );

        if (existingAlerts.length === 0) {
          await this.db.insert(alertRecord).values({
            productId: prod.id,
            productName: prod.name,
            alertType: 'emergency',
            currentStock: currentStock,
            safetyStock: safetyStock,
            shortAmount: safetyStock - currentStock,
            sellableDays: prod.sellableDays,
            sellableStatus: prod.sellableStatus,
          });
        }
      }
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const [existing] = await this.db
        .select()
        .from(alertRecord)
        .where(eq(alertRecord.id, id));

      if (!existing) {
        throw new NotFoundException('预警记录不存在');
      }

      await this.db.delete(alertRecord).where(eq(alertRecord.id, id));
    } catch (error) {
      this.logger.error('删除预警记录失败', error);
      throw error;
    }
  }

  async getAlertStats(): Promise<{
    total: number;
    unread: number;
    unhandled: number;
    emergency: number;
    overstock: number;
  }> {
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(alertRecord);

    const [unreadResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.isRead, false));

    const [unhandledResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.isHandled, false));

    const [emergencyResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.alertType, 'emergency'));

    const [overstockResult] = await this.db
      .select({ count: count() })
      .from(alertRecord)
      .where(eq(alertRecord.alertType, 'overstock'));

    return {
      total: Number(totalResult.count),
      unread: Number(unreadResult.count),
      unhandled: Number(unhandledResult.count),
      emergency: Number(emergencyResult.count),
      overstock: Number(overstockResult.count),
    };
  }

  async checkAllProductsAndCreateAlerts(): Promise<number> {
    const products = await this.db.select().from(product);
    let alertCount = 0;

    for (const productData of products) {
      const currentStock = productData.currentStock || 0;
      const safetyStock = productData.safetyStock || 0;

      if (currentStock < safetyStock) {
        const existingAlerts = await this.db
          .select()
          .from(alertRecord)
          .where(
            and(
              eq(alertRecord.productId, productData.id),
              eq(alertRecord.alertType, 'emergency'),
              eq(alertRecord.isHandled, false),
            ),
          );

        if (existingAlerts.length === 0) {
          await this.db.insert(alertRecord).values({
            productId: productData.id,
            productName: productData.name,
            alertType: 'emergency',
            currentStock: currentStock,
            safetyStock: safetyStock,
            shortAmount: safetyStock - currentStock,
            sellableDays: productData.sellableDays,
            sellableStatus: productData.sellableStatus,
          });
          alertCount++;
        }
      }
    }

    return alertCount;
  }

  private mapToAlertRecord(record: typeof alertRecord.$inferSelect): AlertRecord {
    return {
      id: record.id,
      productId: record.productId,
      productName: record.productName,
      alertType: record.alertType as AlertType,
      currentStock: record.currentStock,
      safetyStock: record.safetyStock,
      shortAmount: record.shortAmount,
      sellableDays: record.sellableDays || undefined,
      sellableStatus: (record.sellableStatus as SellableStatus) || undefined,
      isRead: record.isRead,
      isHandled: record.isHandled,
      handledAt: record.handledAt?.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
