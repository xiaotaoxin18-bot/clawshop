import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductAutomationService } from './product.automation';

@Module({
  imports: [HttpModule],
  controllers: [ProductController],
  providers: [ProductService, ProductAutomationService],
})
export class ProductModule {}
