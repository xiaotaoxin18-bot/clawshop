import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { AlertService } from './alert.service';
import type {
  AlertListParams,
  HandleAlertRequest,
  UpdateNotificationSettingsRequest,
  MigrateLocalStorageRequest,
} from '@shared/api.interface';
import type { Request } from 'express';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';

@Controller('api/alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('alertType') alertType?: string,
    @Query('isHandled') isHandled?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params: AlertListParams = {
      page,
      pageSize,
      alertType: alertType as 'emergency' | 'overstock' | undefined,
      isHandled: isHandled !== undefined ? isHandled === 'true' : undefined,
      startDate,
      endDate,
    };
    return this.alertService.findAll(params);
  }

  @Get('statistics')
  async getStatistics() {
    return this.alertService.getStatistics();
  }

  @Get('high-frequency')
  async getHighFrequency(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.alertService.getHighFrequencyAlerts(limit);
  }

  @CanRole(['role_operator', 'role_admin'])
  @Patch(':id/handle')
  async handleAlert(
    @Param('id') id: string,
    @Body() data: HandleAlertRequest,
  ) {
    return this.alertService.handleAlert(id, data);
  }

  @CanRole(['role_operator', 'role_admin'])
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.alertService.markAsRead(id);
  }

  // ==================== 通知设置 API ====================

  @CanRole(['role_operator', 'role_admin'])
  @Get('settings')
  async getSettings(@Req() req: Request) {
    const userId: string = (req as any).userContext?.userId;
    return this.alertService.getNotificationSettings(userId);
  }

  @NeedLogin()
  @Post('settings')
  async saveSettings(
    @Req() req: Request,
    @Body() data: UpdateNotificationSettingsRequest,
  ) {
    const userId: string = (req as any).userContext?.userId;
    return this.alertService.saveNotificationSettings(userId, data);
  }

  @NeedLogin()
  @Post('settings/migrate')
  async migrateLocalStorage(
    @Req() req: Request,
    @Body() data: MigrateLocalStorageRequest,
  ) {
    const userId: string = (req as any).userContext?.userId;
    return this.alertService.migrateLocalStorage(userId, data);
  }

  @NeedLogin()
  @Post('sync')
  async syncAlerts() {
    await this.alertService.syncAlertsFromProducts();
    return { success: true, message: '预警数据同步完成' };
  }
}
