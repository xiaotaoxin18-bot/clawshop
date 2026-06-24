import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { InboundTypeService } from './inbound-type.service';
import type {
  CreateInboundTypeRequest,
  UpdateInboundTypeRequest,
} from '@shared/api.interface';

@Controller('api/inbound-types')
export class InboundTypeController {
  constructor(private readonly inboundTypeService: InboundTypeService) {}

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() data: CreateInboundTypeRequest,
  ) {
    const { userId } = req.userContext;
    return this.inboundTypeService.create(data, userId);
  }

  @Get()
  async findAll() {
    return this.inboundTypeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inboundTypeService.findOne(id);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateInboundTypeRequest,
  ) {
    const { userId } = req.userContext;
    return this.inboundTypeService.update(id, data, userId);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.inboundTypeService.remove(id);
    return { success: true };
  }
}
