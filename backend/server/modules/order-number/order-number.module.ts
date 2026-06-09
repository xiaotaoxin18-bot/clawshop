import { Module } from '@nestjs/common';
import { OrderNumberService } from './order-number.service';

@Module({
  providers: [OrderNumberService],
  exports: [OrderNumberService],
})
export class OrderNumberModule {}
