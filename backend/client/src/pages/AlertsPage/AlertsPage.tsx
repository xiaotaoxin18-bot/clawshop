import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangleIcon, CheckCircleIcon, BellIcon, TrendingUpIcon, PackageIcon, MailIcon, SettingsIcon, SendIcon, Loader2Icon, MessageSquareIcon } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import {
  getAlerts,
  getAlertStatistics,
  getHighFrequencyAlerts,
  handleAlert,
  markAlertAsRead,
  sendEmail,
  getNotificationSettings,
  saveNotificationSettings,
  migrateLocalStorageSettings,
  syncAlerts,
} from '@/api';
import type {
  AlertRecord,
  AlertStatistics,
  HighFrequencyAlertProduct,
  NotificationSettings,
  EmailProvider,
  EmailJSConfig,
  SMTPConfig,
  FeishuConfig,
} from '@shared/api.interface';

interface IAlert {
  id: string;
  productId: string;
  productName: string;
  productCode?: string;
  alertType: 'emergency' | 'overstock';
  currentStock: number;
  safetyStock: number;
  shortAmount: number;
  isRead: boolean;
  isHandled?: boolean;
  createdAt: string;
}

// localStorage keys (only for migration, will be removed after migration)
const STORAGE_KEY_LAST_NOTIFIED = '__global_inv_last_notified';
const STORAGE_KEY_EMAIL_SENT = '__global_inv_email_sent';
const STORAGE_KEY_DAILY_DIGEST_SENT = '__global_inv_daily_digest_sent';

// Type aliases for compatibility
interface IEmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  toEmails: string;
}

interface ISMTPConfig {
  toEmails: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  isSsl: boolean;
  fromName: string;
  fromEmail: string;
  reminderInterval: number;
  reminderTypes: string[];
  dailyDigestTime: string;
  dailyDigestEnabled: boolean;
}

interface IFeishuConfig {
  webhookUrl: string;
  secret?: string;  // 可选：签名密钥
  atMobiles?: string;  // 可选：@手机号，多个用逗号分隔
  atUserIds?: string;  // 可选：@用户ID，多个用逗号分隔
}

const mockAlerts: IAlert[] = [
  {
    id: '1',
    productId: 'p1',
    productName: '无线蓝牙耳机 Pro',
    productCode: 'SKU-001',
    alertType: 'emergency',
    currentStock: 5,
    safetyStock: 20,
    shortAmount: 15,
    isRead: false,
    createdAt: '2026-02-13T08:30:00Z',
  },
  {
    id: '2',
    productId: 'p2',
    productName: '智能手表 Series 8',
    productCode: 'SKU-002',
    alertType: 'overstock',
    currentStock: 12,
    safetyStock: 15,
    shortAmount: 3,
    isRead: false,
    createdAt: '2026-02-12T14:20:00Z',
  },
  {
    id: '3',
    productId: 'p3',
    productName: '移动电源 20000mAh',
    productCode: 'SKU-003',
    alertType: 'emergency',
    currentStock: 0,
    safetyStock: 10,
    shortAmount: 10,
    isRead: true,
    createdAt: '2026-02-11T09:15:00Z',
  },
  {
    id: '4',
    productId: 'p4',
    productName: 'USB-C 数据线',
    productCode: 'SKU-004',
    alertType: 'overstock',
    currentStock: 45,
    safetyStock: 50,
    shortAmount: 5,
    isRead: false,
    createdAt: '2026-02-13T10:00:00Z',
  },
  {
    id: '5',
    productId: 'p5',
    productName: '蓝牙音箱 Mini',
    productCode: 'SKU-005',
    alertType: 'emergency',
    currentStock: 8,
    safetyStock: 25,
    shortAmount: 17,
    isRead: false,
    createdAt: '2026-02-10T16:45:00Z',
  },
];

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'emergency' | 'overstock'>('all');
  const [loading, setLoading] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const prevUnreadCountRef = useRef(0);
  
  // 统计数据状态
  const [stats, setStats] = useState<AlertStatistics>({
    totalCount: 0,
    pendingCount: 0,
      emergencyCount: 0,
      overstockCount: 0,
    thisMonthCount: 0,
    handledCount: 0,
    handleRate: 0,
  });
  const [highFrequencyAlerts, setHighFrequencyAlerts] = useState<HighFrequencyAlertProduct[]>([]);
  
  // 邮件配置状态
  const [emailConfigOpen, setEmailConfigOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailProvider, setEmailProvider] = useState<EmailProvider>('smtp');
  
  // EmailJS 配置
  const [emailJSConfig, setEmailJSConfig] = useState<IEmailJSConfig>({
    serviceId: '',
    templateId: '',
    publicKey: '',
    toEmails: '',
  });
  
  // SMTP 配置
  const [smtpConfig, setSmtpConfig] = useState<ISMTPConfig>({
    toEmails: '',
    host: '',
    port: 587,
    user: '',
    pass: '',
    isSsl: true,
    fromName: '',
    fromEmail: '',
    reminderInterval: 60,
    reminderTypes: ['inventory_alert', 'issue_alert'],
    dailyDigestTime: '09:00',
    dailyDigestEnabled: false,
  });
  
  // 飞书配置
  const [feishuConfig, setFeishuConfig] = useState<IFeishuConfig>({
    webhookUrl: '',
    secret: '',
    atMobiles: '',
    atUserIds: '',
  });
  
  const [emailContent, setEmailContent] = useState({
    subject: '',
    body: '',
  });
  const [selectedAlertForEmail, setSelectedAlertForEmail] = useState<IAlert | null>(null);
  const [emailJSLoaded, setEmailJSLoaded] = useState(false);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const sentEmailAlertsRef = useRef<Set<string>>(new Set());
  const lastNotifiedRef = useRef<Record<string, string>>({});
  const lastDailyDigestSentRef = useRef<string>('');

  // 从数据库加载通知设置
  const loadSettings = async () => {
    try {
      const settings = await getNotificationSettings();
      if (settings) {
        setNotificationEnabled(settings.notificationEnabled);
        setEmailProvider(settings.emailProvider as EmailProvider);
        setAutoEmailEnabled(settings.autoEmailEnabled);
        if (settings.emailjsConfig) {
          setEmailJSConfig(settings.emailjsConfig as IEmailJSConfig);
        }
        if (settings.smtpConfig) {
          setSmtpConfig(settings.smtpConfig as ISMTPConfig);
        }
        if (settings.feishuConfig) {
          setFeishuConfig(settings.feishuConfig as IFeishuConfig);
        }
        // 恢复应用级状态
        if (settings.appState) {
          if (settings.appState.lastNotified) {
            lastNotifiedRef.current = settings.appState.lastNotified;
          }
          if (settings.appState.emailSent) {
            sentEmailAlertsRef.current = new Set(settings.appState.emailSent);
          }
          if (settings.appState.dailyDigestSent) {
            lastDailyDigestSentRef.current = settings.appState.dailyDigestSent;
          }
        }
        logger.info('通知设置已从数据库加载');
      } else {
        // 数据库中没有设置，尝试从 localStorage 迁移
        await migrateFromLocalStorage();
      }
    } catch (error) {
      logger.error('加载通知设置失败', error);
      toast.error('加载通知设置失败');
    }
  };

  // 从 localStorage 迁移数据到数据库
  const migrateFromLocalStorage = async () => {
    const localData: Record<string, string | null> = {
      notificationEnabled: localStorage.getItem('__global_inv_notification_enabled'),
      emailProvider: localStorage.getItem('__global_inv_email_provider'),
      emailjsConfig: localStorage.getItem('__global_inv_emailjs_config'),
      smtpConfig: localStorage.getItem('__global_inv_smtp_config'),
      feishuConfig: localStorage.getItem('__global_inv_feishu_config'),
      autoEmailEnabled: localStorage.getItem('__global_inv_auto_email_enabled'),
      lastNotified: localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED),
      emailSent: localStorage.getItem(STORAGE_KEY_EMAIL_SENT),
      dailyDigestSent: localStorage.getItem(STORAGE_KEY_DAILY_DIGEST_SENT),
    };

    // 检查是否有数据需要迁移
    const hasData = Object.values(localData).some(v => v !== null);
    if (!hasData) {
      logger.info('没有本地存储数据需要迁移');
      return;
    }

    try {
      const parsedData = {
        notificationEnabled: localData.notificationEnabled ? JSON.parse(localData.notificationEnabled) : false,
        emailProvider: (localData.emailProvider as EmailProvider) || 'smtp',
        emailjsConfig: localData.emailjsConfig ? JSON.parse(localData.emailjsConfig) : undefined,
        smtpConfig: localData.smtpConfig ? JSON.parse(localData.smtpConfig) : undefined,
        feishuConfig: localData.feishuConfig ? JSON.parse(localData.feishuConfig) : undefined,
        autoEmailEnabled: localData.autoEmailEnabled ? JSON.parse(localData.autoEmailEnabled) : false,
        appState: {
          lastNotified: localData.lastNotified ? JSON.parse(localData.lastNotified) : undefined,
          emailSent: localData.emailSent ? JSON.parse(localData.emailSent) : undefined,
          dailyDigestSent: localData.dailyDigestSent || undefined,
        },
      };

      await migrateLocalStorageSettings(parsedData);
      logger.info('本地存储数据已迁移到数据库');

      // 应用迁移的数据到状态
      setNotificationEnabled(parsedData.notificationEnabled);
      setEmailProvider(parsedData.emailProvider);
      setAutoEmailEnabled(parsedData.autoEmailEnabled);
      if (parsedData.emailjsConfig) setEmailJSConfig(parsedData.emailjsConfig);
      if (parsedData.smtpConfig) setSmtpConfig(parsedData.smtpConfig);
      if (parsedData.feishuConfig) setFeishuConfig(parsedData.feishuConfig);
      if (parsedData.appState.lastNotified) lastNotifiedRef.current = parsedData.appState.lastNotified;
      if (parsedData.appState.emailSent) sentEmailAlertsRef.current = new Set(parsedData.appState.emailSent);
      if (parsedData.appState.dailyDigestSent) lastDailyDigestSentRef.current = parsedData.appState.dailyDigestSent;
    } catch (error) {
      logger.error('迁移本地存储数据失败', error);
    }
  };

  // 保存设置到数据库
  const saveSettings = async () => {
    try {
      await saveNotificationSettings({
        notificationEnabled,
        emailProvider: emailProvider as import('@shared/api.interface').EmailProvider,
        autoEmailEnabled,
        emailjsConfig: emailJSConfig as import('@shared/api.interface').EmailJSConfig,
        smtpConfig: smtpConfig as import('@shared/api.interface').SMTPConfig,
        feishuConfig: feishuConfig as import('@shared/api.interface').FeishuConfig,
        appState: {
          lastNotified: lastNotifiedRef.current,
          emailSent: Array.from(sentEmailAlertsRef.current),
          dailyDigestSent: lastDailyDigestSentRef.current,
        },
      });
    } catch (error) {
      logger.error('保存通知设置失败', error);
    }
  };

  // 检查通知权限和加载设置
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // 加载设置
    loadSettings();

    // 动态加载 EmailJS SDK（仅在需要时加载）
    const loadEmailJS = (retryCount = 0) => {
      if ((window as any).emailjs) {
        setEmailJSLoaded(true);
        logger.info('EmailJS SDK 已存在');
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      script.src = retryCount === 0
        ? 'https://unpkg.com/@emailjs/browser@4/dist/email.min.js'
        : 'https://cdnjs.cloudflare.com/ajax/libs/emailjs-com/3.2.0/email.min.js';

      const timeout = setTimeout(() => {
        if (!(window as any).emailjs) {
          script.remove();
          if (retryCount < 1) {
            logger.warn('EmailJS SDK 加载超时，尝试备用 CDN...');
            loadEmailJS(retryCount + 1);
          } else {
            logger.warn('EmailJS SDK 加载超时，EmailJS 功能不可用');
          }
        }
      }, 10000);

      script.onload = () => {
        clearTimeout(timeout);
        setEmailJSLoaded(true);
        logger.info('EmailJS SDK 加载成功');
      };

      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        if (retryCount < 1) {
          logger.warn('EmailJS SDK 加载失败，尝试备用 CDN...');
          loadEmailJS(retryCount + 1);
        } else {
          logger.warn('EmailJS SDK 加载失败，EmailJS 功能不可用');
        }
      };

      document.head.appendChild(script);
    };

    loadEmailJS();
  }, []);

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('您的浏览器不支持桌面通知');
      return;
    }
    
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      toast.success('已开启桌面通知权限');
      setNotificationEnabled(true);
      saveSettings();
      // 发送测试通知
      new Notification('库存管理系统', {
        body: '桌面通知已启用，有新预警时将自动提醒',
        icon: '/favicon.svg',
      });
    } else if (permission === 'denied') {
      toast.error('通知权限被拒绝，请在浏览器设置中手动开启');
    }
  };

  // 切换通知开关
  const toggleNotification = (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      requestNotificationPermission();
      return;
    }
    setNotificationEnabled(enabled);
    saveSettings();
    toast.success(enabled ? '已开启预警通知' : '已关闭预警通知');
  };

  // 发送预警通知
  const sendAlertNotification = useCallback((alert: IAlert) => {
    if (!notificationEnabled || notificationPermission !== 'granted') return;
    
    const title = alert.alertType === 'emergency' ? '🚨 紧急预警' : '⚠️ 滞销预警';
    const body = `${alert.productName} (${alert.productCode}) 当前库存 ${alert.currentStock}，低于安全线 ${alert.safetyStock}，缺货 ${alert.shortAmount > 0 ? alert.shortAmount : 0} 件`;
    
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: alert.id,
      requireInteraction: alert.alertType === 'emergency',
    });
  }, [notificationEnabled, notificationPermission]);

  // 生成汇总邮件内容
  const generateDigestEmailContent = (alertList: IAlert[]) => {
    const emergencyAlerts = alertList.filter(a => a.alertType === 'emergency');
    const overstockAlerts = alertList.filter(a => a.alertType === 'overstock');
    
    const dateStr = new Date().toLocaleDateString('zh-CN');
    const subject = `【库存预警日报】${dateStr} 共有 ${alertList.length} 个货品需要关注`;
    
    let html = `
      <h2>库存预警日报 - ${dateStr}</h2>
      <p>您好，系统检测到以下库存预警，请及时处理：</p>
      <hr/>
    `;
    
    if (emergencyAlerts.length > 0) {
      html += `<h3 style="color: #dc2626;">🚨 库存临界值预警 (${emergencyAlerts.length}个)</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #fee2e2;">
          <th>货品名称</th><th>编码</th><th>当前库存</th><th>安全线</th><th>缺货</th>
        </tr>`;
      emergencyAlerts.forEach(alert => {
        html += `<tr>
          <td>${alert.productName}</td>
          <td>${alert.productCode}</td>
          <td style="text-align: center; color: #dc2626; font-weight: bold;">${alert.currentStock}</td>
          <td style="text-align: center;">${alert.safetyStock}</td>
          <td style="text-align: center; color: #dc2626;">-${alert.shortAmount > 0 ? alert.shortAmount : 0}</td>
        </tr>`;
      });
      html += `</table><br/>`;
    }
    
    if (overstockAlerts.length > 0) {
      html += `<h3 style="color: #d97706;">⚠️ 缺货预警 (${overstockAlerts.length}个)</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #fef3c7;">
          <th>货品名称</th><th>编码</th><th>当前库存</th><th>安全线</th><th>缺货</th>
        </tr>`;
      overstockAlerts.forEach(alert => {
        html += `<tr>
          <td>${alert.productName}</td>
          <td>${alert.productCode}</td>
          <td style="text-align: center; color: #d97706;">${alert.currentStock}</td>
          <td style="text-align: center;">${alert.safetyStock}</td>
          <td style="text-align: center; color: #d97706;">-${alert.shortAmount > 0 ? alert.shortAmount : 0}</td>
        </tr>`;
      });
      html += `</table><br/>`;
    }
    
    html += `<hr/><p style="color: #6b7280; font-size: 12px;">
      此邮件由库存管理系统自动发送<br/>
      发送时间：${new Date().toLocaleString('zh-CN')}
    </p>`;
    
    const text = `库存预警日报 - ${dateStr}\n\n` +
      `共有 ${alertList.length} 个货品需要关注\n\n` +
      (emergencyAlerts.length > 0 ? `【库存临界值预警】${emergencyAlerts.length}个\n` +
        emergencyAlerts.map(a => `- ${a.productName}(${a.productCode}): 当前${a.currentStock}, 缺货${a.shortAmount > 0 ? a.shortAmount : 0}`).join('\n') + '\n\n' : '') +
      (overstockAlerts.length > 0 ? `【缺货预警】${overstockAlerts.length}个\n` +
        overstockAlerts.map(a => `- ${a.productName}(${a.productCode}): 当前${a.currentStock}, 缺货${a.shortAmount > 0 ? a.shortAmount : 0}`).join('\n') + '\n\n' : '') +
      `---\n库存管理系统\n发送时间：${new Date().toLocaleString('zh-CN')}`;
    
    return { subject, html, text };
  };

  // 发送汇总邮件（每天9点）- EmailJS
  const sendDigestEmailEmailJS = async (alertList: IAlert[]): Promise<boolean> => {
    if (!emailJSLoaded || !(window as any).emailjs) return false;
    
    try {
      const emailjs = (window as any).emailjs;
      emailjs.init(emailJSConfig.publicKey);
      
      const { subject, text } = generateDigestEmailContent(alertList);
      
      const templateParams = {
        to_email: emailJSConfig.toEmails,
        subject: subject,
        message: text,
        send_time: new Date().toLocaleString('zh-CN'),
      };
      
      await emailjs.send(
        emailJSConfig.serviceId,
        emailJSConfig.templateId,
        templateParams
      );
      
      logger.info('EmailJS 汇总邮件发送成功');
      return true;
    } catch (error) {
      logger.error('EmailJS 汇总邮件发送失败:', error);
      return false;
    }
  };

  // 发送汇总邮件（每天9点）- SMTP
  const sendDigestEmailSMTP = async (alertList: IAlert[]): Promise<boolean> => {
    try {
      const { subject, html, text } = generateDigestEmailContent(alertList);
      
      const result = await sendEmail({
        to: smtpConfig.toEmails,
        subject,
        content: html || text,
        isHtml: true,
        smtpConfig: {
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          pass: smtpConfig.pass,
          isSsl: smtpConfig.isSsl,
          fromName: smtpConfig.fromName,
          fromEmail: smtpConfig.fromEmail,
        },
      });
      
      logger.info('SMTP 汇总邮件发送成功');
      return true;
    } catch (error) {
      logger.error('SMTP 汇总邮件发送失败:', error);
      return false;
    }
  };

  // 生成飞书卡片消息内容
  const generateFeishuCardContent = (alertList: IAlert[]) => {
    const emergencyAlerts = alertList.filter(a => a.alertType === 'emergency');
    const overstockAlerts = alertList.filter(a => a.alertType === 'overstock');
    const dateStr = new Date().toLocaleDateString('zh-CN');
    
    const elements: any[] = [];
    
    // 标题
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: `**📦 库存预警日报 - ${dateStr}**` }
    });
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: `共有 **${alertList.length}** 个货品需要关注` }
    });
    elements.push({ tag: 'hr' });
    
    // 临界值预警
    if (emergencyAlerts.length > 0) {
      elements.push({
        tag: 'div',
        text: { tag: 'lark_md', content: `**🚨 库存临界值预警 (${emergencyAlerts.length}个)**` }
      });
      emergencyAlerts.forEach(alert => {
        elements.push({
          tag: 'div',
          text: { 
            tag: 'lark_md', 
            content: `• ${alert.productName} | 当前库存: **${alert.currentStock}** | 缺货: **${alert.shortAmount > 0 ? alert.shortAmount : 0}**` 
          }
        });
      });
      elements.push({ tag: 'hr' });
    }
    
    // 缺货预警
    if (overstockAlerts.length > 0) {
      elements.push({
        tag: 'div',
        text: { tag: 'lark_md', content: `**⚠️ 缺货预警 (${overstockAlerts.length}个)**` }
      });
      overstockAlerts.forEach(alert => {
        elements.push({
          tag: 'div',
          text: { 
            tag: 'lark_md', 
            content: `• ${alert.productName} | 当前库存: **${alert.currentStock}** | 缺货: **${alert.shortAmount > 0 ? alert.shortAmount : 0}**` 
          }
        });
      });
      elements.push({ tag: 'hr' });
    }
    
    elements.push({
      tag: 'note',
      elements: [{ tag: 'plain_text', content: '💡 请及时安排补货，避免影响正常销售' }]
    });
    
    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '库存预警日报' },
        template: emergencyAlerts.length > 0 ? 'red' : 'orange'
      },
      elements
    };
  };

  // 发送汇总消息到飞书（每天9点）
  const sendDigestFeishu = async (alertList: IAlert[]): Promise<boolean> => {
    try {
      const card = generateFeishuCardContent(alertList);
      
      const body: any = {
        msg_type: 'interactive',
        card
      };
      
      // 添加 @ 提醒
      if (feishuConfig.atMobiles || feishuConfig.atUserIds) {
        body.content = {};
        if (feishuConfig.atMobiles) {
          body.content.atMobiles = feishuConfig.atMobiles.split(',').map(s => s.trim());
        }
        if (feishuConfig.atUserIds) {
          body.content.atUserIds = feishuConfig.atUserIds.split(',').map(s => s.trim());
        }
      }
      
      const response = await fetch(feishuConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        logger.info('飞书汇总消息发送成功:', result);
        return true;
      } else {
        logger.error('飞书汇总消息发送失败:', result);
        return false;
      }
    } catch (error) {
      logger.error('飞书汇总消息发送失败:', error);
      return false;
    }
  };

  // 发送单个预警到飞书
  const sendSingleAlertFeishu = async (alert: IAlert): Promise<boolean> => {
    try {
      const typeText = alert.alertType === 'emergency' ? '紧急预警' : '滞销预警';
      const template = alert.alertType === 'emergency' ? 'red' : 'orange';
      
      const card = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: typeText },
          template
        },
        elements: [
          {
            tag: 'div',
            text: { 
              tag: 'lark_md', 
              content: `**${alert.productName}** (${alert.productCode})` 
            }
          },
          {
            tag: 'div',
            text: { 
              tag: 'lark_md', 
              content: `当前库存: **${alert.currentStock}** 件\n安全库存: ${alert.safetyStock} 件\n缺货数量: **${alert.shortAmount > 0 ? alert.shortAmount : 0}** 件` 
            }
          },
          { tag: 'hr' },
          {
            tag: 'note',
            elements: [{ tag: 'plain_text', content: '💡 请及时安排补货' }]
          }
        ]
      };
      
      const body: any = {
        msg_type: 'interactive',
        card
      };
      
      if (feishuConfig.atMobiles || feishuConfig.atUserIds) {
        body.content = {};
        if (feishuConfig.atMobiles) {
          body.content.atMobiles = feishuConfig.atMobiles.split(',').map(s => s.trim());
        }
        if (feishuConfig.atUserIds) {
          body.content.atUserIds = feishuConfig.atUserIds.split(',').map(s => s.trim());
        }
      }
      
      const response = await fetch(feishuConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        logger.info('飞书单条消息发送成功:', result);
        return true;
      } else {
        logger.error('飞书单条消息发送失败:', result);
        return false;
      }
    } catch (error) {
      logger.error('飞书单条消息发送失败:', error);
      return false;
    }
  };

  // 发送每日汇总邮件
  const sendDailyDigestEmail = useCallback(async () => {
    if (!autoEmailEnabled) return;
    
    const unreadAlerts = alerts.filter(a => !a.isRead);
    if (unreadAlerts.length === 0) return;
    
    // 检查今天是否已经发送过
    const today = new Date().toDateString();
    if (lastDailyDigestSentRef.current === today) {
      logger.info('今日汇总邮件已发送，跳过');
      return;
    }
    
    let success = false;
    
    if (emailProvider === 'emailjs') {
      if (!emailJSConfig.serviceId || !emailJSConfig.templateId || !emailJSConfig.publicKey || !emailJSConfig.toEmails) {
        logger.warn('EmailJS 配置不完整，无法发送汇总邮件');
        return;
      }
      success = await sendDigestEmailEmailJS(unreadAlerts);
    } else if (emailProvider === 'smtp') {
      if (!smtpConfig.toEmails) {
        logger.warn('SMTP 配置不完整，无法发送汇总邮件');
        return;
      }
      success = await sendDigestEmailSMTP(unreadAlerts);
    } else if (emailProvider === 'feishu') {
      if (!feishuConfig.webhookUrl) {
        logger.warn('飞书配置不完整，无法发送汇总消息');
        return;
      }
      success = await sendDigestFeishu(unreadAlerts);
    }
    
    if (success) {
      lastDailyDigestSentRef.current = today;
      // 保存到数据库
      saveSettings();
      if (emailProvider === 'feishu') {
        toast.success(`已发送每日预警汇总到飞书群，共 ${unreadAlerts.length} 个货品`, { duration: 5000 });
      } else {
        toast.success(`已发送每日预警汇总邮件，共 ${unreadAlerts.length} 个货品`, { duration: 5000 });
      }
    }
  }, [autoEmailEnabled, alerts, emailProvider, emailJSConfig, smtpConfig, feishuConfig, emailJSLoaded]);

  // 从后端 API 加载预警数据、统计数据和高频预警货品
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 先同步预警数据
        await syncAlerts();
        // 并行加载所有数据
        const [alertsResponse, statsData, highFreqData] = await Promise.all([
          getAlerts({ page: 1, pageSize: 100 }),
          getAlertStatistics(),
          getHighFrequencyAlerts(),
        ]);
        
        // 转换后端数据格式为前端格式
        const formattedAlerts: IAlert[] = alertsResponse.items.map((alert: AlertRecord) => ({
          id: alert.id,
          productId: alert.productId,
          productName: alert.productName,
          alertType: alert.alertType,
          currentStock: alert.currentStock,
          safetyStock: alert.safetyStock,
          shortAmount: alert.shortAmount,
          isRead: alert.isRead,
          isHandled: alert.isHandled,
          createdAt: alert.createdAt,
        }));
        setAlerts(formattedAlerts);
        setStats(statsData);
        setHighFrequencyAlerts(highFreqData);
      } catch (error) {
        logger.error('加载预警数据失败', error);
        toast.error('加载预警数据失败');
        // 如果 API 失败，使用 mock 数据作为 fallback
        setAlerts(mockAlerts.map(m => ({ ...m, isHandled: false })));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 监听新预警并发送桌面通知
  useEffect(() => {
    const unreadCount = alerts.filter(a => !a.isRead).length;
    
    // 当未读预警增加时发送桌面通知
    if (unreadCount > prevUnreadCountRef.current && notificationEnabled) {
      const newAlerts = alerts.filter(a => !a.isRead).slice(0, unreadCount - prevUnreadCountRef.current);
      
      newAlerts.forEach(alert => {
        if (!lastNotifiedRef.current[alert.id]) {
          sendAlertNotification(alert);
          lastNotifiedRef.current[alert.id] = new Date().toISOString();
          // 保存到数据库
          saveSettings();
        }
      });
    }
    
    prevUnreadCountRef.current = unreadCount;
  }, [alerts, notificationEnabled, sendAlertNotification]);

  // 定时任务：每天9点发送汇总邮件
  useEffect(() => {
    if (!autoEmailEnabled) return;
    
    const checkAndSendDigest = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 每天9:00发送
      if (hours === 9 && minutes === 0) {
        sendDailyDigestEmail();
      }
    };
    
    // 每分钟检查一次
    const interval = setInterval(checkAndSendDigest, 60000);
    
    // 页面加载时也检查一次（如果正好是9点）
    checkAndSendDigest();
    
    return () => clearInterval(interval);
  }, [autoEmailEnabled, sendDailyDigestEmail]);

  // 切换自动邮件开关
  const toggleAutoEmail = async (enabled: boolean) => {
    if (enabled) {
      if (emailProvider === 'emailjs') {
        if (!emailJSConfig.serviceId || !emailJSConfig.templateId || !emailJSConfig.publicKey) {
          toast.error('请先配置 EmailJS 参数');
          setEmailConfigOpen(true);
          return;
        }
        if (!emailJSConfig.toEmails) {
          toast.error('请配置收件人邮箱');
          setEmailConfigOpen(true);
          return;
        }
      } else if (emailProvider === 'smtp') {
        if (!smtpConfig.toEmails) {
          toast.error('请配置收件人邮箱');
          setEmailConfigOpen(true);
          return;
        }
      } else if (emailProvider === 'feishu') {
        if (!feishuConfig.webhookUrl) {
          toast.error('请先配置飞书 Webhook 地址');
          setEmailConfigOpen(true);
          return;
        }
      }
    }
    setAutoEmailEnabled(enabled);
    // 直接调用 API 保存，避免异步状态更新导致保存旧值
    try {
      await saveNotificationSettings({
        notificationEnabled,
        emailProvider: emailProvider as import('@shared/api.interface').EmailProvider,
        autoEmailEnabled: enabled,
        emailjsConfig: emailJSConfig as import('@shared/api.interface').EmailJSConfig,
        smtpConfig: smtpConfig as import('@shared/api.interface').SMTPConfig,
        feishuConfig: feishuConfig as import('@shared/api.interface').FeishuConfig,
        appState: {
          lastNotified: lastNotifiedRef.current,
          emailSent: Array.from(sentEmailAlertsRef.current),
          dailyDigestSent: lastDailyDigestSentRef.current,
        },
      });
    } catch (error) {
      logger.error('保存通知设置失败', error);
    }
    const msg = emailProvider === 'feishu'
      ? (enabled ? '已开启飞书自动提醒' : '已关闭飞书自动提醒')
      : (enabled ? '已开启自动邮件提醒' : '已关闭自动邮件提醒');
    toast.success(msg);
  };

  const saveAlerts = (newAlerts: IAlert[]) => {
    setAlerts(newAlerts);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === 'all') return true;
    return alert.alertType === activeTab;
  });

  // 优先使用从后端获取的统计数据，如果不可用则从 alerts 数组计算
  const unreadCount = stats.pendingCount || alerts.filter((a) => !a.isRead && !a.isHandled).length;
  const emergencyCount = stats.emergencyCount || alerts.filter((a) => a.alertType === 'emergency' && !a.isRead && !a.isHandled).length;
  const overstockCount = stats.overstockCount || alerts.filter((a) => a.alertType === 'overstock' && !a.isRead && !a.isHandled).length;

  const handleMarkAsRead = (alertId: string) => {
    const newAlerts = alerts.map((a) =>
      a.id === alertId ? { ...a, isRead: true } : a
    );
    saveAlerts(newAlerts);
    toast.success('已标记为已处理');

    // 从已通知列表中移除
    if (lastNotifiedRef.current[alertId]) {
      delete lastNotifiedRef.current[alertId];
    }

    // 从已发送邮件列表中移除，允许重新发送
    if (sentEmailAlertsRef.current.has(alertId)) {
      sentEmailAlertsRef.current.delete(alertId);
    }

    // 保存到数据库
    saveSettings();
  };

  // 保存邮件配置
  const saveEmailConfig = () => {
    if (emailProvider === 'emailjs') {
      if (!emailJSConfig.serviceId || !emailJSConfig.templateId || !emailJSConfig.publicKey) {
        toast.error('请填写完整的 EmailJS 配置信息');
        return;
      }
      toast.success('EmailJS 配置已保存');
    } else if (emailProvider === 'smtp') {
      if (!smtpConfig.host) {
        toast.error('请填写 SMTP 服务器地址');
        return;
      }
      if (!smtpConfig.user) {
        toast.error('请填写 SMTP 用户名');
        return;
      }
      if (!smtpConfig.pass) {
        toast.error('请填写 SMTP 密码');
        return;
      }
      if (!smtpConfig.toEmails) {
        toast.error('请填写收件人邮箱');
        return;
      }
      toast.success('SMTP 配置已保存');
    } else if (emailProvider === 'feishu') {
      if (!feishuConfig.webhookUrl) {
        toast.error('请填写飞书 Webhook 地址');
        return;
      }
      toast.success('飞书配置已保存');
    }

    // 保存到数据库
    saveSettings();
    setEmailConfigOpen(false);
  };

  // 生成邮件内容
  const generateEmailContent = (alert: IAlert) => {
    const typeText = alert.alertType === 'emergency' ? '紧急预警' : '滞销预警';
    const subject = `【${typeText}】${alert.productName} - 库存不足`;
    const body = `您好，\n\n系统检测到以下库存预警：\n\n` +
      `货品名称：${alert.productName}\n` +
      `货品编码：${alert.productCode}\n` +
      `预警类型：${typeText}\n` +
      `当前库存：${alert.currentStock} 件\n` +
      `安全库存：${alert.safetyStock} 件\n` +
      `缺货数量：${alert.shortAmount > 0 ? alert.shortAmount : 0} 件\n\n` +
      `请及时安排补货，避免影响正常销售。\n\n` +
      `---\n` +
      `此邮件由库存管理系统自动发送\n` +
      `发送时间：${new Date().toLocaleString()}`;
    
    setEmailContent({ subject, body });
    setSelectedAlertForEmail(alert);
    setSendEmailOpen(true);
  };

  // 使用 EmailJS 发送单个邮件
  const sendSingleEmailEmailJS = async (): Promise<boolean> => {
    if (!emailJSLoaded || !(window as any).emailjs) {
      throw new Error('EmailJS SDK 尚未加载完成');
    }
    
    const emailjs = (window as any).emailjs;
    emailjs.init(emailJSConfig.publicKey);
    
    const templateParams = {
      to_email: emailJSConfig.toEmails,
      subject: emailContent.subject,
      message: emailContent.body,
      product_name: selectedAlertForEmail?.productName || '',
      product_code: selectedAlertForEmail?.productCode || '',
      alert_type: selectedAlertForEmail?.alertType === 'emergency' ? '紧急预警' : '滞销预警',
      current_stock: selectedAlertForEmail?.currentStock || 0,
      safety_stock: selectedAlertForEmail?.safetyStock || 0,
      short_amount: selectedAlertForEmail && selectedAlertForEmail.shortAmount > 0 ? selectedAlertForEmail.shortAmount : 0,
      send_time: new Date().toLocaleString('zh-CN'),
    };
    
    const response = await emailjs.send(
      emailJSConfig.serviceId,
      emailJSConfig.templateId,
      templateParams
    );
    
    return response.status === 200;
  };

  // 使用 SMTP 发送单个邮件
  const sendSingleEmailSMTP = async (): Promise<boolean> => {
    try {
      const result = await sendEmail({
        to: smtpConfig.toEmails,
        subject: emailContent.subject,
        content: emailContent.body,
        isHtml: false,
        smtpConfig: {
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          pass: smtpConfig.pass,
          isSsl: smtpConfig.isSsl,
          fromName: smtpConfig.fromName,
          fromEmail: smtpConfig.fromEmail,
        },
      });
      
      logger.info('SMTP 单封邮件发送成功');
      return true;
    } catch (error) {
      logger.error('SMTP 单封邮件发送失败:', error);
      throw error;
    }
  };

  // 发送邮件入口
  const handleSendEmail = async () => {
    // 检查配置
    if (emailProvider === 'emailjs') {
      if (!emailJSConfig.serviceId || !emailJSConfig.templateId || !emailJSConfig.publicKey) {
        toast.error('请先配置 EmailJS 参数');
        setSendEmailOpen(false);
        setEmailConfigOpen(true);
        return;
      }
      if (!emailJSConfig.toEmails) {
        toast.error('请配置收件人邮箱');
        return;
      }
    } else if (emailProvider === 'smtp') {
      if (!smtpConfig.toEmails) {
        toast.error('请配置收件人邮箱');
        return;
      }
    } else if (emailProvider === 'feishu') {
      if (!feishuConfig.webhookUrl) {
        toast.error('请先配置飞书 Webhook 地址');
        setSendEmailOpen(false);
        setEmailConfigOpen(true);
        return;
      }
    }
    
    setSendingEmail(true);
    
    try {
      let success = false;
      const toEmails = emailProvider === 'emailjs' ? emailJSConfig.toEmails : smtpConfig.toEmails;
      
      if (emailProvider === 'emailjs') {
        success = await sendSingleEmailEmailJS();
      } else if (emailProvider === 'smtp') {
        success = await sendSingleEmailSMTP();
      } else if (emailProvider === 'feishu') {
        if (selectedAlertForEmail) {
          success = await sendSingleAlertFeishu(selectedAlertForEmail);
        }
      }
      
      setSendingEmail(false);
      setSendEmailOpen(false);
      
      if (success) {
        if (emailProvider === 'feishu') {
          toast.success('消息已发送到飞书群', {
            description: `货品: ${selectedAlertForEmail?.productName}`,
            duration: 5000,
          });
        } else {
          toast.success('邮件发送成功', {
            description: `收件人: ${toEmails}\n主题: ${emailContent.subject}`,
            duration: 5000,
          });
        }
        
        logger.info(`${emailProvider} 发送成功:`, {
          alertId: selectedAlertForEmail?.id,
        });
      }
    } catch (error: any) {
      setSendingEmail(false);
      logger.error(`${emailProvider} 发送失败:`, error);
      
      let errorMsg = '请检查配置信息是否正确';
      if (error.text) {
        errorMsg = error.text;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      toast.error(emailProvider === 'feishu' ? '飞书消息发送失败' : '邮件发送失败', {
        description: errorMsg,
      });
    }
  };

  const handleMarkAllAsRead = () => {
    const newAlerts = alerts.map((a) => ({ ...a, isRead: true }));
    saveAlerts(newAlerts);
    toast.success('全部标记为已处理');
  };

  const handleViewDetail = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  // 使用从后端获取的统计数据中的本月预警次数
  const thisMonthAlerts = stats.thisMonthCount || alerts.filter((a) => {
    const date = new Date(a.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .alerts-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="w-full flex flex-col gap-6 alerts-page">
        <section className="w-full flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">预警中心</h1>
            <p className="text-sm text-muted-foreground mt-1">集中管理所有库存预警提醒</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 自动提醒开关 */}
            <Card className="p-0 border-0 shadow-none bg-transparent">
              <CardContent className="p-0 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {emailProvider === 'feishu' ? (
                    <MessageSquareIcon className="w-4 h-4" />
                  ) : (
                    <MailIcon className="w-4 h-4" />
                  )}
                  <span>自动提醒</span>
                </div>
                <Switch
                  checked={autoEmailEnabled}
                  onCheckedChange={toggleAutoEmail}
                />
              </CardContent>
            </Card>
            {/* 邮件配置按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailConfigOpen(true)}
              className={(emailProvider === 'emailjs' && emailJSConfig.serviceId) || 
                        (emailProvider === 'smtp' && smtpConfig.toEmails) ||
                        (emailProvider === 'feishu' && feishuConfig.webhookUrl)
                        ? 'text-success border-success' : ''}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              {emailProvider === 'feishu' ? '飞书配置' : '邮件配置'}
              {((emailProvider === 'emailjs' && emailJSConfig.serviceId) || 
                (emailProvider === 'smtp' && smtpConfig.toEmails) ||
                (emailProvider === 'feishu' && feishuConfig.webhookUrl)) && 
                <CheckCircleIcon className="w-3 h-3 ml-1" />
              }
            </Button>
            {/* 桌面通知开关 */}
            <Card className="p-0 border-0 shadow-none bg-transparent">
              <CardContent className="p-0 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MailIcon className="w-4 h-4" />
                  <span>桌面通知</span>
                </div>
                {notificationPermission === 'granted' ? (
                  <Switch
                    checked={notificationEnabled}
                    onCheckedChange={toggleNotification}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNotificationPermission}
                  >
                    开启通知
                  </Button>
                )}
              </CardContent>
            </Card>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                全部标记已处理
              </Button>
            )}
          </div>
        </section>

        <section className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待处理预警</p>
                  <p className="text-3xl font-bold text-foreground font-mono mt-1">{unreadCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <BellIcon className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">紧急预警</p>
                  <p className="text-3xl font-bold text-destructive font-mono mt-1">{emergencyCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10">
                  <AlertTriangleIcon className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">滞销预警</p>
                  <p className="text-3xl font-bold text-warning font-mono mt-1">{overstockCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <PackageIcon className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">本月预警次数</p>
                  <p className="text-3xl font-bold text-foreground font-mono mt-1">{thisMonthAlerts}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUpIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>产品预警列表</CardTitle>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList>
                    <TabsTrigger value="all">
                      全部
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="emergency">临界值</TabsTrigger>
                    <TabsTrigger value="overstock">滞销</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-success" />
                  <p>暂无预警记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>货品信息</TableHead>
                        <TableHead>预警类型</TableHead>
                        <TableHead className="text-right">当前库存</TableHead>
                        <TableHead className="text-right">安全线</TableHead>
                        <TableHead className="text-right">缺货数量</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.map((alert) => (
                        <TableRow
                          key={alert.id}
                          className={alert.isRead ? 'opacity-60' : ''}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{alert.productName}</p>
                              <p className="text-xs text-muted-foreground">{alert.productCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                alert.alertType === 'emergency'
                                  ? 'border-destructive text-destructive'
                                  : 'border-warning text-warning'
                              }
                            >
                              {alert.alertType === 'emergency' ? '紧急' : '滞销'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${alert.currentStock < 0 ? 'text-destructive' : ''}`}>{alert.currentStock}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {alert.safetyStock}
                          </TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            -{alert.shortAmount > 0 ? alert.shortAmount : 0}
                          </TableCell>
                          <TableCell>
                            {alert.isRead ? (
                              <Badge variant="secondary">已处理</Badge>
                            ) : (
                              <Badge className="bg-warning text-warning-foreground">待处理</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(alert.productId)}
                              >
                                详情
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateEmailContent(alert)}
                                title={emailProvider === 'feishu' ? '发送到飞书群' : '发送邮件提醒'}
                              >
                                {emailProvider === 'feishu' ? (
                                  <MessageSquareIcon className="w-4 h-4" />
                                ) : (
                                  <MailIcon className="w-4 h-4" />
                                )}
                              </Button>
                              {!alert.isRead && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(alert.id)}
                                >
                                  标记已处理
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>高频预警货品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {highFrequencyAlerts.length > 0 ? (
                  highFrequencyAlerts.map((item, index) => (
                    <div key={item.productId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm text-foreground">{item.productName}</span>
                      </div>
                      <span className="text-sm font-mono font-medium text-muted-foreground">
                        {item.alertCount} 次
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    暂无高频预警货品
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">预警处理建议</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-warning">•</span>
                    <span>临界值预警：建议立即补货，避免断货风险</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    <span>缺货预警：已无法销售，需紧急采购</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">•</span>
                    <span>标记已处理后系统将不再提醒</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <MailIcon className="w-4 h-4" />
                  提醒功能
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>支持 EmailJS（国际）、SMTP（系统）、飞书群机器人</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>开启「自动提醒」后每天9点发送汇总消息</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>汇总消息包含所有待处理预警货品</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>点击图标可手动发送单个预警提醒</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>飞书支持卡片消息和 @ 提醒功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>免费额度：EmailJS 200封/月，SMTP无限制，飞书无限制</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <BellIcon className="w-4 h-4" />
                  桌面通知说明
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>开启后将在桌面右下角弹出预警提醒</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>即使浏览器最小化也能收到通知</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>每种预警只会提醒一次，标记后重置</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* 邮件配置弹窗 */}
      <Dialog open={emailConfigOpen} onOpenChange={setEmailConfigOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              邮件服务配置
            </DialogTitle>
            <DialogDescription>
              选择邮件服务商并配置参数，用于发送预警邮件。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 邮件服务商选择 */}
            <div className="space-y-2">
              <Label>邮件服务商</Label>
              <Select 
                value={emailProvider} 
                onValueChange={(v: EmailProvider) => setEmailProvider(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emailjs">EmailJS（国际）</SelectItem>
                  <SelectItem value="smtp">SMTP（系统）</SelectItem>
                  <SelectItem value="feishu">飞书群机器人</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EmailJS 配置 */}
            {emailProvider === 'emailjs' && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-blue-800">
                    <UniversalLink 
                      to="https://www.emailjs.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      前往 EmailJS 官网注册
                    </UniversalLink>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-id">
                    Service ID
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="service-id"
                    placeholder="service_xxxxxxxx"
                    value={emailJSConfig.serviceId}
                    onChange={(e) => setEmailJSConfig({ ...emailJSConfig, serviceId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    在 EmailJS 控制台 → Email Services 中创建服务后获取
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-id">
                    Template ID
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="template-id"
                    placeholder="template_xxxxxxxx"
                    value={emailJSConfig.templateId}
                    onChange={(e) => setEmailJSConfig({ ...emailJSConfig, templateId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    在 EmailJS 控制台 → Email Templates 中创建模板后获取
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public-key">
                    Public Key
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="public-key"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxx"
                    value={emailJSConfig.publicKey}
                    onChange={(e) => setEmailJSConfig({ ...emailJSConfig, publicKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    在 EmailJS 控制台 → Account → General 页面获取 Public Key
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-emails">
                    收件人邮箱
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="to-emails"
                    placeholder="manager@example.com, buyer@example.com"
                    value={emailJSConfig.toEmails}
                    onChange={(e) => setEmailJSConfig({ ...emailJSConfig, toEmails: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    多个收件人用逗号分隔，或使用模板变量在 EmailJS 中配置
                  </p>
                </div>
                <div className="mt-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">使用说明：</p>
                  <ol className="space-y-1 list-decimal list-inside text-xs">
                    <li>注册 EmailJS 账号（免费版每月 200 封邮件）</li>
                    <li>添加 Email Service（连接你的 SMTP 服务器）</li>
                    <li>创建 Email Template，可使用变量如 {'{{product_name}}'} 等</li>
                    <li>复制上方的 Service ID、Template ID、Public Key</li>
                  </ol>
                </div>
              </div>
            )}

            {/* SMTP 配置 */}
            {emailProvider === 'smtp' && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-green-50 rounded-lg text-sm">
                  <p className="text-green-800">
                    配置您的 SMTP 服务器发送邮件
                  </p>
                </div>
                
                {/* SMTP 服务器地址 */}
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">
                    SMTP 服务器地址
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.example.com"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  />
                </div>
                
                {/* SMTP 端口和 SSL */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">
                      端口
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      placeholder="587"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
                    />
                  </div>
                  <div className="space-y-2 flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smtpConfig.isSsl}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, isSsl: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">启用 SSL/TLS</span>
                    </label>
                  </div>
                </div>
                
                {/* SMTP 用户名 */}
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">
                    用户名
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="smtp-user"
                    placeholder="your-email@example.com"
                    value={smtpConfig.user}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  />
                </div>
                
                {/* SMTP 密码 */}
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">
                    密码 / 授权码
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    placeholder="您的邮箱密码或授权码"
                    value={smtpConfig.pass}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  />
                </div>
                
                {/* 发件人信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from-name">
                      发件人名称
                    </Label>
                    <Input
                      id="smtp-from-name"
                      placeholder="库存管理系统"
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from-email">
                      发件人邮箱
                    </Label>
                    <Input
                      id="smtp-from-email"
                      placeholder="noreply@example.com"
                      value={smtpConfig.fromEmail}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* 收件人邮箱 */}
                <div className="space-y-2">
                  <Label htmlFor="smtp-to-emails">
                    收件人邮箱
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="smtp-to-emails"
                    placeholder="manager@example.com, buyer@example.com"
                    value={smtpConfig.toEmails}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, toEmails: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    多个收件人用逗号分隔
                  </p>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-border my-4"></div>

                {/* 自动提醒设置 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">自动提醒设置</h4>

                  {/* 提醒间隔 */}
                  <div className="space-y-2">
                    <Label htmlFor="reminder-interval">
                      检查间隔（分钟）
                    </Label>
                    <Input
                      id="reminder-interval"
                      type="number"
                      min={10}
                      max={1440}
                      value={smtpConfig.reminderInterval}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, reminderInterval: parseInt(e.target.value) || 60 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      系统检查库存预警和异常问题的时间间隔
                    </p>
                  </div>

                  {/* 提醒类型 */}
                  <div className="space-y-2">
                    <Label>提醒类型</Label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpConfig.reminderTypes.includes('inventory_alert')}
                          onChange={(e) => {
                            const types = e.target.checked
                              ? [...smtpConfig.reminderTypes, 'inventory_alert']
                              : smtpConfig.reminderTypes.filter(t => t !== 'inventory_alert');
                            setSmtpConfig({ ...smtpConfig, reminderTypes: types });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">库存预警提醒</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpConfig.reminderTypes.includes('issue_alert')}
                          onChange={(e) => {
                            const types = e.target.checked
                              ? [...smtpConfig.reminderTypes, 'issue_alert']
                              : smtpConfig.reminderTypes.filter(t => t !== 'issue_alert');
                            setSmtpConfig({ ...smtpConfig, reminderTypes: types });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">异常问题提醒</span>
                      </label>
                    </div>
                  </div>

                  {/* 每日汇总开关 */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smtpConfig.dailyDigestEnabled}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, dailyDigestEnabled: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">启用每日汇总邮件</span>
                    </Label>
                  </div>

                  {/* 每日汇总发送时间 */}
                  {smtpConfig.dailyDigestEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="daily-digest-time">
                        每日汇总发送时间
                      </Label>
                      <Input
                        id="daily-digest-time"
                        type="time"
                        value={smtpConfig.dailyDigestTime}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, dailyDigestTime: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        每天指定时间发送前一天的汇总邮件
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">使用说明：</p>
                  <ol className="space-y-1 list-decimal list-inside text-xs">
                    <li>配置您的 SMTP 服务器信息（如企业邮箱、QQ邮箱等）</li>
                    <li>部分邮箱需要使用授权码而非登录密码</li>
                    <li>SSL 端口通常为 465，非 SSL 端口通常为 25 或 587</li>
                    <li>保存配置后点击测试按钮验证连接</li>
                  </ol>
                </div>
              </div>
            )}

            {/* 飞书配置 */}
            {emailProvider === 'feishu' && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-blue-800">
                    <UniversalLink 
                      to="https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      查看飞书官方文档
                    </UniversalLink>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feishu-webhook">
                    Webhook 地址
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="feishu-webhook"
                    type="url"
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxx"
                    value={feishuConfig.webhookUrl}
                    onChange={(e) => setFeishuConfig({ ...feishuConfig, webhookUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    在飞书群 → 设置 → 群机器人 → 添加自定义机器人获取
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feishu-secret">签名密钥（可选）</Label>
                  <Input
                    id="feishu-secret"
                    type="password"
                    placeholder="xxxxxxxxxx"
                    value={feishuConfig.secret}
                    onChange={(e) => setFeishuConfig({ ...feishuConfig, secret: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    如果启用了签名校验，需填写密钥进行验证
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feishu-at-mobiles">@手机号（可选）</Label>
                  <Input
                    id="feishu-at-mobiles"
                    placeholder="13800138000, 13900139000"
                    value={feishuConfig.atMobiles}
                    onChange={(e) => setFeishuConfig({ ...feishuConfig, atMobiles: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    需要 @ 的用户手机号，多个用逗号分隔
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feishu-at-userids">@用户ID（可选）</Label>
                  <Input
                    id="feishu-at-userids"
                    placeholder="ou_xxxxxxxx, ou_yyyyyyyy"
                    value={feishuConfig.atUserIds}
                    onChange={(e) => setFeishuConfig({ ...feishuConfig, atUserIds: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    需要 @ 的用户 Open ID，多个用逗号分隔
                  </p>
                </div>
                <div className="mt-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">配置步骤：</p>
                  <ol className="space-y-1 list-decimal list-inside text-xs">
                    <li>在飞书群右上角点击「设置」→「群机器人」</li>
                    <li>点击「添加机器人」→「自定义机器人」</li>
                    <li>设置机器人名称（如：库存预警助手）</li>
                    <li>复制 Webhook 地址粘贴到上方</li>
                    <li>（可选）设置需要 @ 提醒的成员</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailConfigOpen(false)}>
              取消
            </Button>
            <Button onClick={saveEmailConfig}>
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发送邮件弹窗 */}
      <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SendIcon className="w-5 h-5" />
              {emailProvider === 'feishu' ? '发送到飞书群' : '发送预警邮件'}
            </DialogTitle>
            <DialogDescription>
              {emailProvider === 'feishu' ? '预览并发送预警消息到飞书群。' : '预览并发送预警邮件提醒。'}
              当前使用：<Badge variant="outline">
                {emailProvider === 'emailjs' ? 'EmailJS' : emailProvider === 'smtp' ? 'SMTP' : '飞书群机器人'}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {emailProvider !== 'feishu' && (
              <div className="space-y-2">
                <Label>收件人</Label>
                <Input
                  value={emailProvider === 'emailjs' ? emailJSConfig.toEmails : smtpConfig.toEmails}
                  onChange={(e) => {
                    if (emailProvider === 'emailjs') {
                      setEmailJSConfig({ ...emailJSConfig, toEmails: e.target.value });
                    } else {
                      setSmtpConfig({ ...smtpConfig, toEmails: e.target.value });
                    }
                  }}
                  placeholder="请配置收件人邮箱"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>邮件主题</Label>
              <Input
                value={emailContent.subject}
                onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>邮件内容</Label>
              <Textarea
                value={emailContent.body}
                onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="gap-2"
            >
              {sendingEmail ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <SendIcon className="w-4 h-4" />
                  发送邮件
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlertsPage;