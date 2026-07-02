import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DouyinService } from './douyin.service';
import { DouyinConfigService } from './douyin-config.service';

type ScheduleTime = { hour: number; minute: number; label: string };

@Injectable()
export class DouyinScrapeScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DouyinScrapeScheduler.name);
  private readonly enabled = (process.env.DOUYIN_AUTO_SCRAPE_ENABLED || 'true').toLowerCase() !== 'false';
  private readonly scheduleTimes = this.parseScheduleTimes(
    process.env.DOUYIN_AUTO_SCRAPE_TIMES || '09:00,21:00',
  );
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly douyinService: DouyinService,
    private readonly douyinConfigService: DouyinConfigService,
  ) {}

  onModuleInit() {
    if (!this.enabled || this.scheduleTimes.length === 0) {
      this.logger.log('抖店自动采集已禁用');
      return;
    }

    this.logger.log(`抖店自动采集已启用: ${this.scheduleTimes.map(t => t.label).join(', ')}`);
    this.scheduleNextRun();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private parseScheduleTimes(raw: string): ScheduleTime[] {
    return raw
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map((label) => {
        const match = label.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          return null;
        }
        return { hour, minute, label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
      })
      .filter((item): item is ScheduleTime => Boolean(item));
  }

  private scheduleNextRun() {
    if (!this.enabled || this.scheduleTimes.length === 0) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const nextRun = this.getNextRun(new Date());
    if (!nextRun) {
      this.logger.warn('未找到下次自动采集时间');
      return;
    }

    const delay = Math.max(nextRun.getTime() - Date.now(), 1000);
    this.logger.log(`下次抖店自动采集: ${nextRun.toLocaleString()}`);
    this.timer = setTimeout(() => {
      void this.runScheduledJobs(nextRun);
    }, delay);
  }

  private getNextRun(now: Date): Date | null {
    const candidates: Date[] = [];

    for (const offsetDays of [0, 1]) {
      const base = new Date(now);
      base.setDate(base.getDate() + offsetDays);

      for (const time of this.scheduleTimes) {
        const candidate = new Date(base);
        candidate.setHours(time.hour, time.minute, 0, 0);
        if (candidate.getTime() > now.getTime()) {
          candidates.push(candidate);
        }
      }
    }

    candidates.sort((a, b) => a.getTime() - b.getTime());
    return candidates[0] || null;
  }

  private async runScheduledJobs(expectedAt: Date) {
    if (!this.enabled) return;
    if (this.running) {
      this.logger.warn(`自动采集跳过: 上一轮仍在运行 (${expectedAt.toLocaleString()})`);
      this.scheduleNextRun();
      return;
    }

    this.running = true;
    try {
      const shops = await this.douyinConfigService.listShops();
      const targets = shops.length > 0 ? shops.map(shop => shop.shop_id) : [undefined];

      for (const shopId of targets) {
        try {
          await this.douyinService.triggerDailyPush(shopId);
        } catch (error: any) {
          this.logger.error(
            `自动采集失败${shopId ? ` [${shopId}]` : ''}: ${error?.message || error}`,
          );
        }
      }
    } finally {
      this.running = false;
      this.scheduleNextRun();
    }
  }
}
