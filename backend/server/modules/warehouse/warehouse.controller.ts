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
import { WarehouseService } from './warehouse.service';
import type {
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseListParams,
} from '@shared/api.interface';

@Controller('api/warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() data: CreateWarehouseRequest,
  ) {
    const { userId } = req.userContext;
    return this.warehouseService.create(data, userId);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('keyword') keyword?: string,
  ) {
    const params: WarehouseListParams = {
      page,
      pageSize,
      keyword,
    };
    return this.warehouseService.findAll(params);
  }

  @Get('list/all')
  async findAllList() {
    return this.warehouseService.findAllList();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.warehouseService.findOne(id);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateWarehouseRequest,
  ) {
    const { userId } = req.userContext;
    return this.warehouseService.update(id, data, userId);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.warehouseService.remove(id);
    return { success: true };
  }
}
