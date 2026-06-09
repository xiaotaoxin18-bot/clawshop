import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { douyinConfig } from '@server/database/douyin-schema';
import { eq } from 'drizzle-orm';

/**
 * 抖店配置读取服务
 *
 * 从 douyin_config 表中读取/写入配置项。
 * 独立于主 douyin.service 以避免循环依赖（guard → config → guard）
 */
@Injectable()
export class DouyinConfigService {
  private readonly logger = new Logger(DouyinConfigService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 获取配置值
   */
  async getConfig(key: string): Promise<string> {
    const [config] = await this.db
      .select()
      .from(douyinConfig)
      .where(eq(douyinConfig.configKey, key));

    if (!config) {
      throw new NotFoundException(`抖店配置 ${key} 不存在`);
    }

    return config.configValue;
  }

  /**
   * 获取配置值（带默认值，不存在返回默认值）
   */
  async getConfigOrDefault(key: string, defaultValue: string): Promise<string> {
    try {
      return await this.getConfig(key);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 设置配置值
   */
  async setConfig(key: string, value: string, description?: string): Promise<void> {
    await this.db
      .insert(douyinConfig)
      .values({
        configKey: key,
        configValue: value,
        description: description || null,
      })
      .onConflictDoUpdate({
        target: douyinConfig.configKey,
        set: { configValue: value, description: description || null },
      });

    this.logger.log(`抖店配置已更新: ${key}`);
  }

  /**
   * 删除配置
   */
  async deleteConfig(key: string): Promise<void> {
    await this.db
      .delete(douyinConfig)
      .where(eq(douyinConfig.configKey, key));
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<{ configKey: string; configValue: string; description?: string }[]> {
    const records = await this.db.select().from(douyinConfig);
    return records.map(r => ({
      configKey: r.configKey,
      configValue: r.configValue,
      description: r.description || undefined,
    }));
  }
}
