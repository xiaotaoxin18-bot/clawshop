import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { issueFieldConfig } from '@server/database/schema';
import { eq, asc, desc } from 'drizzle-orm';
import type {
  CreateIssueFieldConfigRequest,
  UpdateIssueFieldConfigRequest,
  IssueFieldConfig,
  FieldOption,
} from '@shared/api.interface';

@Injectable()
export class IssueFieldConfigService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async create(data: CreateIssueFieldConfigRequest): Promise<IssueFieldConfig> {
    const [result] = await this.db
      .insert(issueFieldConfig)
      .values({
        name: data.name,
        fieldKey: data.fieldKey,
        fieldType: data.fieldType,
        isRequired: data.isRequired ?? false,
        isEnabled: data.isEnabled ?? true,
        sortOrder: data.sortOrder ?? 0,
        options: data.options as FieldOption[] | null,
      })
      .returning();

    return this.mapToDto(result);
  }

  async findAll(): Promise<IssueFieldConfig[]> {
    const result = await this.db
      .select()
      .from(issueFieldConfig)
      .orderBy(asc(issueFieldConfig.sortOrder), desc(issueFieldConfig.createdAt));

    return result.map(item => this.mapToDto(item));
  }

  async findEnabled(): Promise<IssueFieldConfig[]> {
    const result = await this.db
      .select()
      .from(issueFieldConfig)
      .where(eq(issueFieldConfig.isEnabled, true))
      .orderBy(asc(issueFieldConfig.sortOrder));

    return result.map(item => this.mapToDto(item));
  }

  async findOne(id: string): Promise<IssueFieldConfig> {
    const [result] = await this.db
      .select()
      .from(issueFieldConfig)
      .where(eq(issueFieldConfig.id, id));

    if (!result) {
      throw new NotFoundException('字段配置不存在');
    }

    return this.mapToDto(result);
  }

  async update(id: string, data: UpdateIssueFieldConfigRequest): Promise<IssueFieldConfig> {
    const updateData: Partial<typeof issueFieldConfig.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.fieldKey !== undefined) updateData.fieldKey = data.fieldKey;
    if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.options !== undefined) updateData.options = data.options as FieldOption[] | null;

    const [result] = await this.db
      .update(issueFieldConfig)
      .set(updateData)
      .where(eq(issueFieldConfig.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('字段配置不存在');
    }

    return this.mapToDto(result);
  }

  async remove(id: string): Promise<void> {
    const [result] = await this.db
      .delete(issueFieldConfig)
      .where(eq(issueFieldConfig.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('字段配置不存在');
    }
  }

  private mapToDto(item: typeof issueFieldConfig.$inferSelect): IssueFieldConfig {
    return {
      id: item.id,
      name: item.name,
      fieldKey: item.fieldKey,
      fieldType: item.fieldType as IssueFieldConfig['fieldType'],
      isRequired: item.isRequired ?? false,
      isEnabled: item.isEnabled ?? true,
      sortOrder: item.sortOrder ?? 0,
      options: (item.options as FieldOption[] | null) || undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
