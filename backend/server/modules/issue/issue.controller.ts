import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { IssueService } from './issue.service';
import { IssueTypeConfigService } from './issue-type-config.service';
import { IssueFieldConfigService } from './issue-field-config.service';
import type {
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueListParams,
  CreateIssueTypeConfigRequest,
  UpdateIssueTypeConfigRequest,
  CreateIssueFieldConfigRequest,
  UpdateIssueFieldConfigRequest,
} from '@shared/api.interface';

@Controller('api/issues')
export class IssueController {
  constructor(
    private readonly issueService: IssueService,
    private readonly issueTypeConfigService: IssueTypeConfigService,
    private readonly issueFieldConfigService: IssueFieldConfigService,
  ) {}

  // ==================== Issue Records ====================

  @CanRole(['role_kefu', 'role_admin'])
  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() data: CreateIssueRequest,
  ) {
    const { userId } = req.userContext;
    return this.issueService.create(data, userId);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const params: IssueListParams = {
      page,
      pageSize,
      status: status as IssueListParams['status'],
      type: type as IssueListParams['type'],
    };
    return this.issueService.findAll(params);
  }

  // ==================== Issue Type Config ====================
  // 注意：静态路由必须在动态路由 :id 之前定义

  @Get('types/enabled')
  async findEnabledTypes() {
    return this.issueTypeConfigService.findEnabled();
  }

  @Get('types')
  async findAllTypes() {
    return this.issueTypeConfigService.findAll();
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('types')
  async createType(@Body() data: CreateIssueTypeConfigRequest) {
    return this.issueTypeConfigService.create(data);
  }

  @Get('types/:id')
  async findOneType(@Param('id') id: string) {
    return this.issueTypeConfigService.findOne(id);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch('types/:id')
  async updateType(
    @Param('id') id: string,
    @Body() data: UpdateIssueTypeConfigRequest,
  ) {
    return this.issueTypeConfigService.update(id, data);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete('types/:id')
  async removeType(@Param('id') id: string) {
    await this.issueTypeConfigService.remove(id);
    return { success: true };
  }

  // ==================== Issue Field Config ====================
  // 注意：静态路由必须在动态路由 :id 之前定义

  @Get('fields/enabled')
  async findEnabledFields() {
    return this.issueFieldConfigService.findEnabled();
  }

  @Get('fields')
  async findAllFields() {
    return this.issueFieldConfigService.findAll();
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('fields')
  async createField(@Body() data: CreateIssueFieldConfigRequest) {
    return this.issueFieldConfigService.create(data);
  }

  @Get('fields/:id')
  async findOneField(@Param('id') id: string) {
    return this.issueFieldConfigService.findOne(id);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch('fields/:id')
  async updateField(
    @Param('id') id: string,
    @Body() data: UpdateIssueFieldConfigRequest,
  ) {
    return this.issueFieldConfigService.update(id, data);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete('fields/:id')
  async removeField(@Param('id') id: string) {
    await this.issueFieldConfigService.remove(id);
    return { success: true };
  }

  // ==================== Issue Records 动态路由 ====================
  // 注意：:id 路由必须放在所有静态子路由之后

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.issueService.findOne(id);
  }

  @CanRole(['role_kefu', 'role_admin'])
  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateIssueRequest,
  ) {
    const { userId } = req.userContext;
    return this.issueService.update(id, data, userId);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.issueService.remove(id);
    return { success: true };
  }
}
