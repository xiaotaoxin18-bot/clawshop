import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { AlertAutomationService } from './alert.automation';

@Module({
  controllers: [AlertController],
  providers: [AlertService, AlertAutomationService],
  exports: [AlertService],
})
export class AlertModule {}
