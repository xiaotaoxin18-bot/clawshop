import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { emailConfig } from '@server/database/schema';
import { eq } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as dns from 'dns';
import type {
  EmailConfig,
  CreateEmailConfigRequest,
  UpdateEmailConfigRequest,
  SendEmailRequest,
  EmailTestResult,
} from '@shared/api.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {
    // 强制所有 DNS 查询优先返回 IPv4 地址
    dns.setDefaultResultOrder('ipv4first');
  }

  async getConfig(): Promise<EmailConfig | null> {
    try {
      const [config] = await this.db
        .select()
        .from(emailConfig)
        .limit(1);

      if (!config) {
        return null;
      }

      return {
        id: config.id,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        fromName: config.fromName || undefined,
        fromEmail: config.fromEmail || undefined,
        isSsl: config.isSsl ?? true,
        isEnabled: config.isEnabled ?? true,
        toEmails: config.toEmails || undefined,
        reminderInterval: config.reminderInterval ?? 60,
        reminderTypes: config.reminderTypes || undefined,
        dailyDigestTime: config.dailyDigestTime || undefined,
        dailyDigestEnabled: config.dailyDigestEnabled ?? false,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('获取邮件配置失败', error);
      throw error;
    }
  }

  async createConfig(data: CreateEmailConfigRequest, userId: string): Promise<EmailConfig> {
    try {
      const existing = await this.getConfig();
      if (existing) {
        throw new Error('邮件配置已存在，请使用更新接口');
      }

      const [config] = await this.db
        .insert(emailConfig)
        .values({
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpUser: data.smtpUser,
          smtpPass: data.smtpPass,
          fromName: data.fromName,
          fromEmail: data.fromEmail,
          isSsl: data.isSsl ?? true,
          isEnabled: data.isEnabled ?? true,
          toEmails: data.toEmails,
          reminderInterval: data.reminderInterval ?? 60,
          reminderTypes: data.reminderTypes,
          dailyDigestTime: data.dailyDigestTime,
          dailyDigestEnabled: data.dailyDigestEnabled ?? false,
        })
        .returning();

      return {
        id: config.id,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        fromName: config.fromName || undefined,
        fromEmail: config.fromEmail || undefined,
        isSsl: config.isSsl ?? true,
        isEnabled: config.isEnabled ?? true,
        toEmails: config.toEmails || undefined,
        reminderInterval: config.reminderInterval ?? 60,
        reminderTypes: config.reminderTypes || undefined,
        dailyDigestTime: config.dailyDigestTime || undefined,
        dailyDigestEnabled: config.dailyDigestEnabled ?? false,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('创建邮件配置失败', error);
      throw error;
    }
  }

  async updateConfig(data: UpdateEmailConfigRequest): Promise<EmailConfig> {
    try {
      const existing = await this.getConfig();
      if (!existing) {
        throw new Error('邮件配置不存在，请先创建配置');
      }

      const updateData: Partial<typeof emailConfig.$inferInsert> = {};
      if (data.smtpHost !== undefined) updateData.smtpHost = data.smtpHost;
      if (data.smtpPort !== undefined) updateData.smtpPort = data.smtpPort;
      if (data.smtpUser !== undefined) updateData.smtpUser = data.smtpUser;
      if (data.smtpPass !== undefined) updateData.smtpPass = data.smtpPass;
      if (data.fromName !== undefined) updateData.fromName = data.fromName;
      if (data.fromEmail !== undefined) updateData.fromEmail = data.fromEmail;
      if (data.isSsl !== undefined) updateData.isSsl = data.isSsl;
      if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
      if (data.toEmails !== undefined) updateData.toEmails = data.toEmails;
      if (data.reminderInterval !== undefined) updateData.reminderInterval = data.reminderInterval;
      if (data.reminderTypes !== undefined) updateData.reminderTypes = data.reminderTypes;
      if (data.dailyDigestTime !== undefined) updateData.dailyDigestTime = data.dailyDigestTime;
      if (data.dailyDigestEnabled !== undefined) updateData.dailyDigestEnabled = data.dailyDigestEnabled;

      const [config] = await this.db
        .update(emailConfig)
        .set(updateData)
        .where(eq(emailConfig.id, existing.id))
        .returning();

      return {
        id: config.id,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        fromName: config.fromName || undefined,
        fromEmail: config.fromEmail || undefined,
        isSsl: config.isSsl ?? true,
        isEnabled: config.isEnabled ?? true,
        toEmails: config.toEmails || undefined,
        reminderInterval: config.reminderInterval ?? 60,
        reminderTypes: config.reminderTypes || undefined,
        dailyDigestTime: config.dailyDigestTime || undefined,
        dailyDigestEnabled: config.dailyDigestEnabled ?? false,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('更新邮件配置失败', error);
      throw error;
    }
  }

  private createTransporter(config: EmailConfig): Transporter {
    this.logger.log(`使用数据库 SMTP 配置: ${config.smtpHost}:${config.smtpPort}, SSL: ${config.isSsl}`);
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.isSsl,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });
  }

  async sendEmail(data: SendEmailRequest): Promise<EmailTestResult> {
    try {
      let transporter: Transporter;
      let fromAddress: string;
      let fromName: string | undefined;

      if (data.smtpConfig) {
        // 使用传入的自定义 SMTP 配置
        this.logger.log(`使用自定义 SMTP 配置: ${data.smtpConfig.host}:${data.smtpConfig.port}`);
        transporter = nodemailer.createTransport({
          host: data.smtpConfig.host,
          port: data.smtpConfig.port,
          secure: data.smtpConfig.port === 465,
          auth: {
            user: data.smtpConfig.user,
            pass: data.smtpConfig.pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        fromAddress = data.smtpConfig.user;
      } else {
        // 使用数据库配置的 SMTP
        const config = await this.getConfig();
        if (!config || !config.isEnabled) {
          throw new Error('邮件功能未启用或未配置');
        }
        transporter = this.createTransporter(config);
        fromAddress = config.fromEmail || config.smtpUser;
        fromName = config.fromName;
      }

      const info = await transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
        to: data.to,
        subject: data.subject,
        text: data.isHtml ? undefined : data.content,
        html: data.isHtml ? data.content : undefined,
      });

      this.logger.log(`邮件发送成功: ${info.messageId}`);
      return {
        success: true,
        message: `邮件发送成功，消息ID: ${info.messageId}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('发送邮件失败', errorMsg);
      return {
        success: false,
        message: `发送失败: ${errorMsg}`,
      };
    }
  }

  async testConfig(): Promise<EmailTestResult> {
    try {
      const config = await this.getConfig();
      if (!config || !config.isEnabled) {
        return {
          success: false,
          message: '邮件功能未启用或未配置',
        };
      }

      const transporter = this.createTransporter(config);
      await transporter.verify();

      return {
        success: true,
        message: 'SMTP 连接测试成功',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `连接失败: ${errorMsg}`,
      };
    }
  }
}
