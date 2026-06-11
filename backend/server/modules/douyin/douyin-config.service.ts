import { Injectable, Logger, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { douyinConfig, douyinDailySnapshot } from '@server/database/douyin-schema';
import { product, inboundRecord, outboundRecord, alertRecord } from '@server/database/schema';
import { eq } from 'drizzle-orm';
import type { ShopInfo } from './douyin.types';

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

  // ==================== 店铺管理 ====================

  private readonly SHOPS_CONFIG_KEY = 'shops';

  /**
   * 获取所有店铺列表
   */
  async listShops(): Promise<ShopInfo[]> {
    try {
      const value = await this.getConfig(this.SHOPS_CONFIG_KEY);
      return JSON.parse(value) as ShopInfo[];
    } catch {
      return [];
    }
  }

  /**
   * 添加店铺
   */
  async addShop(shopId: string, shopName?: string): Promise<ShopInfo> {
    const shops = await this.listShops();
    if (shops.some(s => s.shop_id === shopId)) {
      throw new ConflictException(`店铺 ${shopId} 已存在`);
    }
    const newShop: ShopInfo = {
      shop_id: shopId,
      shop_name: shopName || shopId,
      created_at: new Date().toISOString(),
    };
    shops.push(newShop);
    await this.setConfig(this.SHOPS_CONFIG_KEY, JSON.stringify(shops), '店铺配置列表');
    this.logger.log(`店铺已添加: ${shopId}`);
    return newShop;
  }

  /**
   * 删除店铺（级联删除所有相关数据）
   */
  async deleteShop(shopId: string): Promise<void> {
    const shops = await this.listShops();
    const filtered = shops.filter(s => s.shop_id !== shopId);
    if (filtered.length === shops.length) {
      throw new NotFoundException(`店铺 ${shopId} 不存在`);
    }

    // 级联删除该店铺的所有关联数据
    const deleteOps = [
      this.db.delete(douyinDailySnapshot).where(eq(douyinDailySnapshot.shopId as any, shopId)),
      this.db.delete(product).where(eq(product.shopId as any, shopId)),
      this.db.delete(inboundRecord).where(eq(inboundRecord.shopId as any, shopId)),
      this.db.delete(outboundRecord).where(eq(outboundRecord.shopId as any, shopId)),
      this.db.delete(alertRecord).where(eq(alertRecord.shopId as any, shopId)),
    ];
    await Promise.all(deleteOps);

    // 删除店铺配置
    await this.setConfig(this.SHOPS_CONFIG_KEY, JSON.stringify(filtered), '店铺配置列表');

    this.logger.log(`店铺已删除: ${shopId}，相关数据已清理`);
  }
}
