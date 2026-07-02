import { Module } from '@nestjs/common';
import { DouyinController } from './douyin.controller';
import { DouyinService } from './douyin.service';
import { DouyinConfigService } from './douyin-config.service';
import { DouyinScrapeScheduler } from './douyin-scrape.scheduler';

@Module({
  imports: [],
  controllers: [
    DouyinController,
  ],
  providers: [
    DouyinService,
    DouyinConfigService,
    DouyinScrapeScheduler,
  ],
  exports: [
    DouyinService,
    DouyinConfigService,
  ],
})
export class DouyinModule {}
