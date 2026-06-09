import { Module } from '@nestjs/common';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { IssueTypeConfigService } from './issue-type-config.service';
import { IssueFieldConfigService } from './issue-field-config.service';

@Module({
  controllers: [IssueController],
  providers: [IssueService, IssueTypeConfigService, IssueFieldConfigService],
})
export class IssueModule {}
