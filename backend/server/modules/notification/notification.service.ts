import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { notificationSettings } from '@server/database/schema';
import { eq } from 'drizzle-orm';
import type {
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  MigrateLocalStorageRequest,
} from '@shared/api.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const [settings] = await this.db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));

      if (!settings) {
        return null;
      }

      return {
        id: settings.id,
        notificationEnabled: settings.notificationEnabled ?? false,
        autoEmailEnabled: settings.autoEmailEnabled ?? false,
        emailProvider: settings.emailProvider as 'smtp' | 'emailjs' | 'feishu' ?? 'smtp',
        emailjsConfig: settings.emailjsConfig as { serviceId: string; templateId: string; publicKey: string; toEmails: string } | undefined,
        smtpConfig: settings.smtpConfig as { host: string; port: number; user: string; pass: string; isSsl: boolean; fromName: string; fromEmail: string; toEmails: string; reminderInterval: number; reminderTypes: string[]; dailyDigestTime: string; dailyDigestEnabled: boolean } | undefined,
        feishuConfig: settings.feishuConfig as { webhookUrl: string; secret?: string; atMobiles?: string; atUserIds?: string } | undefined,
        appState: settings.appState as { lastNotified?: Record<string, string>; emailSent?: string[]; dailyDigestSent?: string } | undefined,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('获取通知设置失败', error);
      throw error;
    }
  }

  async updateSettings(
    userId: string,
    data: UpdateNotificationSettingsRequest,
  ): Promise<NotificationSettings> {
    try {
      // 检查是否已有设置
      const [existing] = await this.db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));

      if (existing) {
        // 更新现有设置
        const [updated] = await this.db
          .update(notificationSettings)
          .set({
            ...(data.notificationEnabled !== undefined && { notificationEnabled: data.notificationEnabled }),
            ...(data.autoEmailEnabled !== undefined && { autoEmailEnabled: data.autoEmailEnabled }),
            ...(data.emailProvider && { emailProvider: data.emailProvider }),
            ...(data.emailjsConfig && { emailjsConfig: data.emailjsConfig }),
            ...(data.smtpConfig && { smtpConfig: data.smtpConfig }),
            ...(data.feishuConfig && { feishuConfig: data.feishuConfig }),
            ...(data.appState && { appState: data.appState }),
          })
          .where(eq(notificationSettings.userId, userId))
          .returning();

        return {
          id: updated.id,
          notificationEnabled: updated.notificationEnabled ?? false,
          autoEmailEnabled: updated.autoEmailEnabled ?? false,
          emailProvider: updated.emailProvider as 'smtp' | 'emailjs' | 'feishu' ?? 'smtp',
          emailjsConfig: updated.emailjsConfig as { serviceId: string; templateId: string; publicKey: string; toEmails: string } | undefined,
          smtpConfig: updated.smtpConfig as { host: string; port: number; user: string; pass: string; isSsl: boolean; fromName: string; fromEmail: string; toEmails: string; reminderInterval: number; reminderTypes: string[]; dailyDigestTime: string; dailyDigestEnabled: boolean } | undefined,
          feishuConfig: updated.feishuConfig as { webhookUrl: string; secret?: string; atMobiles?: string; atUserIds?: string } | undefined,
          appState: updated.appState as { lastNotified?: Record<string, string>; emailSent?: string[]; dailyDigestSent?: string } | undefined,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } else {
        // 创建新设置
        const [created] = await this.db
          .insert(notificationSettings)
          .values({
            userId,
            notificationEnabled: data.notificationEnabled ?? false,
            autoEmailEnabled: data.autoEmailEnabled ?? false,
            emailProvider: data.emailProvider ?? 'smtp',
            emailjsConfig: data.emailjsConfig,
            smtpConfig: data.smtpConfig,
            feishuConfig: data.feishuConfig,
            appState: data.appState,
          })
          .returning();

        return {
          id: created.id,
          notificationEnabled: created.notificationEnabled ?? false,
          autoEmailEnabled: created.autoEmailEnabled ?? false,
          emailProvider: created.emailProvider as 'smtp' | 'emailjs' | 'feishu' ?? 'smtp',
          emailjsConfig: created.emailjsConfig as { serviceId: string; templateId: string; publicKey: string; toEmails: string } | undefined,
          smtpConfig: created.smtpConfig as { host: string; port: number; user: string; pass: string; isSsl: boolean; fromName: string; fromEmail: string; toEmails: string; reminderInterval: number; reminderTypes: string[]; dailyDigestTime: string; dailyDigestEnabled: boolean } | undefined,
          feishuConfig: created.feishuConfig as { webhookUrl: string; secret?: string; atMobiles?: string; atUserIds?: string } | undefined,
          appState: created.appState as { lastNotified?: Record<string, string>; emailSent?: string[]; dailyDigestSent?: string } | undefined,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      this.logger.error('更新通知设置失败', error);
      throw error;
    }
  }

  async migrateLocalStorage(
    userId: string,
    data: MigrateLocalStorageRequest,
  ): Promise<void> {
    try {
      // 检查是否已有设置
      const [existing] = await this.db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));

      if (!existing) {
        // 只有当没有设置时才创建
        await this.db
          .insert(notificationSettings)
          .values({
            userId,
            notificationEnabled: data.notificationEnabled ?? false,
            autoEmailEnabled: data.autoEmailEnabled ?? false,
            emailProvider: data.emailProvider ?? 'smtp',
            emailjsConfig: data.emailjsConfig,
            smtpConfig: data.smtpConfig,
            feishuConfig: data.feishuConfig,
            appState: data.appState,
          });
      }
    } catch (error) {
      this.logger.error('迁移本地存储失败', error);
      throw error;
    }
  }
}
