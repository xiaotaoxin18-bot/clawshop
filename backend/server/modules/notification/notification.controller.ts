import {
  Controller,
  Get,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { NotificationService } from './notification.service';
import type {
  UpdateNotificationSettingsRequest,
  MigrateLocalStorageRequest,
} from '@shared/api.interface';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @NeedLogin()
  @Get('settings')
  async getSettings(@Req() req: Request) {
    const { userId } = req.userContext;
    const settings = await this.notificationService.getSettings(userId);
    return settings;
  }

  @NeedLogin()
  @Post('settings')
  async updateSettings(
    @Req() req: Request,
    @Body() data: UpdateNotificationSettingsRequest,
  ) {
    const { userId } = req.userContext;
    return this.notificationService.updateSettings(userId, data);
  }

  @NeedLogin()
  @Post('migrate')
  async migrateLocalStorage(
    @Req() req: Request,
    @Body() data: MigrateLocalStorageRequest,
  ) {
    const { userId } = req.userContext;
    await this.notificationService.migrateLocalStorage(userId, data);
    return { success: true };
  }
}
