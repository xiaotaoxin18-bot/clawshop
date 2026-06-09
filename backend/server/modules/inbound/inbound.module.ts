import { Module } from '@nestjs/common';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';
import { OrderNumberModule } from '../order-number/order-number.module';

@Module({
  imports: [OrderNumberModule],
  controllers: [InboundController],
  providers: [InboundService],
})
export class InboundModule {}
