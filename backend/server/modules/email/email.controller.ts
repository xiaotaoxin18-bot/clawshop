import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { EmailService } from './email.service';
import type {
  CreateEmailConfigRequest,
  UpdateEmailConfigRequest,
  SendEmailRequest,
} from '@shared/api.interface';

@Controller('api/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @CanRole(['role_admin'])
  @Get('config')
  async getConfig() {
    const config = await this.emailService.getConfig();
    if (config) {
      delete (config as any).smtpPass;
    }
    return config;
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('config')
  async createConfig(
    @Req() req: Request,
    @Body() data: CreateEmailConfigRequest,
  ) {
    const { userId } = req.userContext;
    return this.emailService.createConfig(data, userId);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Patch('config')
  async updateConfig(@Body() data: UpdateEmailConfigRequest) {
    return this.emailService.updateConfig(data);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('send')
  async sendEmail(@Body() data: SendEmailRequest) {
    return this.emailService.sendEmail(data);
  }

  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('test')
  async testConfig() {
    return this.emailService.testConfig();
  }
}
