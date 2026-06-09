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
import { InboundService } from './inbound.service';
import type {
  CreateInboundRequest,
  UpdateInboundRequest,
  InboundListParams,
} from '@shared/api.interface';

@Controller('api/inbounds')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @CanRole(['role_operator', 'role_admin'])
  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() data: CreateInboundRequest,
  ) {
    const { userId } = req.userContext;
    return this.inboundService.create(data, userId);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('productId') productId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('inType') inType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params: InboundListParams = {
      page,
      pageSize,
      productId,
      orderNo,
      inType: inType as InboundListParams['inType'],
      startDate,
      endDate,
    };
    return this.inboundService.findAll(params);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inboundService.findOne(id);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateInboundRequest,
  ) {
    const { userId } = req.userContext;
    return this.inboundService.update(id, data, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.inboundService.remove(id);
    return { success: true };
  }
}
