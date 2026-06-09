import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { outboundRecord, product, alertRecord } from '@server/database/schema';
import { eq, desc, and, gte, lte, sql, count, inArray, like } from 'drizzle-orm';
import type {
  CreateOutboundRequest,
  UpdateOutboundRequest,
  OutboundListParams,
  OutboundRecord as IOutboundRecord,
  OutboundListResponse,
  OutboundItem,
} from '@shared/api.interface';
import { OrderNumberService } from '../order-number/order-number.service';

@Injectable()
export class OutboundService {
  private readonly logger = new Logger(OutboundService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly orderNumberService: OrderNumberService,
  ) {}

  async create(data: CreateOutboundRequest, userId: string): Promise<IOutboundRecord> {
    try {
      if (!data.items || data.items.length === 0) {
        throw new BadRequestException('请至少选择一个货品');
      }

      const productIds = data.items.map(item => item.productId);
      const products = await this.db
        .select()
        .from(product)
        .where(inArray(product.id, productIds));

      const productMap = new Map(products.map(p => [p.id, p]));

      for (const item of data.items) {
        const productData = productMap.get(item.productId);
        if (!productData) {
          throw new NotFoundException(`货品不存在: ${item.productId}`);
        }
        if (item.quantity > (productData.currentStock || 0)) {
          throw new BadRequestException(
            `库存不足: ${productData.name}，当前库存: ${productData.currentStock}，出库数量: ${item.quantity}`
          );
        }
      }

      const itemsWithName: OutboundItem[] = data.items.map(item => ({
        productId: item.productId,
        productName: productMap.get(item.productId)?.name || '',
        quantity: item.quantity,
      }));

      const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
      const firstItem = data.items[0];

      const [tempRecord] = await this.db
        .insert(outboundRecord)
        .values({
          productId: firstItem.productId,
          quantity: firstItem.quantity,
          operator: data.operator,
          warehouse: data.warehouse,
          remark: data.remark,
          orderNo: 'TEMP',
          outType: data.outType || 'sales',
          outboundType: data.outboundType || 'sale',
          sourceWarehouse: data.sourceWarehouse || null,
          attachments: data.attachments || [],
          items: itemsWithName,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      let record: typeof tempRecord;
      try {
        const orderNo = await this.orderNumberService.generateOrderNumber('outbound', tempRecord.id);

        const [updatedRecord] = await this.db
          .update(outboundRecord)
          .set({ orderNo })
          .where(eq(outboundRecord.id, tempRecord.id))
          .returning();

        record = updatedRecord;
      } catch (error) {
        await this.db.delete(outboundRecord).where(eq(outboundRecord.id, tempRecord.id));
        throw error;
      }

      for (const item of data.items) {
        await this.db
          .update(product)
          .set({
            currentStock: sql`${product.currentStock} - ${item.quantity}`,
          })
          .where(eq(product.id, item.productId));

        const [productData] = await this.db
          .select()
          .from(product)
          .where(eq(product.id, item.productId));

        if (productData && (productData.currentStock || 0) < (productData.safetyStock || 0)) {
          const existingAlerts = await this.db
            .select()
            .from(alertRecord)
            .where(
              and(
                eq(alertRecord.productId, item.productId),
                eq(alertRecord.alertType, 'emergency'),
                eq(alertRecord.isHandled, false),
              ),
            );

          if (existingAlerts.length === 0) {
            await this.db.insert(alertRecord).values({
              productId: item.productId,
              productName: productData.name,
              alertType: 'emergency',
              currentStock: productData.currentStock || 0,
              safetyStock: productData.safetyStock || 0,
              shortAmount: (productData.safetyStock || 0) - (productData.currentStock || 0),
              sellableDays: productData.sellableDays,
              sellableStatus: productData.sellableStatus,
            });
          }
        }
      }

      return {
        id: record.id,
        productId: record.productId,
        productName: productMap.get(firstItem.productId)?.name || '',
        quantity: record.quantity,
        operator: record.operator,
        warehouse: record.warehouse || undefined,
        remark: record.remark || undefined,
        orderNo: record.orderNo || undefined,
        outType: (record.outType as IOutboundRecord['outType']) || 'sales',
        outboundType: record.outboundType || 'sale',
        sourceWarehouse: record.sourceWarehouse || undefined,
        attachments: record.attachments || [],
        attachmentCount: (record.attachments || []).length,
        items: itemsWithName,
        itemCount: itemsWithName.length,
        totalQuantity: totalQuantity,
        createdAt: record.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('创建出库记录失败', error);
      throw error;
    }
  }

  async findAll(params: OutboundListParams): Promise<OutboundListResponse> {
    try {
      const { page = 1, pageSize = 20, productId, orderNo, outType, outboundType, startDate, endDate } = params;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (productId) {
        conditions.push(
          sql`(
            ${outboundRecord.productId} = ${productId}
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(${outboundRecord.items}) AS item
              WHERE item->>'productId' = ${productId}
            )
          )`
        );
      }
      if (orderNo) {
        conditions.push(like(outboundRecord.orderNo, `%${orderNo}%`));
      }
      if (outType) {
        conditions.push(eq(outboundRecord.outType, outType));
      }
      if (params.outboundType) {
        conditions.push(eq(outboundRecord.outboundType, params.outboundType));
      }
      if (startDate) {
        conditions.push(gte(outboundRecord.createdAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(outboundRecord.createdAt, new Date(endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.db
        .select({ count: count() })
        .from(outboundRecord)
        .where(whereClause || sql`TRUE`);

      const query = whereClause
        ? this.db.select().from(outboundRecord).where(whereClause)
        : this.db.select().from(outboundRecord);

      const records = await query
        .orderBy(desc(outboundRecord.createdAt))
        .limit(pageSize)
        .offset(offset);

      const allProductIds = new Set<string>();
      records.forEach(record => {
        const items = (record.items as OutboundItem[]) || [];
        items.forEach((item: OutboundItem) => allProductIds.add(item.productId));
      });
      records.forEach(record => allProductIds.add(record.productId));

      const productIds = Array.from(allProductIds);
      const products = productIds.length > 0
        ? await this.db.select().from(product).where(inArray(product.id, productIds))
        : [];

      const productMap = new Map(products.map(p => [p.id, p]));

      const items: IOutboundRecord[] = records.map(record => {
        const items: OutboundItem[] = (record.items as OutboundItem[]) || [];
        const firstItem = items[0] || { productId: record.productId, quantity: record.quantity };
        const firstProduct = productMap.get(firstItem.productId);
        
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
          id: record.id,
          productId: firstItem.productId,
          productName: firstProduct?.name || items[0]?.productName || '未知货品',
          quantity: record.quantity,
          operator: record.operator,
          warehouse: record.warehouse || undefined,
          remark: record.remark || undefined,
          orderNo: record.orderNo || undefined,
          outType: (record.outType as IOutboundRecord['outType']) || 'sales',
          outboundType: record.outboundType || 'sale',
          sourceWarehouse: record.sourceWarehouse || undefined,
          attachments: record.attachments || [],
          attachmentCount: (record.attachments || []).length,
          items: items,
          itemCount: items.length,
          totalQuantity: totalQuantity,
          createdAt: record.createdAt.toISOString(),
        };
      });

      return {
        items,
        total: Number(countResult.count),
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error('获取出库记录列表失败', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<IOutboundRecord & { product: typeof product.$inferSelect }> {
    try {
      const [record] = await this.db
        .select()
        .from(outboundRecord)
        .where(eq(outboundRecord.id, id));

      if (!record) {
        throw new NotFoundException('出库记录不存在');
      }

      const items: OutboundItem[] = (record.items as OutboundItem[]) || [];
      const firstItem = items[0] || { productId: record.productId };
      
      const [productData] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, firstItem.productId));

      if (!productData) {
        throw new NotFoundException('关联货品不存在');
      }

      const productIds = items.map(i => i.productId);
      const allProducts = productIds.length > 0
        ? await this.db.select().from(product).where(inArray(product.id, productIds))
        : [];
      const allProductMap = new Map(allProducts.map(p => [p.id, p]));

      return {
        id: record.id,
        productId: firstItem.productId,
        productName: productData.name,
        quantity: record.quantity,
        operator: record.operator,
        warehouse: record.warehouse || undefined,
        remark: record.remark || undefined,
        orderNo: record.orderNo || undefined,
        outType: (record.outType as IOutboundRecord['outType']) || 'sales',
        outboundType: record.outboundType || 'sale',
        sourceWarehouse: record.sourceWarehouse || undefined,
        attachments: record.attachments || [],
        attachmentCount: (record.attachments || []).length,
        items: items,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        createdAt: record.createdAt.toISOString(),
        product: productData,
      };
    } catch (error) {
      this.logger.error('获取出库记录详情失败', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateOutboundRequest, userId?: string): Promise<IOutboundRecord> {
    try {
      const [existing] = await this.db
        .select()
        .from(outboundRecord)
        .where(eq(outboundRecord.id, id));

      if (!existing) {
        throw new NotFoundException('出库记录不存在');
      }

      const updateData: Partial<typeof outboundRecord.$inferInsert> = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.operator !== undefined) updateData.operator = data.operator;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (userId !== undefined) updateData.updatedBy = userId;

      const [record] = await this.db
        .update(outboundRecord)
        .set(updateData)
        .where(eq(outboundRecord.id, id))
        .returning();

      const items: OutboundItem[] = (record.items as OutboundItem[]) || [];
      const firstItem = items[0] || { productId: record.productId, quantity: record.quantity };
      const [productData] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, firstItem.productId));

      return {
        id: record.id,
        productId: firstItem.productId,
        productName: productData?.name || items[0]?.productName || '未知货品',
        quantity: record.quantity,
        operator: record.operator,
        warehouse: record.warehouse || undefined,
        remark: record.remark || undefined,
        orderNo: record.orderNo || undefined,
        outType: (record.outType as IOutboundRecord['outType']) || 'sales',
        outboundType: record.outboundType || 'sale',
        sourceWarehouse: record.sourceWarehouse || undefined,
        attachments: record.attachments || [],
        attachmentCount: (record.attachments || []).length,
        items: items,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        createdAt: record.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('更新出库记录失败', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const [existing] = await this.db
        .select()
        .from(outboundRecord)
        .where(eq(outboundRecord.id, id));

      if (!existing) {
        throw new NotFoundException('出库记录不存在');
      }

      await this.db.delete(outboundRecord).where(eq(outboundRecord.id, id));
    } catch (error) {
      this.logger.error('删除出库记录失败', error);
      throw error;
    }
  }
}
