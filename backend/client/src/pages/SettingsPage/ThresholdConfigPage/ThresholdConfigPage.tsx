import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Package, ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getThresholdConfig, updateThresholdConfig } from '@/api';
import type { SellableDaysThresholdConfig } from '@shared/api.interface';
import { CanRole, AbilityContext, ROLE_SUBJECT } from '@lark-apaas/client-toolkit/auth';
import { useNavigate } from 'react-router-dom';

const ThresholdConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const ability = useContext(AbilityContext);
  const isAdmin = ability?.can('role_admin', ROLE_SUBJECT) ?? false;
  
  const [config, setConfig] = useState<SellableDaysThresholdConfig>({
    emergencyDays: 10,
    safeDays: 15,
    overstockDays: 90,
  });
  const [originalConfig, setOriginalConfig] = useState<SellableDaysThresholdConfig>({
    emergencyDays: 10,
    safeDays: 15,
    overstockDays: 90,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getThresholdConfig();
      setConfig(data);
      setOriginalConfig(data);
      setHasChanges(false);
    } catch (error) {
      toast.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    const changed = 
      config.emergencyDays !== originalConfig.emergencyDays ||
      config.safeDays !== originalConfig.safeDays ||
      config.overstockDays !== originalConfig.overstockDays;
    setHasChanges(changed);
  }, [config, originalConfig]);

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('您没有权限修改此配置');
      return;
    }

    // 验证配置逻辑
    if (config.emergencyDays >= config.safeDays) {
      toast.error('紧急预警天数必须小于安全预警天数');
      return;
    }
    if (config.safeDays >= config.overstockDays) {
      toast.error('安全预警天数必须小于滞销预警天数');
      return;
    }
    if (config.emergencyDays < 1 || config.safeDays < 1 || config.overstockDays < 1) {
      toast.error('所有天数必须大于0');
      return;
    }

    try {
      setSaving(true);
      await updateThresholdConfig({
        emergencyDays: config.emergencyDays,
        safeDays: config.safeDays,
        overstockDays: config.overstockDays,
      });
      toast.success('配置更新成功');
      setOriginalConfig(config);
      setHasChanges(false);
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    toast.info('已重置为上次保存的配置');
  };

  const formatDays = (days: number) => {
    if (days >= 999) return '无限';
    return `${days}天`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">可售天数预警配置</h1>
            <p className="text-sm text-muted-foreground">设置库存可售天数的预警阈值</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving || !hasChanges}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重置
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !isAdmin || !hasChanges}
            className="bg-primary text-primary-foreground"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      {/* Config Description */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800 leading-relaxed">
            <strong>配置说明：</strong>系统根据每个货品的"可售天数"（当前库存 ÷ 最近14天日均销量）来判断库存状态。
            当可售天数低于或高于设定阈值时，系统会自动标记相应状态并触发预警。
          </p>
        </CardContent>
      </Card>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Emergency Status */}
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              紧急状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-red-600">
              ≤ {formatDays(config.emergencyDays)}
            </div>
            <p className="text-xs text-muted-foreground">
              可售天数 ≤ 紧急预警天数时，库存处于紧急状态，需要立即补货
            </p>
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">触发预警</Badge>
          </CardContent>
        </Card>

        {/* Safe Status */}
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-green-500" />
              安全状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-green-600">
              {formatDays(config.emergencyDays + 0.1)} ~ {formatDays(config.safeDays)}
            </div>
            <p className="text-xs text-muted-foreground">
              可售天数在紧急天数和安全天数之间，库存相对安全
            </p>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">状态良好</Badge>
          </CardContent>
        </Card>

        {/* Normal Status */}
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-blue-500" />
              正常状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-blue-600">
              {formatDays(config.safeDays + 0.1)} ~ {formatDays(config.overstockDays - 0.1)}
            </div>
            <p className="text-xs text-muted-foreground">
              可售天数在安全天数和滞销天数之间，库存正常
            </p>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">库存正常</Badge>
          </CardContent>
        </Card>

        {/* Overstock Status */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-gray-500" />
              滞销状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-gray-600">
              ≥ {formatDays(config.overstockDays)}
            </div>
            <p className="text-xs text-muted-foreground">
              可售天数 ≥ 滞销预警天数时，库存积压，建议促销
            </p>
            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">触发预警</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Config Form */}
      <Card>
        <CardHeader>
          <CardTitle>预警阈值设置</CardTitle>
          <CardDescription>
            调整以下数值来改变库存状态的判定标准（仅管理员可修改）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emergencyDays" className="text-red-600">
                紧急预警天数 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emergencyDays"
                type="number"
                min="1"
                max="365"
                value={config.emergencyDays}
                onChange={(e) => setConfig({ ...config, emergencyDays: parseInt(e.target.value) || 0 })}
                disabled={!isAdmin || loading}
                className="border-red-200 focus:border-red-500"
              />
              <p className="text-xs text-muted-foreground">
                可售天数 ≤ 此值时触发紧急预警
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="safeDays" className="text-green-600">
                安全预警天数 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="safeDays"
                type="number"
                min="1"
                max="365"
                value={config.safeDays}
                onChange={(e) => setConfig({ ...config, safeDays: parseInt(e.target.value) || 0 })}
                disabled={!isAdmin || loading}
                className="border-green-200 focus:border-green-500"
              />
              <p className="text-xs text-muted-foreground">
                可售天数 {'>'} 紧急天数且 ≤ 此值时为安全状态
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overstockDays" className="text-gray-600">
                滞销预警天数 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="overstockDays"
                type="number"
                min="1"
                max="999"
                value={config.overstockDays}
                onChange={(e) => setConfig({ ...config, overstockDays: parseInt(e.target.value) || 0 })}
                disabled={!isAdmin || loading}
                className="border-gray-200 focus:border-gray-500"
              />
              <p className="text-xs text-muted-foreground">
                可售天数 ≥ 此值时触发滞销预警
              </p>
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>注意：</strong>您当前没有管理员权限，无法修改预警阈值配置。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation Formula */}
      <Card>
        <CardHeader>
          <CardTitle>可售天数计算规则</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">计算公式：</p>
            <p className="text-lg font-mono text-primary">
              可售天数 = 当前库存 ÷ 最近14天日均销量
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• 系统每天自动计算所有货品的可售天数</p>
            <p>• 若最近14天无销售数据（日均销量为0），可售天数显示为"无限"</p>
            <p>• 计算结果保留1位小数</p>
            <p>• 您可以在商品管理页点击"一键更新可售天数"手动触发计算</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThresholdConfigPage;
