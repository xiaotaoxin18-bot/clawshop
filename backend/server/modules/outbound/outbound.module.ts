import { Module } from '@nestjs/common';
import { OutboundController } from './outbound.controller';
import { OutboundService } from './outbound.service';
import { OrderNumberModule } from '../order-number/order-number.module';

@Module({
  imports: [OrderNumberModule],
  controllers: [OutboundController],
  providers: [OutboundService],
})
export class OutboundModule {}
