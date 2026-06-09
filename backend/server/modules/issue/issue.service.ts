import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { issueRecord, issueTypeConfig } from '@server/database/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import type {
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueListParams,
  Issue,
} from '@shared/api.interface';

@Injectable()
export class IssueService {
  private readonly logger = new Logger(IssueService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async create(data: CreateIssueRequest, userId: string): Promise<Issue> {
    const [result] = await this.db
      .insert(issueRecord)
      .values({
        issueTypeId: data.issueTypeId,
        trackingNo: data.trackingNo,
        orderNo: data.orderNo,
        productName: data.productName,
        description: data.description,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        customFields: data.customFields || {},
        attachments: data.attachments || [],
        handler: data.handler,
        resolutionNote: data.resolutionNote,
        warehouse: data.warehouse,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const [joinResult] = await this.db
      .select({
        issue: issueRecord,
        issueType: issueTypeConfig,
      })
      .from(issueRecord)
      .leftJoin(issueTypeConfig, eq(issueRecord.issueTypeId, issueTypeConfig.id))
      .where(eq(issueRecord.id, result.id));

    return this.mapToDto(joinResult.issue, joinResult.issueType);
  }

  async findAll(params: IssueListParams) {
    const { page, pageSize, status, type } = params;

    const conditions = [];
    if (status) {
      conditions.push(eq(issueRecord.status, status));
    }
    if (type) {
      conditions.push(eq(issueRecord.issueTypeId, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: count() })
      .from(issueRecord)
      .where(whereClause || sql`TRUE`);

    const result = await this.db
      .select({
        issue: issueRecord,
        issueType: issueTypeConfig,
      })
      .from(issueRecord)
      .leftJoin(issueTypeConfig, eq(issueRecord.issueTypeId, issueTypeConfig.id))
      .where(whereClause || sql`TRUE`)
      .orderBy(desc(issueRecord.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const total = countResult?.count || 0;

    this.logger.log(`查询到 ${result.length} 条异常问题记录`);

    const items = result.map(item => {
      try {
        return this.mapToDto(item.issue, item.issueType);
      } catch (error) {
        this.logger.error(`转换 Issue 记录失败: ${item.issue.id}`, error);
        throw error;
      }
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<Issue> {
    const [result] = await this.db
      .select({
        issue: issueRecord,
        issueType: issueTypeConfig,
      })
      .from(issueRecord)
      .leftJoin(issueTypeConfig, eq(issueRecord.issueTypeId, issueTypeConfig.id))
      .where(eq(issueRecord.id, id));

    if (!result) {
      throw new NotFoundException('异常问题不存在');
    }

    return this.mapToDto(result.issue, result.issueType);
  }

  async update(id: string, data: UpdateIssueRequest, userId?: string): Promise<Issue> {
    const updateData: Partial<typeof issueRecord.$inferInsert> = {};
    if (data.issueTypeId !== undefined) updateData.issueTypeId = data.issueTypeId;
    if (data.trackingNo !== undefined) updateData.trackingNo = data.trackingNo;
    if (data.orderNo !== undefined) updateData.orderNo = data.orderNo;
    if (data.productName !== undefined) updateData.productName = data.productName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.customFields !== undefined) updateData.customFields = data.customFields;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.handler !== undefined) updateData.handler = data.handler;
    if (data.resolutionNote !== undefined) updateData.resolutionNote = data.resolutionNote;
    if (data.warehouse !== undefined) updateData.warehouse = data.warehouse;
    if (userId !== undefined) updateData.updatedBy = userId;

    if (data.status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const [result] = await this.db
      .update(issueRecord)
      .set(updateData)
      .where(eq(issueRecord.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('异常问题不存在');
    }

    const [joinResult] = await this.db
      .select({
        issue: issueRecord,
        issueType: issueTypeConfig,
      })
      .from(issueRecord)
      .leftJoin(issueTypeConfig, eq(issueRecord.issueTypeId, issueTypeConfig.id))
      .where(eq(issueRecord.id, result.id));

    return this.mapToDto(joinResult.issue, joinResult.issueType);
  }

  async remove(id: string): Promise<void> {
    const [result] = await this.db
      .delete(issueRecord)
      .where(eq(issueRecord.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('异常问题不存在');
    }
  }

  private mapToDto(
    item: typeof issueRecord.$inferSelect,
    issueType?: typeof issueTypeConfig.$inferSelect,
  ): Issue {
    return {
      id: item.id,
      issueTypeId: item.issueTypeId,
      issueType: issueType
        ? {
            id: issueType.id,
            name: issueType.name,
            code: issueType.code,
            description: issueType.description || undefined,
            isEnabled: issueType.isEnabled,
            sortOrder: issueType.sortOrder,
            createdAt: issueType.createdAt.toISOString(),
            updatedAt: issueType.updatedAt.toISOString(),
          }
        : undefined,
      trackingNo: item.trackingNo || undefined,
      orderNo: item.orderNo || undefined,
      productName: item.productName || undefined,
      description: item.description || undefined,
      status: item.status as Issue['status'],
      priority: item.priority as Issue['priority'],
      customFields: item.customFields as Record<string, any> | undefined,
      attachments: item.attachments || undefined,
      handler: item.handler || undefined,
      resolvedAt: item.resolvedAt?.toISOString(),
      resolutionNote: item.resolutionNote || undefined,
      warehouse: item.warehouse || undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
