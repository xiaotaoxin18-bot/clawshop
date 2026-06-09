import { Module } from '@nestjs/common';
import { SystemConfigService } from './system_config.service';
import { SystemConfigController } from './system_config.controller';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
