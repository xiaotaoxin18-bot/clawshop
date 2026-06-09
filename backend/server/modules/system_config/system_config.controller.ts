import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import { NeedLogin, CanRole, DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { Inject } from '@nestjs/common';
import { SystemConfigService } from './system_config.service';
import { sql } from 'drizzle-orm';
import type {
  SellableDaysThresholdConfig,
  UpdateThresholdConfigRequest,
} from '@shared/api.interface';

@Controller('api/system-config')
export class SystemConfigController {
  private readonly logger = new Logger(SystemConfigController.name);

  constructor(
    private readonly systemConfigService: SystemConfigService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 一键清除所有数据（需管理员密码）
   */
  @Post('clear-all-data')
  async clearAllData(
    @Body() data: { password: string },
  ): Promise<{ success: boolean; message: string }> {
    const adminPassword = process.env.ADMIN_CLEAR_PASSWORD || 'admin123';

    if (!data.password || data.password !== adminPassword) {
      return { success: false, message: '管理员密码错误' };
    }

    try {
      // 按外键依赖顺序清空表
      await this.db.execute(sql`DELETE FROM alert_record`);
      await this.db.execute(sql`DELETE FROM outbound_record`);
      await this.db.execute(sql`DELETE FROM inbound_record`);
      await this.db.execute(sql`DELETE FROM douyin_daily_snapshot`);
      await this.db.execute(sql`DELETE FROM product`);

      this.logger.log('所有数据已清除');
      return { success: true, message: '所有数据已清除' };
    } catch (error: any) {
      this.logger.error('清除数据失败', error);
      return { success: false, message: `清除数据失败: ${error?.message || '未知错误'}` };
    }
  }

  /**
   * 获取可售天数预警阈值配置
   */
  @Get('threshold')
  async getThresholdConfig(): Promise<SellableDaysThresholdConfig> {
    return this.systemConfigService.getThresholdConfig();
  }

  /**
   * 更新可售天数预警阈值配置（仅管理员）
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('threshold')
  async updateThresholdConfig(
    @Body() data: UpdateThresholdConfigRequest,
  ): Promise<SellableDaysThresholdConfig> {
    return this.systemConfigService.updateThresholdConfig(data);
  }
}
