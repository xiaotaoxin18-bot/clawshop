import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { douyinConfig, douyinDailySnapshot } from '@server/database/douyin-schema';
import { alertRecord, inboundRecord, outboundRecord, product } from '@server/database/schema';
import type { ShopInfo } from './douyin.types';

@Injectable()
export class DouyinConfigService {
  private readonly logger = new Logger(DouyinConfigService.name);
  private readonly SHOPS_CONFIG_KEY = 'shops';

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getConfig(key: string): Promise<string> {
    const [config] = await this.db
      .select()
      .from(douyinConfig)
      .where(eq(douyinConfig.configKey, key));

    if (!config) {
      throw new NotFoundException(`抖店配置不存在: ${key}`);
    }

    return config.configValue;
  }

  async getConfigOrDefault(key: string, defaultValue: string): Promise<string> {
    try {
      return await this.getConfig(key);
    } catch {
      return defaultValue;
    }
  }

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
        set: {
          configValue: value,
          description: description || null,
        },
      });

    this.logger.log(`抖店配置已更新: ${key}`);
  }

  async deleteConfig(key: string): Promise<void> {
    await this.db.delete(douyinConfig).where(eq(douyinConfig.configKey, key));
  }

  async getAllConfigs(): Promise<{ configKey: string; configValue: string; description?: string }[]> {
    const records = await this.db.select().from(douyinConfig);
    return records.map(record => ({
      configKey: record.configKey,
      configValue: record.configValue,
      description: record.description || undefined,
    }));
  }

  async listShops(): Promise<ShopInfo[]> {
    try {
      const value = await this.getConfig(this.SHOPS_CONFIG_KEY);
      return JSON.parse(value) as ShopInfo[];
    } catch {
      return [];
    }
  }

  async addShop(shopId: string, shopName?: string): Promise<ShopInfo> {
    const trimmedId = shopId.trim();
    if (!trimmedId) {
      throw new ConflictException('店铺 ID 不能为空');
    }

    const shops = await this.listShops();
    if (shops.some(shop => shop.shop_id === trimmedId)) {
      throw new ConflictException(`店铺已存在: ${trimmedId}`);
    }

    const shop: ShopInfo = {
      shop_id: trimmedId,
      shop_name: shopName?.trim() || trimmedId,
      created_at: new Date().toISOString(),
    };

    shops.push(shop);
    await this.setConfig(this.SHOPS_CONFIG_KEY, JSON.stringify(shops), '抖店店铺列表');
    this.logger.log(`店铺已添加: ${trimmedId}`);
    return shop;
  }

  async deleteShop(shopId: string): Promise<void> {
    const shops = await this.listShops();
    const filtered = shops.filter(shop => shop.shop_id !== shopId);

    if (filtered.length === shops.length) {
      throw new NotFoundException(`店铺不存在: ${shopId}`);
    }

    await Promise.all([
      this.db.delete(douyinDailySnapshot).where(eq(douyinDailySnapshot.shopId as any, shopId)),
      this.db.delete(product).where(eq(product.shopId as any, shopId)),
      this.db.delete(inboundRecord).where(eq(inboundRecord.shopId as any, shopId)),
      this.db.delete(outboundRecord).where(eq(outboundRecord.shopId as any, shopId)),
      this.db.delete(alertRecord).where(eq(alertRecord.shopId as any, shopId)),
    ]);

    await this.setConfig(this.SHOPS_CONFIG_KEY, JSON.stringify(filtered), '抖店店铺列表');
    this.logger.log(`店铺已删除: ${shopId}`);
  }
}
