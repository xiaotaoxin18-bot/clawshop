import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { HardDrive, Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getOSSConfig, saveOSSConfig, migrateOSSConfig } from '@/api';

export interface IOSSConfig {
  enabled: boolean;
  endpoint: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucketName: string;
  region: string;
  customDomain: string;
}

// localStorage key (only for migration)
const STORAGE_KEY_OSS_CONFIG = '__global_inv_oss_config';

const defaultConfig: IOSSConfig = {
  enabled: false,
  endpoint: '',
  accessKeyId: '',
  accessKeySecret: '',
  bucketName: '',
  region: 'oss-cn-hangzhou',
  customDomain: '',
};

const StorageSettingsPage: React.FC = () => {
  const [config, setConfig] = useState<IOSSConfig>(defaultConfig);
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 从数据库加载配置
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const dbConfig = await getOSSConfig();
      if (dbConfig) {
        const loadedConfig = {
          enabled: dbConfig.enabled,
          endpoint: dbConfig.endpoint,
          accessKeyId: dbConfig.accessKeyId,
          accessKeySecret: dbConfig.accessKeySecret,
          bucketName: dbConfig.bucketName,
          region: dbConfig.region || 'oss-cn-hangzhou',
          customDomain: dbConfig.customDomain,
        };
        setConfig(loadedConfig);
        // 同时更新 localStorage 以保持兼容性
        localStorage.setItem(STORAGE_KEY_OSS_CONFIG, JSON.stringify(loadedConfig));
        logger.info('OSS配置已从数据库加载');
      } else {
        // 数据库中没有配置，尝试从 localStorage 迁移
        await migrateFromLocalStorage();
      }
    } catch (error) {
      logger.error('加载OSS配置失败', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 从 localStorage 迁移配置到数据库
  const migrateFromLocalStorage = async () => {
    const stored = localStorage.getItem(STORAGE_KEY_OSS_CONFIG);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const configToMigrate = {
        enabled: parsed.enabled || false,
        endpoint: parsed.endpoint || '',
        region: parsed.region || 'oss-cn-hangzhou',
        bucketName: parsed.bucketName || '',
        customDomain: parsed.customDomain || '',
        accessKeyId: parsed.accessKeyId || '',
        accessKeySecret: parsed.accessKeySecret || '',
      };

      await migrateOSSConfig(configToMigrate);
      // 迁移后重新从数据库获取配置
      const migrated = await getOSSConfig();
      if (migrated) {
        const migratedConfig = {
          enabled: migrated.enabled,
          endpoint: migrated.endpoint,
          accessKeyId: migrated.accessKeyId,
          accessKeySecret: migrated.accessKeySecret,
          bucketName: migrated.bucketName,
          region: migrated.region || 'oss-cn-hangzhou',
          customDomain: migrated.customDomain,
        };
        setConfig(migratedConfig);
        // 更新 localStorage 以保持兼容性
        localStorage.setItem(STORAGE_KEY_OSS_CONFIG, JSON.stringify(migratedConfig));
        logger.info('OSS配置已从localStorage迁移到数据库');
        toast.success('配置已迁移到数据库');
      }
    } catch (error) {
      logger.error('迁移OSS配置失败', error);
      // 仍然使用 localStorage 中的配置
      try {
        setConfig({ ...defaultConfig, ...JSON.parse(stored) });
      } catch {
        setConfig(defaultConfig);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 清理配置中的首尾空格
      const cleanConfig = {
        ...config,
        endpoint: config.endpoint.trim(),
        accessKeyId: config.accessKeyId.trim(),
        accessKeySecret: config.accessKeySecret.trim(),
        bucketName: config.bucketName.trim(),
        region: config.region.trim(),
        customDomain: config.customDomain.trim(),
      };
      
      // 保存到数据库
      await saveOSSConfig({
        enabled: cleanConfig.enabled,
        endpoint: cleanConfig.endpoint,
        region: cleanConfig.region,
        bucketName: cleanConfig.bucketName,
        customDomain: cleanConfig.customDomain,
        accessKeyId: cleanConfig.accessKeyId,
        accessKeySecret: cleanConfig.accessKeySecret,
      });
      
      // 同时更新 localStorage 以保持兼容性
      localStorage.setItem(STORAGE_KEY_OSS_CONFIG, JSON.stringify(cleanConfig));
      
      setConfig(cleanConfig);
      toast.success('配置保存成功');
    } catch (error) {
      logger.error('保存OSS配置失败', error);
      toast.error('配置保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = () => {
    if (!config.enabled) {
      toast.info('请先启用阿里云OSS');
      return;
    }
    if (!config.endpoint || !config.accessKeyId || !config.accessKeySecret || !config.bucketName) {
      toast.error('请填写完整的OSS配置信息');
      return;
    }
    toast.info('测试功能需要后端支持，请确保后端已配置');
  };

  const updateConfig = (key: keyof IOSSConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">附件配置</h1>
          <p className="text-sm text-muted-foreground mt-1">配置阿里云OSS存储参数，用于附件上传和访问</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>阿里云OSS配置</CardTitle>
              <CardDescription>配置阿里云对象存储服务参数</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant={config.enabled ? 'default' : 'destructive'}>
            {config.enabled ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {config.enabled
                ? '阿里云OSS已启用，新上传的文件将存储到OSS'
                : '阿里云OSS未启用，系统将使用默认存储方式'}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="oss-enabled">启用阿里云OSS</Label>
              <p className="text-sm text-muted-foreground">开启后将使用阿里云OSS存储附件</p>
            </div>
            <Switch
              id="oss-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfig('enabled', checked)}
            />
          </div>

          {config.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="oss-endpoint">Endpoint</Label>
                  <Input
                    id="oss-endpoint"
                    placeholder="https://oss-cn-hangzhou.aliyuncs.com"
                    value={config.endpoint}
                    onChange={(e) => updateConfig('endpoint', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">OSS服务的Endpoint地址</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oss-region">区域 (Region)</Label>
                  <Input
                    id="oss-region"
                    placeholder="oss-cn-hangzhou"
                    value={config.region}
                    onChange={(e) => updateConfig('region', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">如: oss-cn-hangzhou, oss-cn-shanghai</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oss-bucket">Bucket名称</Label>
                  <Input
                    id="oss-bucket"
                    placeholder="my-bucket-name"
                    value={config.bucketName}
                    onChange={(e) => updateConfig('bucketName', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">OSS Bucket名称</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oss-domain">自定义域名 (可选)</Label>
                  <Input
                    id="oss-domain"
                    placeholder="https://cdn.example.com"
                    value={config.customDomain}
                    onChange={(e) => updateConfig('customDomain', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">配置CDN加速域名，留空使用默认域名</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oss-access-key">AccessKey ID</Label>
                  <Input
                    id="oss-access-key"
                    placeholder="LTAIxxxxxxxxxxxx"
                    value={config.accessKeyId}
                    onChange={(e) => updateConfig('accessKeyId', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">阿里云AccessKey ID</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oss-access-secret">AccessKey Secret</Label>
                  <div className="relative">
                    <Input
                      id="oss-access-secret"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="请输入AccessKey Secret"
                      value={config.accessKeySecret}
                      onChange={(e) => updateConfig('accessKeySecret', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? '隐藏' : '显示'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">阿里云AccessKey Secret，请妥善保管</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!config.enabled}
            >
              <TestTube className="w-4 h-4 mr-2" />
              测试连接
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">1. 如何获取阿里云OSS配置？</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>登录阿里云控制台，进入对象存储OSS服务</li>
              <li>创建或选择一个Bucket（建议设置为私有）</li>
              <li>在Bucket概览页查看外网Endpoint（如：oss-cn-hangzhou.aliyuncs.com）</li>
              <li>在RAM访问控制中创建AccessKey</li>
              <li>确保AccessKey有OSS读写权限（AliyunOSSFullAccess）</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">2. 必须配置Bucket跨域(CORS)</p>
            <p>在Bucket的权限管理 → 跨域设置中添加规则：</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs bg-muted p-3 rounded">
              <li>来源: * (或您的网站域名)</li>
              <li>允许Methods: POST, PUT, GET</li>
              <li>允许Headers: *</li>
              <li>暴露Headers: ETag, x-oss-request-id</li>
              <li>允许Credentials: 否</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">3. 配置示例</p>
            <div className="text-xs bg-muted p-3 rounded space-y-1">
              <p><strong>Endpoint:</strong> oss-cn-hangzhou.aliyuncs.com</p>
              <p><strong>Region:</strong> oss-cn-hangzhou</p>
              <p><strong>Bucket:</strong> my-inventory-bucket</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">注意事项</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>AccessKey Secret 只保存在浏览器本地，请妥善保管</li>
              <li>建议为OSS配置创建专门的RAM用户，并限制权限</li>
              <li>启用OSS后，新上传的文件将存储到OSS，历史文件不受影响</li>
              <li>如需使用CDN加速，请在自定义域名中配置</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorageSettingsPage;
export { STORAGE_KEY_OSS_CONFIG };
