import { Injectable, Logger, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { product, outboundRecord, inboundRecord, warehouse, automationConfig, systemConfig, alertRecord } from '@server/database/schema';
import { eq, desc, and, or, like, sql, count, gte, asc } from 'drizzle-orm';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  ProductListParams,
  Product,
  ProductListResponse,
  ProductStatus,
  SellableStatus,
  UpdateSellableDaysRequest,
  UpdateSellableDaysResult,
  ProductWarehouseStockResponse,
  ProductWarehouseStock,
  AutomationTriggerConfig,
  UpdateAutomationTriggerRequest,
  SellableDaysThresholdConfig,
} from '@shared/api.interface';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 根据可售天数计算状态
   */
  private calculateSellableStatus(sellableDays: number, config: SellableDaysThresholdConfig): SellableStatus {
    if (sellableDays <= config.emergencyDays) {
      return 'emergency';
    } else if (sellableDays <= config.safeDays) {
      return 'safe';
    } else if (sellableDays < config.overstockDays) {
      return 'normal';
    } else {
      return 'overstock';
    }
  }

  /**
   * 获取预警阈值配置
   */
  async getThresholdConfig(): Promise<SellableDaysThresholdConfig> {
    const configs = await this.db.select().from(systemConfig);
    
    const config: SellableDaysThresholdConfig = {
      emergencyDays: 10,
      safeDays: 15,
      overstockDays: 90,
    };
    
    for (const item of configs) {
      if (item.configKey === 'emergency_days') {
        config.emergencyDays = parseInt(item.configValue, 10) || 10;
      } else if (item.configKey === 'safe_days') {
        config.safeDays = parseInt(item.configValue, 10) || 15;
      } else if (item.configKey === 'overstock_days') {
        config.overstockDays = parseInt(item.configValue, 10) || 90;
      }
    }
    
    return config;
  }

  /**
   * 计算可售天数
   * 可售天数 = 当前库存 / 最近14天销售出库数量的日平均值
   * 只统计销售出库（outType = 'sales'），调拨/盘点出库不计入
   */
  async calculateSellableDays(productId: string, currentStock: number): Promise<number> {
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const singleResult = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${outboundRecord.quantity}), 0)` })
        .from(outboundRecord)
        .where(
          and(
            eq(outboundRecord.productId, productId),
            eq(outboundRecord.outType, 'sales'),
            gte(outboundRecord.createdAt, fourteenDaysAgo),
          ),
        );
      
      const multiResult = await this.db
        .select({
          total: sql<number>`COALESCE(SUM((item->>'quantity')::int), 0)`
        })
        .from(outboundRecord)
        .innerJoin(
          sql`jsonb_array_elements(${outboundRecord.items}) AS item`,
          sql`TRUE`
        )
        .where(
          and(
            sql`item->>'productId' = ${productId}`,
            eq(outboundRecord.outType, 'sales'),
            gte(outboundRecord.createdAt, fourteenDaysAgo),
          ),
        );
      
      const totalOutbound = (singleResult[0]?.total || 0) + (multiResult[0]?.total || 0);
      
      if (totalOutbound === 0) {
        return 999;
      }
      
      const dailyAverage = totalOutbound / 14;
      
      if (currentStock <= 0) {
        return 0;
      }
      
      const sellableDays = Math.round((currentStock / dailyAverage) * 10) / 10;
      
      return sellableDays;
    } catch (error) {
      this.logger.error(`计算可售天数失败: ${productId}`, error);
      return 999;
    }
  }

  async create(data: CreateProductRequest, userId: string): Promise<Product> {
    try {
      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.code, data.code));

      if (existing) {
        throw new ConflictException('货品编码已存在');
      }

      const currentStock = data.currentStock || 0;
      const costPrice = data.costPrice || 0;
      const stockValue = currentStock * costPrice;

      const config = await this.getThresholdConfig();
      const sellableDays = await this.calculateSellableDays('new', currentStock);
      const sellableStatus = this.calculateSellableStatus(sellableDays, config);

      const [record] = await this.db
        .insert(product)
        .values({
          name: data.name,
          code: data.code,
          costPrice: data.costPrice,
          currentStock: currentStock,
          safetyStock: data.safetyStock,
          sellableDays: sellableDays,
          sellableStatus: sellableStatus,
          imageAttachment: data.imageAttachment || null,
          category: data.category || null,
        })
        .returning();

      return {
        id: record.id,
        name: record.name,
        code: record.code,
        costPrice: record.costPrice || 0,
        currentStock: record.currentStock || 0,
        safetyStock: record.safetyStock || 0,
        sellableDays: record.sellableDays,
        sellableStatus: record.sellableStatus as SellableStatus,
        stockValue: (record.currentStock || 0) * (record.costPrice || 0),
        status: record.sellableStatus as ProductStatus,
        imageAttachment: record.imageAttachment,
        category: record.category,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('创建货品失败', error);
      throw error;
    }
  }

  async findAll(params: ProductListParams): Promise<ProductListResponse> {
    try {
      const { page = 1, pageSize = 20, keyword, status, warehouse, sortField, sortOrder } = params;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (keyword) {
        conditions.push(
          or(
            like(product.name, `%${keyword}%`),
            like(product.code, `%${keyword}%`),
          ),
        );
      }

      let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.db
        .select({ count: count() })
        .from(product)
        .where(whereClause || sql`TRUE`);

      let orderByClause;
      if (sortField === 'currentStock') {
        orderByClause = sortOrder === 'asc'
          ? asc(product.currentStock)
          : desc(product.currentStock);
      } else if (sortField === 'sellableDays') {
        orderByClause = sortOrder === 'asc'
          ? asc(product.sellableDays)
          : desc(product.sellableDays);
      } else {
        orderByClause = desc(product.createdAt);
      }

      const records = await this.db
        .select()
        .from(product)
        .where(whereClause || sql`TRUE`)
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);

      let items: Product[] = await Promise.all(records.map(async (record) => {
        let currentStock = record.currentStock || 0;

        if (warehouse) {
          const inboundSingleResult = await this.db
            .select({ total: sql`COALESCE(SUM(${inboundRecord.quantity}), 0)` })
            .from(inboundRecord)
            .where(
              and(
                eq(inboundRecord.productId, record.id),
                eq(inboundRecord.warehouse, warehouse),
              ),
            );

          const inboundMultiResult = await this.db
            .select({
              total: sql`COALESCE(SUM((item->>'quantity')::int), 0)`
            })
            .from(inboundRecord)
            .innerJoin(
              sql`jsonb_array_elements(${inboundRecord.items}) AS item`,
              sql`TRUE`
            )
            .where(
              and(
                sql`item->>'productId' = ${record.id}`,
                eq(inboundRecord.warehouse, warehouse),
              ),
            );

          const outboundSingleResult = await this.db
            .select({ total: sql`COALESCE(SUM(${outboundRecord.quantity}), 0)` })
            .from(outboundRecord)
            .where(
              and(
                eq(outboundRecord.productId, record.id),
                eq(outboundRecord.warehouse, warehouse),
              ),
            );

          const outboundMultiResult = await this.db
            .select({
              total: sql`COALESCE(SUM((item->>'quantity')::int), 0)`
            })
            .from(outboundRecord)
            .innerJoin(
              sql`jsonb_array_elements(${outboundRecord.items}) AS item`,
              sql`TRUE`
            )
            .where(
              and(
                sql`item->>'productId' = ${record.id}`,
                eq(outboundRecord.warehouse, warehouse),
              ),
            );

          const totalInbound = (Number(inboundSingleResult[0]?.total) || 0) + (Number(inboundMultiResult[0]?.total) || 0);
          const totalOutbound = (Number(outboundSingleResult[0]?.total) || 0) + (Number(outboundMultiResult[0]?.total) || 0);
          currentStock = totalInbound - totalOutbound;
        }

        const costPrice = record.costPrice || 0;
        const stockValue = currentStock * costPrice;

        return {
          id: record.id,
          name: record.name,
          code: record.code,
          costPrice: costPrice,
          currentStock: currentStock,
          safetyStock: record.safetyStock || 0,
          sellableDays: record.sellableDays,
          sellableStatus: record.sellableStatus as SellableStatus,
          stockValue: stockValue,
          status: record.sellableStatus as ProductStatus,
          imageAttachment: record.imageAttachment,
          category: record.category,
          salePrice: record.salePrice || 0,
          salesCount: record.salesCount || 0,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        };
      }));

      if (status) {
        items = items.filter(item => item.status === status);
      }

      return {
        items,
        total: Number(countResult.count),
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error('获取货品列表失败', error);
      throw error;
    }
  }

  async findAllList(): Promise<Product[]> {
    const records = await this.db.select().from(product).orderBy(desc(product.createdAt));
    
    return records.map(record => ({
      id: record.id,
      name: record.name,
      code: record.code,
      costPrice: record.costPrice || 0,
      currentStock: record.currentStock || 0,
      safetyStock: record.safetyStock || 0,
      sellableDays: record.sellableDays,
      sellableStatus: record.sellableStatus as SellableStatus,
      stockValue: (record.currentStock || 0) * (record.costPrice || 0),
      status: record.sellableStatus as ProductStatus,
      imageAttachment: record.imageAttachment,
      category: record.category,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string): Promise<Product> {
    try {
      const [record] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, id));

      if (!record) {
        throw new NotFoundException('货品不存在');
      }

      const currentStock = record.currentStock || 0;
      const costPrice = record.costPrice || 0;
      const stockValue = currentStock * costPrice;

      return {
        id: record.id,
        name: record.name,
        code: record.code,
        costPrice: costPrice,
        currentStock: currentStock,
        safetyStock: record.safetyStock || 0,
        sellableDays: record.sellableDays,
        sellableStatus: record.sellableStatus as SellableStatus,
        stockValue: stockValue,
        status: record.sellableStatus as ProductStatus,
        imageAttachment: record.imageAttachment,
        category: record.category,
        salePrice: record.salePrice || 0,
        salesCount: record.salesCount || 0,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('获取货品详情失败', error);
      throw error;
    }
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    
    const records = await this.db
      .select()
      .from(product)
      .where(sql`${product.id} = ANY(${ids})`);
    
    return records.map(record => ({
      id: record.id,
      name: record.name,
      code: record.code,
      costPrice: record.costPrice || 0,
      currentStock: record.currentStock || 0,
      safetyStock: record.safetyStock || 0,
      sellableDays: record.sellableDays,
      sellableStatus: record.sellableStatus as SellableStatus,
      stockValue: (record.currentStock || 0) * (record.costPrice || 0),
      status: record.sellableStatus as ProductStatus,
      imageAttachment: record.imageAttachment,
      category: record.category,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  async update(id: string, data: UpdateProductRequest, userId?: string): Promise<Product> {
    try {
      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, id));

      if (!existing) {
        throw new NotFoundException('货品不存在');
      }

      if (data.code && data.code !== existing.code) {
        const [codeExists] = await this.db
          .select()
          .from(product)
          .where(eq(product.code, data.code));
        if (codeExists) {
          throw new ConflictException('货品编码已存在');
        }
      }

      const config = await this.getThresholdConfig();
      const currentStock = data.currentStock ?? existing.currentStock;
      const costPrice = data.costPrice ?? existing.costPrice;
      const stockValue = (currentStock || 0) * (costPrice || 0);

      let sellableDays = existing.sellableDays;
      let sellableStatus = existing.sellableStatus;

      if (data.currentStock !== undefined) {
        sellableDays = await this.calculateSellableDays(id, currentStock || 0);
        sellableStatus = this.calculateSellableStatus(sellableDays, config);
      }

      const updateData: Partial<typeof product.$inferInsert> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
      if (data.currentStock !== undefined) updateData.currentStock = data.currentStock;
      if (data.safetyStock !== undefined) updateData.safetyStock = data.safetyStock;
      if (data.imageAttachment !== undefined) updateData.imageAttachment = data.imageAttachment;
      if (data.category !== undefined) updateData.category = data.category;
      updateData.sellableDays = sellableDays;
      updateData.sellableStatus = sellableStatus;

      const [record] = await this.db
        .update(product)
        .set(updateData)
        .where(eq(product.id, id))
        .returning();

      return {
        id: record.id,
        name: record.name,
        code: record.code,
        costPrice: record.costPrice || 0,
        currentStock: record.currentStock || 0,
        safetyStock: record.safetyStock || 0,
        sellableDays: record.sellableDays,
        sellableStatus: record.sellableStatus as SellableStatus,
        stockValue: (record.currentStock || 0) * (record.costPrice || 0),
        status: record.sellableStatus as ProductStatus,
        imageAttachment: record.imageAttachment,
        category: record.category,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('更新货品失败', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const [existing] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, id));

      if (!existing) {
        throw new NotFoundException('货品不存在');
      }

      await this.db.delete(product).where(eq(product.id, id));
    } catch (error) {
      this.logger.error('删除货品失败', error);
      throw error;
    }
  }

  async getWarehouseStock(productId: string): Promise<ProductWarehouseStockResponse> {
    try {
      const [productData] = await this.db
        .select()
        .from(product)
        .where(eq(product.id, productId));

      if (!productData) {
        throw new NotFoundException('货品不存在');
      }

      const inboundResult = await this.db
        .select({
          warehouse: inboundRecord.warehouse,
          quantity: sql<number>`COALESCE(SUM(${inboundRecord.quantity}), 0)`,
        })
        .from(inboundRecord)
        .where(eq(inboundRecord.productId, productId))
        .groupBy(inboundRecord.warehouse);

      const outboundResult = await this.db
        .select({
          warehouse: outboundRecord.warehouse,
          quantity: sql<number>`COALESCE(SUM(${outboundRecord.quantity}), 0)`,
        })
        .from(outboundRecord)
        .where(eq(outboundRecord.productId, productId))
        .groupBy(outboundRecord.warehouse);

      const warehouseMap = new Map<string, ProductWarehouseStock>();

      for (const item of inboundResult) {
        const warehouse = item.warehouse || '默认仓库';
        warehouseMap.set(warehouse, {
          warehouseId: warehouse,
          warehouseName: warehouse,
          inboundQuantity: item.quantity,
          outboundQuantity: 0,
          currentStock: item.quantity,
          stockValue: item.quantity * (productData.costPrice || 0),
        });
      }

      for (const item of outboundResult) {
        const warehouse = item.warehouse || '默认仓库';
        if (warehouseMap.has(warehouse)) {
          const ws = warehouseMap.get(warehouse)!;
          ws.outboundQuantity = item.quantity;
          ws.currentStock = ws.inboundQuantity - item.quantity;
          ws.stockValue = ws.currentStock * (productData.costPrice || 0);
        } else {
          warehouseMap.set(warehouse, {
            warehouseId: warehouse,
            warehouseName: warehouse,
            inboundQuantity: 0,
            outboundQuantity: item.quantity,
            currentStock: -item.quantity,
            stockValue: -item.quantity * (productData.costPrice || 0),
          });
        }
      }

      const warehouses = Array.from(warehouseMap.values());

      return {
        productId,
        productName: productData.name,
        totalStock: productData.currentStock || 0,
        warehouses,
      };
    } catch (error) {
      this.logger.error('获取货品仓库库存失败', error);
      throw error;
    }
  }

  async updateSellableDays(data: UpdateSellableDaysRequest): Promise<UpdateSellableDaysResult[]> {
    try {
      const productIds = data.productIds;
      const config = await this.getThresholdConfig();
      const results: UpdateSellableDaysResult[] = [];

      const query = productIds && productIds.length > 0
        ? this.db.select().from(product).where(sql`${product.id} = ANY(${productIds})`)
        : this.db.select().from(product);
      
      const products = await query;

      for (const prod of products) {
        const oldSellableDays = prod.sellableDays;
        const newSellableDays = await this.calculateSellableDays(prod.id, prod.currentStock || 0);

        if (oldSellableDays !== newSellableDays) {
          const newSellableStatus = this.calculateSellableStatus(newSellableDays, config);

          await this.db
            .update(product)
            .set({
              sellableDays: newSellableDays,
              sellableStatus: newSellableStatus,
            })
            .where(eq(product.id, prod.id));

          results.push({
            productId: prod.id,
            productName: prod.name,
            oldSellableDays,
            newSellableDays,
            updated: true,
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('更新可售天数失败', error);
      throw error;
    }
  }

  async getAutomationConfig(): Promise<AutomationTriggerConfig> {
    const [config] = await this.db
      .select()
      .from(automationConfig)
      .where(eq(automationConfig.configKey, 'sellable_days_update'));

    if (!config) {
      return {
        name: 'sellable_days_update',
        description: '自动更新货品可售天数',
        active: false,
        triggerType: 'cron',
        triggerCondition: {
          expression: '0 0 * * *',
          timeZone: 'Asia/Shanghai',
        },
        executionIntervalDays: 1,
      };
    }

    const configValue = config.configValue as any;
    return {
      name: config.configKey,
      description: configValue?.description || '自动更新货品可售天数',
      active: configValue?.active ?? false,
      triggerType: configValue?.triggerType || 'cron',
      triggerCondition: configValue?.triggerCondition || { expression: '0 0 * * *', timeZone: 'Asia/Shanghai' },
      executionIntervalDays: configValue?.executionIntervalDays || 1,
    };
  }

  async updateAutomationConfig(data: UpdateAutomationTriggerRequest): Promise<AutomationTriggerConfig> {
    const configValue = {
      active: data.active ?? true,
      triggerType: 'cron',
      triggerCondition: {
        expression: `0 0 */${data.executionIntervalDays} * *`,
        timeZone: 'Asia/Shanghai',
      },
      executionIntervalDays: data.executionIntervalDays,
      description: '自动更新货品可售天数',
    };

    await this.db
      .insert(automationConfig)
      .values({
        configKey: 'sellable_days_update',
        configValue,
      })
      .onConflictDoUpdate({
        target: automationConfig.configKey,
        set: { configValue },
      });

    return {
      name: 'sellable_days_update',
      description: '自动更新货品可售天数',
      active: data.active ?? true,
      triggerType: 'cron',
      triggerCondition: configValue.triggerCondition,
      executionIntervalDays: data.executionIntervalDays,
    };
  }

  async updateThresholdConfig(data: { emergencyDays?: number; safeDays?: number; overstockDays?: number }): Promise<SellableDaysThresholdConfig> {
    const configs = [
      { key: 'emergency_days', value: String(data.emergencyDays ?? 10) },
      { key: 'safe_days', value: String(data.safeDays ?? 15) },
      { key: 'overstock_days', value: String(data.overstockDays ?? 90) },
    ];

    for (const { key, value } of configs) {
      await this.db
        .insert(systemConfig)
        .values({
          configKey: key,
          configValue: value,
          description: `${key} threshold`,
        })
        .onConflictDoUpdate({
          target: systemConfig.configKey,
          set: { configValue: value },
        });
    }

    return {
      emergencyDays: data.emergencyDays ?? 10,
      safeDays: data.safeDays ?? 15,
      overstockDays: data.overstockDays ?? 90,
    };
  }
}
