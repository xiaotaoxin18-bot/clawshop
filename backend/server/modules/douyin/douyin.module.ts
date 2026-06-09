import { Module } from '@nestjs/common';
import { DouyinController } from './douyin.controller';
import { DouyinService } from './douyin.service';
import { DouyinConfigService } from './douyin-config.service';

@Module({
  imports: [],
  controllers: [
    DouyinController,
  ],
  providers: [
    DouyinService,
    DouyinConfigService,
  ],
  exports: [
    DouyinService,
    DouyinConfigService,
  ],
})
export class DouyinModule {}
