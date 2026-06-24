import { Module } from '@nestjs/common';
import { InboundTypeController } from './inbound-type.controller';
import { InboundTypeService } from './inbound-type.service';

@Module({
  controllers: [InboundTypeController],
  providers: [InboundTypeService],
})
export class InboundTypeModule {}
