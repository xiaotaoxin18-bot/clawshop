import { APP_FILTER } from '@nestjs/core';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { FileModule } from './modules/file/file.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { OutboundModule } from './modules/outbound/outbound.module';
import { ProductModule } from './modules/product/product.module';
import { OrderNumberModule } from './modules/order-number/order-number.module';
import { IssueModule } from './modules/issue/issue.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AlertModule } from './modules/alert/alert.module';
import { EmailModule } from './modules/email/email.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { InboundTypeModule } from './modules/inbound-type/inbound-type.module';
import { SystemConfigModule } from './modules/system_config/system_config.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DouyinModule } from './modules/douyin/douyin.module';
import { AnonymousRoleMiddleware } from './common/middleware/anonymous-role.middleware';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot({ enableCsrf: false }),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    OrderNumberModule,
    FileModule,
    ProductModule,
    InboundModule,
    OutboundModule,
    IssueModule,
    DashboardModule,
    AlertModule,
    EmailModule,
    AnalyticsModule,
    WarehouseModule,
    InboundTypeModule,
    SystemConfigModule,
    NotificationModule,
    DouyinModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AnonymousRoleMiddleware)
      .forRoutes('*');
  }
}
