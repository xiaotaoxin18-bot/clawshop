import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { inboundRecord, product, alertRecord } from '@server/database/schema';
import { eq, desc, and, gte, lte, sql, count, inArray, like } from 'drizzle-orm';
import type {
  CreateInboundRequest,
  UpdateInboundRequest,
  InboundListParams,
  InboundRecord as IInboundRecord,
  InboundListResponse,
  InboundItem,
} from '@shared/api.interface';
import { OrderNumberService } from '../order-number/order-number.service';

@Injectable()
export class InboundService {
  private readonly logger = new Logger(InboundService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly orderNumberService: OrderNumberService,
  ) {}

  async create(data: CreateInboundRequest, userId: string): Promise<IInboundRecord> {
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
        if (!productMap.has(item.productId)) {
          throw new NotFoundException(`货品不存在: ${item.productId}`);
        }
      }

      const itemsWithName: InboundItem[] = data.items.map(item => ({
        productId: item.productId,
        productName: productMap.get(item.productId)?.name || '',
        quantity: item.quantity,
      }));

      const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
      const firstItem = data.items[0];

      const [tempRecord] = await this.db
        .insert(inboundRecord)
        .values({
          productId: firstItem.productId,
          quantity: firstItem.quantity,
          operator: data.operator,
          warehouse: data.warehouse,
          remark: data.remark,
          orderNo: 'TEMP',
          inType: data.inType || 'tear_order',
          attachments: data.attachments || [],
          items: itemsWithName,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      let record: typeof tempRecord;
      try {
        const orderNo = await this.orderNumberService.generateOrderNumber('inbound', tempRecord.id);

        const [updatedRecord] = await this.db
          .update(inboundRecord)
          .set({ orderNo })
          .where(eq(inboundRecord.id, tempRecord.id))
          .returning();

        record = updatedRecord;
      } catch (error) {
        await this.db.delete(inboundRecord).where(eq(inboundRecord.id, tempRecord.id));
        throw error;
      }

      for (const item of data.items) {
        await this.db
          .update(product)
          .set({
            currentStock: sql`${product.currentStock} + ${item.quantity}`,
          })
          .where(eq(product.id, item.productId));

        await this.checkAndResolveAlert(item.productId);
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
        inType: record.inType as IInboundRecord['inType'] || 'tear_order',
        attachments: record.attachments || [],
        attachmentCount: (record.attachments || []).length,
        items: itemsWithName,
        itemCount: itemsWithName.length,
        totalQuantity: totalQuantity,
        createdAt: record.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('创建入库记录失败', error);
      throw error;
    }
  }

  async findAll(params: InboundListParams): Promise<InboundListResponse> {
    try {
      const { page = 1, pageSize = 20, productId, orderNo, inType, startDate, endDate } = params;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (productId) {
        conditions.push(
          sql`(
            ${inboundRecord.productId} = ${productId}
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(${inboundRecord.items}) AS item
              WHERE item->>'productId' = ${productId}
            )
          )`
        );
      }
      if (orderNo) {
        conditions.push(like(inboundRecord.orderNo, `%${orderNo}%`));
      }
      if (inType) {
        conditions.push(eq(inboundRecord.inType, inType));
      }
      if (startDate) {
        conditions.push(gte(inboundRecord.createdAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(inboundRecord.createdAt, new Date(endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = whereClause
        ? this.db.select().from(inboundRecord).where(whereClause)
        : this.db.select().from(inboundRecord);

      const [countResult] = await this.db
        .select({ count: count() })
        .from(inboundRecord)
        .where(whereClause || sql`TRUE`);

      const records = await query
        .orderBy(desc(inboundRecord.createdAt))
        .limit(pageSize)
        .offset(offset);

      const allProductIds = new Set<string>();
      records.forEach(record => {
        const items = (record.items as InboundItem[]) || [];
        items.forEach((item: InboundItem) => allProductIds.add(item.productId));
      });
      records.forEach(record => allProductIds.add(record.productId));

      const productIds = Array.from(allProductIds);
      const products = productIds.length > 0
        ? await this.db.select().from(product).where(inArray(product.id, productIds))
        : [];

      const productMap = new Map(products.map(p => [p.id, p]));

      const items: IInboundRecord[] = records.map(record => {
        const items: InboundItem[] = (record.items as InboundItem[]) || [];
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
          inType: record.inType as IInboundRecord['inType'] || 'tear_order',
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
      this.logger.error('获取入库记录列表失败', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<IInboundRecord & { product: typeof product.$inferSelect }> {
    try {
      const [record] = await this.db
        .select()
        .from(inboundRecord)
        .where(eq(inboundRecord.id, id));

      if (!record) {
        throw new NotFoundException('入库记录不存在');
      }

      const items: InboundItem[] = (record.items as InboundItem[]) || [];
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
        inType: record.inType as IInboundRecord['inType'] || 'tear_order',
        attachments: record.attachments || [],
        attachmentCount: (record.attachments || []).length,
        items: items,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        createdAt: record.createdAt.toISOString(),
        product: productData,
      };
    } catch (error) {
      this.logger.error('获取入库记录详情失败', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateInboundRequest, userId?: string): Promise<IInboundRecord> {
    try {
      const [existing] = await this.db
        .select()
        .from(inboundRecord)
        .where(eq(inboundRecord.id, id));

      if (!existing) {
        throw new NotFoundException('入库记录不存在');
      }

      const updateData: Partial<typeof inboundRecord.$inferInsert> = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.operator !== undefined) updateData.operator = data.operator;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (userId !== undefined) updateData.updatedBy = userId;

      const [record] = await this.db
        .update(inboundRecord)
        .set(updateData)
        .where(eq(inboundRecord.id, id))
        .returning();

      const items: InboundItem[] = (record.items as InboundItem[]) || [];
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
        inType: record.inType as IInboundRecord['inType'] || 'tear_order',
        attachments: record.attachments || [],
        attachmentCount: (record.attachments || []).length,
        items: items,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        createdAt: record.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('更新入库记录失败', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const [existing] = await this.db
        .select()
        .from(inboundRecord)
        .where(eq(inboundRecord.id, id));

      if (!existing) {
        throw new NotFoundException('入库记录不存在');
      }

      await this.db.delete(inboundRecord).where(eq(inboundRecord.id, id));
    } catch (error) {
      this.logger.error('删除入库记录失败', error);
      throw error;
    }
  }

  private async checkAndResolveAlert(productId: string): Promise<void> {
    const [productData] = await this.db
      .select()
      .from(product)
      .where(eq(product.id, productId));

    if (!productData) return;

    if ((productData.currentStock || 0) >= (productData.safetyStock || 0)) {
      await this.db
        .update(alertRecord)
        .set({ isHandled: true, handledAt: new Date() })
        .where(
          and(
            eq(alertRecord.productId, productId),
            eq(alertRecord.alertType, 'emergency'),
            eq(alertRecord.isHandled, false),
          ),
        );
    }
  }
}
