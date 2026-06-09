import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { warehouse } from '@server/database/schema';
import { eq, desc, and, like, sql, count } from 'drizzle-orm';
import type {
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseListParams,
  Warehouse,
} from '@shared/api.interface';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async create(data: CreateWarehouseRequest, userId: string): Promise<Warehouse> {
    try {
      const [existing] = await this.db
        .select()
        .from(warehouse)
        .where(eq(warehouse.code, data.code));

      if (existing) {
        throw new ConflictException('仓库编码已存在');
      }

      if (data.isDefault) {
        await this.db
          .update(warehouse)
          .set({ isDefault: false })
          .where(eq(warehouse.isDefault, true));
      }

      const [record] = await this.db
        .insert(warehouse)
        .values({
          name: data.name,
          code: data.code,
          address: data.address || null,
          manager: data.manager || null,
          phone: data.phone || null,
          remark: data.remark || null,
          isDefault: data.isDefault || false,
        })
        .returning();

      return this.mapToWarehouse(record);
    } catch (error) {
      this.logger.error('创建仓库失败', error);
      throw error;
    }
  }

  async findAll(params: WarehouseListParams): Promise<{
    items: Warehouse[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const { page = 1, pageSize = 20, keyword } = params;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (keyword) {
        conditions.push(
          and(
            like(warehouse.name, `%${keyword}%`),
            like(warehouse.code, `%${keyword}%`),
          ),
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.db
        .select({ count: count() })
        .from(warehouse)
        .where(whereClause || sql`TRUE`);

      const query = whereClause
        ? this.db.select().from(warehouse).where(whereClause)
        : this.db.select().from(warehouse);

      const records = await query
        .orderBy(desc(warehouse.createdAt))
        .limit(pageSize)
        .offset(offset);

      const items = records.map(record => this.mapToWarehouse(record));

      return {
        items,
        total: Number(countResult.count),
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error('获取仓库列表失败', error);
      throw error;
    }
  }

  async findAllList(): Promise<Warehouse[]> {
    const records = await this.db
      .select()
      .from(warehouse)
      .orderBy(desc(warehouse.createdAt));

    return records.map(record => this.mapToWarehouse(record));
  }

  async findOne(id: string): Promise<Warehouse> {
    try {
      const [record] = await this.db
        .select()
        .from(warehouse)
        .where(eq(warehouse.id, id));

      if (!record) {
        throw new NotFoundException('仓库不存在');
      }

      return this.mapToWarehouse(record);
    } catch (error) {
      this.logger.error('获取仓库详情失败', error);
      throw error;
    }
  }

  async findDefault(): Promise<Warehouse | null> {
    const [record] = await this.db
      .select()
      .from(warehouse)
      .where(eq(warehouse.isDefault, true));

    return record ? this.mapToWarehouse(record) : null;
  }

  async update(id: string, data: UpdateWarehouseRequest, userId?: string): Promise<Warehouse> {
    try {
      const [existing] = await this.db
        .select()
        .from(warehouse)
        .where(eq(warehouse.id, id));

      if (!existing) {
        throw new NotFoundException('仓库不存在');
      }

      if (data.code && data.code !== existing.code) {
        const [codeExists] = await this.db
          .select()
          .from(warehouse)
          .where(eq(warehouse.code, data.code));
        if (codeExists) {
          throw new ConflictException('仓库编码已存在');
        }
      }

      if (data.isDefault && !existing.isDefault) {
        await this.db
          .update(warehouse)
          .set({ isDefault: false })
          .where(eq(warehouse.isDefault, true));
      }

      const updateData: Partial<typeof warehouse.$inferInsert> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.manager !== undefined) updateData.manager = data.manager;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.remark !== undefined) updateData.remark = data.remark;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      const [record] = await this.db
        .update(warehouse)
        .set(updateData)
        .where(eq(warehouse.id, id))
        .returning();

      return this.mapToWarehouse(record);
    } catch (error) {
      this.logger.error('更新仓库失败', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const [existing] = await this.db
        .select()
        .from(warehouse)
        .where(eq(warehouse.id, id));

      if (!existing) {
        throw new NotFoundException('仓库不存在');
      }

      await this.db.delete(warehouse).where(eq(warehouse.id, id));
    } catch (error) {
      this.logger.error('删除仓库失败', error);
      throw error;
    }
  }

  private mapToWarehouse(record: typeof warehouse.$inferSelect): Warehouse {
    return {
      id: record.id,
      name: record.name,
      code: record.code,
      address: record.address || undefined,
      manager: record.manager || undefined,
      phone: record.phone || undefined,
      remark: record.remark || undefined,
      isDefault: record.isDefault || false,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
