import { Injectable, Logger, Inject } from '@nestjs/common';
import { Automation, BindTrigger } from '@lark-apaas/fullstack-nestjs-core';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { alertRecord, emailConfig, product } from '@server/database/schema';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * 预警自动化任务服务
 * 定时发送每日库存预警汇总邮件
 */
@Automation()
export class AlertAutomationService {
  private readonly logger = new Logger(AlertAutomationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 每天早上9点执行：发送库存预警每日汇总邮件
   */
  @BindTrigger('daily_digest_email')
  async sendDailyDigestEmail() {
    this.logger.log('开始执行每日预警汇总邮件发送任务');

    try {
      // 1. 获取邮件配置
      const [config] = await this.db
        .select()
        .from(emailConfig)
        .where(eq(emailConfig.isEnabled, true))
        .limit(1);

      if (!config) {
        this.logger.log('邮件功能未配置或未启用，跳过发送');
        return;
      }

      // 2. 检查是否启用每日汇总
      if (!config.dailyDigestEnabled) {
        this.logger.log('每日汇总邮件功能未启用，跳过发送');
        return;
      }

      // 3. 获取昨日预警统计数据
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(alertRecord);

      const [pendingResult] = await this.db
        .select({ count: count() })
        .from(alertRecord)
        .where(eq(alertRecord.isHandled, false));

      const [emergencyResult] = await this.db
        .select({ count: count() })
        .from(alertRecord)
        .where(eq(alertRecord.alertType, 'emergency'));

      const [overstockResult] = await this.db
        .select({ count: count() })
        .from(alertRecord)
        .where(eq(alertRecord.alertType, 'overstock'));

      const [yesterdayResult] = await this.db
        .select({ count: count() })
        .from(alertRecord)
        .where(
          and(
            gte(alertRecord.createdAt, yesterday),
            lte(alertRecord.createdAt, today)
          )
        );

      // 4. 获取最新的预警记录（前10条）
      const recentAlerts = await this.db
        .select({
          id: alertRecord.id,
          productName: alertRecord.productName,
          alertType: alertRecord.alertType,
          currentStock: alertRecord.currentStock,
          safetyStock: alertRecord.safetyStock,
          shortAmount: alertRecord.shortAmount,
          isHandled: alertRecord.isHandled,
          createdAt: alertRecord.createdAt,
        })
        .from(alertRecord)
        .orderBy(desc(alertRecord.createdAt))
        .limit(10);

      // 5. 获取未处理的预警列表（所有未处理的，不只是最新的10条）
      const pendingAlerts = await this.db
        .select({
          id: alertRecord.id,
          productName: alertRecord.productName,
          alertType: alertRecord.alertType,
          currentStock: alertRecord.currentStock,
          safetyStock: alertRecord.safetyStock,
          shortAmount: alertRecord.shortAmount,
          isHandled: alertRecord.isHandled,
          createdAt: alertRecord.createdAt,
        })
        .from(alertRecord)
        .where(eq(alertRecord.isHandled, false))
        .orderBy(desc(alertRecord.createdAt));

      // 5. 构建邮件内容
      const totalCount = Number(totalResult.count);
      const pendingCount = Number(pendingResult.count);
      const emergencyCount = Number(emergencyResult.count);
      const overstockCount = Number(overstockResult.count);
      const yesterdayCount = Number(yesterdayResult.count);

      const emailContent = this.buildEmailContent({
        totalCount,
        pendingCount,
        emergencyCount,
        overstockCount,
        yesterdayCount,
        recentAlerts: recentAlerts.map(alert => ({
          ...alert,
          alertType: alert.alertType as 'emergency' | 'overstock',
          createdAt: alert.createdAt.toISOString(),
        })),
        pendingAlerts: pendingAlerts.map(alert => ({
          ...alert,
          alertType: alert.alertType as 'emergency' | 'overstock',
          createdAt: alert.createdAt.toISOString(),
        })),
      });

      // 6. 发送邮件
      const transporter = this.createTransporter(config);
      const toEmails = config.toEmails?.length > 0
        ? config.toEmails.join(',')
        : config.smtpUser;

      await transporter.sendMail({
        from: config.fromName
          ? `"${config.fromName}" <${config.fromEmail || config.smtpUser}>`
          : config.fromEmail || config.smtpUser,
        to: toEmails,
        subject: `【库存预警日报】${new Date().toLocaleDateString('zh-CN')} 库存预警汇总`,
        html: emailContent,
      });

      this.logger.log(`每日预警汇总邮件发送成功，收件人: ${toEmails}`);
    } catch (error) {
      this.logger.error('每日预警汇总邮件发送失败', error);
      throw error;
    }
  }

  private createTransporter(config: typeof emailConfig.$inferSelect): Transporter {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.isSsl ?? true,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  private buildEmailContent(data: {
    totalCount: number;
    pendingCount: number;
    emergencyCount: number;
    overstockCount: number;
    yesterdayCount: number;
    recentAlerts: Array<{
      id: string;
      productName: string;
      alertType: 'emergency' | 'overstock';
      currentStock: number | null;
      safetyStock: number | null;
      shortAmount: number | null;
      isHandled: boolean | null;
      createdAt: string;
    }>;
    pendingAlerts: Array<{
      id: string;
      productName: string;
      alertType: 'emergency' | 'overstock';
      currentStock: number | null;
      safetyStock: number | null;
      shortAmount: number | null;
      isHandled: boolean | null;
      createdAt: string;
    }>;
  }): string {
    const alertTypeMap = {
      emergency: '紧急预警',
      overstock: '滞销预警',
    };

    const statusMap = {
      true: '已处理',
      false: '未处理',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .stats { display: flex; flex-wrap: wrap; gap: 15px; padding: 20px; background: #f9fafb; }
    .stat-item { flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-number { font-size: 28px; font-weight: bold; color: #4f46e5; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .alerts-section { padding: 20px; }
    .alerts-section h2 { font-size: 16px; margin-bottom: 15px; color: #374151; }
    .alert-item { padding: 12px; border-left: 4px solid #f59e0b; background: #fffbeb; margin-bottom: 10px; border-radius: 4px; }
    .alert-item.critical { border-left-color: #ef4444; background: #fef2f2; }
    .alert-item.shortage { border-left-color: #f59e0b; background: #fffbeb; }
    .alert-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .alert-title { font-weight: bold; color: #111827; }
    .alert-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .alert-badge.critical { background: #fef2f2; color: #dc2626; }
    .alert-badge.shortage { background: #fffbeb; color: #d97706; }
    .alert-badge.pending { background: #fef3c7; color: #d97706; }
    .alert-badge.resolved { background: #d1fae5; color: #059669; }
    .alert-details { font-size: 13px; color: #6b7280; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 库存预警日报</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
    </div>

    <div class="stats">
      <div class="stat-item">
        <div class="stat-number">${data.totalCount}</div>
        <div class="stat-label">预警总数</div>
      </div>
      <div class="stat-item">
        <div class="stat-number" style="color: #ef4444;">${data.pendingCount}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-item">
        <div class="stat-number" style="color: #f59e0b;">${data.yesterdayCount}</div>
        <div class="stat-label">昨日新增</div>
      </div>
    </div>

    <div style="padding: 0 20px;">
      <div style="display: flex; gap: 15px; margin: 15px 0;">
          <div style="flex: 1; padding: 12px; background: #fef2f2; border-radius: 6px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${data.emergencyCount}</div>
          <div style="font-size: 12px; color: #991b1b;">紧急预警</div>
        </div>
        <div style="flex: 1; padding: 12px; background: #fffbeb; border-radius: 6px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #d97706;">${data.overstockCount}</div>
          <div style="font-size: 12px; color: #92400e;">滞销预警</div>
        </div>
      </div>
    </div>

    ${data.pendingCount > 0 ? `
    <div style="padding: 15px 20px; background: #fef2f2; border-left: 4px solid #ef4444; margin: 0 20px 20px;">
      <div style="display: flex; align-items: center; gap: 8px; color: #dc2626; font-weight: bold; margin-bottom: 5px;">
        <span>⚠️</span>
        <span>您有 ${data.pendingCount} 条预警尚未处理，系统将持续每日提醒</span>
      </div>
      <div style="font-size: 13px; color: #991b1b;">
        请尽快登录系统处理，处理后将停止邮件提醒
      </div>
    </div>
    ` : ''}

    <div class="alerts-section">
      <h2>🚨 待处理预警列表 (${data.pendingCount}条)</h2>
      ${data.pendingAlerts.length === 0
        ? '<p style="color: #059669; text-align: center; padding: 20px;">✅ 太棒了！所有预警已处理完毕</p>'
        : data.pendingAlerts.map(alert => `
          <div class="alert-item ${alert.alertType}">
            <div class="alert-header">
              <span class="alert-title">${alert.productName}</span>
              <div>
                <span class="alert-badge ${alert.alertType}">${alertTypeMap[alert.alertType]}</span>
                <span class="alert-badge pending">未处理</span>
              </div>
            </div>
            <div class="alert-details">
              当前库存: <strong>${alert.currentStock || 0}</strong> |
              安全库存: <strong>${alert.safetyStock || 0}</strong> |
              缺口: <strong style="color: #dc2626;">${alert.shortAmount || 0}</strong> |
              预警时间: ${new Date(alert.createdAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
        `).join('')}
    </div>

    <div class="alerts-section" style="border-top: 1px solid #e5e7eb; margin-top: 20px;">
      <h2>最新预警记录</h2>
      ${data.recentAlerts.length === 0
        ? '<p style="color: #9ca3af; text-align: center; padding: 20px;">暂无预警记录</p>'
        : data.recentAlerts.map(alert => `
          <div class="alert-item ${alert.alertType}">
            <div class="alert-header">
              <span class="alert-title">${alert.productName}</span>
              <div>
                <span class="alert-badge ${alert.alertType}">${alertTypeMap[alert.alertType]}</span>
                <span class="alert-badge ${alert.isHandled ? 'resolved' : 'pending'}">${statusMap[String(alert.isHandled)]}</span>
              </div>
            </div>
            <div class="alert-details">
              当前库存: <strong>${alert.currentStock || 0}</strong> |
              安全库存: <strong>${alert.safetyStock || 0}</strong> |
              缺口: <strong style="color: ${(alert.shortAmount || 0) > 0 ? '#dc2626' : '#059669'};">${alert.shortAmount || 0}</strong>
            </div>
          </div>
        `).join('')}
    </div>

    <div class="footer">
      <p>此邮件由库存管理系统自动发送</p>
      <p>如需调整通知设置，请登录系统查看</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 每30分钟执行一次：根据产品 sellableStatus 同步创建/更新预警记录
   * 当产品状态为 emergency 或 overstock 时，自动创建预警记录
   */
  @BindTrigger('sync_alerts_from_products')
  async syncAlertsFromProducts() {
    this.logger.log('开始执行预警记录同步任务');

    try {
      // 1. 获取所有产品
      const products = await this.db.select().from(product);
      let createdCount = 0;
      let updatedCount = 0;

      for (const prod of products) {
        const sellableStatus = prod.sellableStatus as 'emergency' | 'safe' | 'normal' | 'overstock' | null;
        
        // 只处理 emergency 和 overstock 状态的产品
        if (sellableStatus !== 'emergency' && sellableStatus !== 'overstock') {
          continue;
        }

        const currentStock = prod.currentStock || 0;
        const safetyStock = prod.safetyStock || 0;
        const shortAmount = Math.max(0, safetyStock - currentStock);

        // 2. 检查是否已存在未处理的预警记录
        const existingAlerts = await this.db
          .select()
          .from(alertRecord)
          .where(
            and(
              eq(alertRecord.productId, prod.id),
              eq(alertRecord.isHandled, false)
            )
          );

        if (existingAlerts.length > 0) {
          // 3. 更新现有预警记录
          await this.db
            .update(alertRecord)
            .set({
              currentStock,
              safetyStock,
              shortAmount,
              alertType: sellableStatus,
              sellableDays: prod.sellableDays,
              sellableStatus,
              updatedAt: new Date(),
            })
            .where(eq(alertRecord.id, existingAlerts[0].id));
          updatedCount++;
        } else {
          // 4. 创建新的预警记录
          await this.db.insert(alertRecord).values({
            productId: prod.id,
            productName: prod.name,
            alertType: sellableStatus,
            currentStock,
            safetyStock,
            shortAmount,
            sellableDays: prod.sellableDays,
            sellableStatus,
            isRead: false,
            isHandled: false,
          });
          createdCount++;
        }
      }

      this.logger.log(
        `预警记录同步任务完成，新建 ${createdCount} 条，更新 ${updatedCount} 条`,
      );
    } catch (error) {
      this.logger.error('预警记录同步任务失败', error);
      throw error;
    }
  }
}
