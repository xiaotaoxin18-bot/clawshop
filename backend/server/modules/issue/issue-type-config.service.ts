import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { issueTypeConfig } from '@server/database/schema';
import { eq, asc, desc } from 'drizzle-orm';
import type {
  CreateIssueTypeConfigRequest,
  UpdateIssueTypeConfigRequest,
  IssueTypeConfig,
} from '@shared/api.interface';

@Injectable()
export class IssueTypeConfigService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async create(data: CreateIssueTypeConfigRequest): Promise<IssueTypeConfig> {
    const [result] = await this.db
      .insert(issueTypeConfig)
      .values({
        name: data.name,
        code: data.code,
        description: data.description,
        isEnabled: data.isEnabled ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return this.mapToDto(result);
  }

  async findAll(): Promise<IssueTypeConfig[]> {
    const result = await this.db
      .select()
      .from(issueTypeConfig)
      .orderBy(asc(issueTypeConfig.sortOrder), desc(issueTypeConfig.createdAt));

    return result.map(item => this.mapToDto(item));
  }

  async findEnabled(): Promise<IssueTypeConfig[]> {
    const result = await this.db
      .select()
      .from(issueTypeConfig)
      .where(eq(issueTypeConfig.isEnabled, true))
      .orderBy(asc(issueTypeConfig.sortOrder));

    return result.map(item => this.mapToDto(item));
  }

  async findOne(id: string): Promise<IssueTypeConfig> {
    const [result] = await this.db
      .select()
      .from(issueTypeConfig)
      .where(eq(issueTypeConfig.id, id));

    if (!result) {
      throw new NotFoundException('异常类型不存在');
    }

    return this.mapToDto(result);
  }

  async update(id: string, data: UpdateIssueTypeConfigRequest): Promise<IssueTypeConfig> {
    const updateData: Partial<typeof issueTypeConfig.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const [result] = await this.db
      .update(issueTypeConfig)
      .set(updateData)
      .where(eq(issueTypeConfig.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('异常类型不存在');
    }

    return this.mapToDto(result);
  }

  async remove(id: string): Promise<void> {
    const [result] = await this.db
      .delete(issueTypeConfig)
      .where(eq(issueTypeConfig.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('异常类型不存在');
    }
  }

  private mapToDto(item: typeof issueTypeConfig.$inferSelect): IssueTypeConfig {
    return {
      id: item.id,
      name: item.name,
      code: item.code,
      description: item.description || undefined,
      isEnabled: item.isEnabled ?? true,
      sortOrder: item.sortOrder ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
