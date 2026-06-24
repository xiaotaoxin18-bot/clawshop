import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { inboundTypeConfig } from '@server/database/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import type {
  CreateInboundTypeRequest,
  UpdateInboundTypeRequest,
  InboundTypeConfig as IInboundTypeConfig,
} from '@shared/api.interface';

@Injectable()
export class InboundTypeService {
  private readonly logger = new Logger(InboundTypeService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async create(data: CreateInboundTypeRequest, userId: string): Promise<IInboundTypeConfig> {
    try {
      const [existing] = await this.db
        .select()
        .from(inboundTypeConfig)
        .where(eq(inboundTypeConfig.code, data.code));

      if (existing) {
        throw new ConflictException('入库类型编码已存在');
      }

      const [record] = await this.db
        .insert(inboundTypeConfig)
        .values({
          name: data.name,
          code: data.code,
          sortOrder: data.sortOrder ?? 0,
        })
        .returning();

      return this.mapToConfig(record);
    } catch (error) {
      this.logger.error('创建入库类型失败', error);
      throw error;
    }
  }

  async findAll(): Promise<{ items: IInboundTypeConfig[] }> {
    try {
      const records = await this.db
        .select()
        .from(inboundTypeConfig)
        .orderBy(desc(inboundTypeConfig.sortOrder));

      return {
        items: records.map(record => this.mapToConfig(record)),
      };
    } catch (error) {
      this.logger.error('获取入库类型列表失败', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<IInboundTypeConfig> {
    try {
      const [record] = await this.db
        .select()
        .from(inboundTypeConfig)
        .where(eq(inboundTypeConfig.id, id));

      if (!record) {
        throw new NotFoundException('入库类型不存在');
      }

      return this.mapToConfig(record);
    } catch (error) {
      this.logger.error('获取入库类型详情失败', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateInboundTypeRequest, userId?: string): Promise<IInboundTypeConfig> {
    try {
      const [existing] = await this.db
        .select()
        .from(inboundTypeConfig)
        .where(eq(inboundTypeConfig.id, id));

      if (!existing) {
        throw new NotFoundException('入库类型不存在');
      }

      const updateData: Partial<typeof inboundTypeConfig.$inferInsert> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      const [record] = await this.db
        .update(inboundTypeConfig)
        .set(updateData)
        .where(eq(inboundTypeConfig.id, id))
        .returning();

      return this.mapToConfig(record);
    } catch (error) {
      this.logger.error('更新入库类型失败', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const [existing] = await this.db
        .select()
        .from(inboundTypeConfig)
        .where(eq(inboundTypeConfig.id, id));

      if (!existing) {
        throw new NotFoundException('入库类型不存在');
      }

      await this.db.delete(inboundTypeConfig).where(eq(inboundTypeConfig.id, id));
    } catch (error) {
      this.logger.error('删除入库类型失败', error);
      throw error;
    }
  }

  private mapToConfig(record: typeof inboundTypeConfig.$inferSelect): IInboundTypeConfig {
    return {
      id: record.id,
      name: record.name,
      code: record.code,
      sortOrder: record.sortOrder ?? 0,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
