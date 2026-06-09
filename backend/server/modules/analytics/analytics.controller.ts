import {
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsParams } from '@shared/api.interface';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params: AnalyticsParams = {
      startDate,
      endDate,
    };
    return this.analyticsService.getAnalyticsData(params);
  }

  @CanRole(['role_admin'])
  @Post('refresh')
  async refreshStats() {
    return { success: true, message: '统计数据刷新任务已启动' };
  }
}
