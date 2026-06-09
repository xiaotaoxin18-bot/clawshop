import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { systemConfig } from '@server/database/schema';
import { eq } from 'drizzle-orm';
import type {
  SystemConfig,
  SellableDaysThresholdConfig,
  UpdateThresholdConfigRequest,
} from '@shared/api.interface';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 获取所有系统配置
   */
  async findAll(): Promise<SystemConfig[]> {
    try {
      const records = await this.db.select().from(systemConfig);
      
      return records.map(record => ({
        id: record.id,
        configKey: record.configKey,
        configValue: record.configValue,
        description: record.description,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('获取系统配置失败', error);
      throw error;
    }
  }

  /**
   * 获取可售天数预警阈值配置
   */
  async getThresholdConfig(): Promise<SellableDaysThresholdConfig> {
    try {
      const records = await this.db.select().from(systemConfig);
      
      const config: SellableDaysThresholdConfig = {
        emergencyDays: 10,
        safeDays: 15,
        overstockDays: 90,
      };
      
      for (const item of records) {
        if (item.configKey === 'emergency_days') {
          config.emergencyDays = parseInt(item.configValue, 10) || 10;
        } else if (item.configKey === 'safe_days') {
          config.safeDays = parseInt(item.configValue, 10) || 15;
        } else if (item.configKey === 'overstock_days') {
          config.overstockDays = parseInt(item.configValue, 10) || 90;
        }
      }
      
      return config;
    } catch (error) {
      this.logger.error('获取预警阈值配置失败', error);
      throw error;
    }
  }

  /**
   * 更新可售天数预警阈值配置
   */
  async updateThresholdConfig(data: UpdateThresholdConfigRequest): Promise<SellableDaysThresholdConfig> {
    try {
      // 更新emergency_days
      if (data.emergencyDays !== undefined) {
        const [existing] = await this.db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.configKey, 'emergency_days'));
        
        if (existing) {
          await this.db
            .update(systemConfig)
            .set({ configValue: String(data.emergencyDays) })
            .where(eq(systemConfig.configKey, 'emergency_days'));
        } else {
          await this.db
            .insert(systemConfig)
            .values({
              configKey: 'emergency_days',
              configValue: String(data.emergencyDays),
              description: '紧急预警天数（可售天数 ≤ 此值触发紧急预警）',
            });
        }
      }

      // 更新safe_days
      if (data.safeDays !== undefined) {
        const [existing] = await this.db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.configKey, 'safe_days'));
        
        if (existing) {
          await this.db
            .update(systemConfig)
            .set({ configValue: String(data.safeDays) })
            .where(eq(systemConfig.configKey, 'safe_days'));
        } else {
          await this.db
            .insert(systemConfig)
            .values({
              configKey: 'safe_days',
              configValue: String(data.safeDays),
              description: '安全预警天数（可售天数 > emergency_days 且 ≤ 此值为安全状态）',
            });
        }
      }

      // 更新overstock_days
      if (data.overstockDays !== undefined) {
        const [existing] = await this.db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.configKey, 'overstock_days'));
        
        if (existing) {
          await this.db
            .update(systemConfig)
            .set({ configValue: String(data.overstockDays) })
            .where(eq(systemConfig.configKey, 'overstock_days'));
        } else {
          await this.db
            .insert(systemConfig)
            .values({
              configKey: 'overstock_days',
              configValue: String(data.overstockDays),
              description: '滞销预警天数（可售天数 ≥ 此值触发滞销预警）',
            });
        }
      }

      return this.getThresholdConfig();
    } catch (error) {
      this.logger.error('更新预警阈值配置失败', error);
      throw error;
    }
  }
}
