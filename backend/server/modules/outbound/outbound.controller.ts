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
import { OutboundService } from './outbound.service';
import type {
  CreateOutboundRequest,
  UpdateOutboundRequest,
  OutboundListParams,
} from '@shared/api.interface';

@Controller('api/outbounds')
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @CanRole(['role_operator', 'role_admin'])
  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() data: CreateOutboundRequest,
  ) {
    const { userId } = req.userContext;
    return this.outboundService.create(data, userId);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('productId') productId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('outType') outType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params: OutboundListParams = {
      page,
      pageSize,
      productId,
      orderNo,
      outType: outType as OutboundListParams['outType'],
      startDate,
      endDate,
    };
    return this.outboundService.findAll(params);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.outboundService.findOne(id);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateOutboundRequest,
  ) {
    const { userId } = req.userContext;
    return this.outboundService.update(id, data, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.outboundService.remove(id);
    return { success: true };
  }
}
