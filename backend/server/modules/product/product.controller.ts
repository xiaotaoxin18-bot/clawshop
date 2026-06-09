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
import { ProductService } from './product.service';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  ProductListParams,
  UpdateSellableDaysRequest,
  ProductWarehouseStockResponse,
  UpdateAutomationTriggerRequest,
} from '@shared/api.interface';

@Controller('api/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
  ) {}

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() data: CreateProductRequest,
  ) {
    const { userId } = req.userContext;
    return this.productService.create(data, userId);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('warehouse') warehouse?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const params: ProductListParams = {
      page,
      pageSize,
      keyword,
      status: status as 'emergency' | 'safe' | 'normal' | 'overstock' | undefined,
      warehouse,
      sortField: sortField as 'currentStock' | 'sellableDays' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    };
    return this.productService.findAll(params);
  }

  @CanRole(['role_admin'])
  @Get('config/automation')
  async getAutomationConfig() {
    return this.productService.getAutomationConfig();
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('config/automation')
  async updateAutomationConfig(
    @Body() data: UpdateAutomationTriggerRequest,
  ) {
    return this.productService.updateAutomationConfig(data);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.productService.findOne(id);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateProductRequest,
  ) {
    return this.productService.update(id, data);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productService.remove(id);
    return { success: true };
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('update-sellable-days')
  async updateSellableDays(
    @Body() data: UpdateSellableDaysRequest,
  ) {
    return this.productService.updateSellableDays(data);
  }

  @Get(':id/warehouse-stock')
  async getWarehouseStock(
    @Param('id') id: string,
  ): Promise<ProductWarehouseStockResponse> {
    return this.productService.getWarehouseStock(id);
  }
}
