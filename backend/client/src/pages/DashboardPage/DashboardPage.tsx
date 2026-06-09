import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  AlertTriangle,
  TrendingUp,
  Layers,
  DollarSign,
  Bell,
  Warehouse,
  ShoppingBag,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardStatistics, getDashboardAlerts } from '@/api';
import type { DashboardStatistics, AlertItem } from '@shared/api.interface';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, alertsData] = await Promise.all([
        getDashboardStatistics(),
        getDashboardAlerts(),
      ]);
      setStatistics(statsData);
      setAlerts(alertsData);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInbound = () => {
    navigate('/inbound');
    toast.info('请在入库管理页面添加入库记录');
  };

  const handleQuickOutbound = () => {
    navigate('/outbound');
    toast.info('请在出库管理页面添加出库记录');
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  // 按分类分布图表配置（商品总数维度）
  const categoryPieOption = statistics ? {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 件商品 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#64748b' },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: false },
        },
        labelLine: { show: false },
        data: statistics.categoryDistribution.map(item => ({
          name: item.category,
          value: item.count,
        })),
        color: ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'],
      },
    ],
  } : {};

  // 按仓库分布图表配置（商品总数维度）
  const warehousePieOption = statistics ? {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 件商品 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#64748b' },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: false },
        },
        labelLine: { show: false },
        data: statistics.warehouseDistribution.map(item => ({
          name: item.category,
          value: item.count,
        })),
        color: ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'],
      },
    ],
  } : {};

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="w-full flex items-center justify-center h-96">
        <div className="text-muted-foreground">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <style jsx>{`
        .kpi-value {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
      `}</style>

      <section className="w-full flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">库存总览</h1>
          <p className="text-sm text-muted-foreground mt-1">实时监控库存状态，快速了解库存健康度</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleQuickInbound} className="gap-2">
            <ArrowDownLeft className="w-4 h-4" />
            快速入库
          </Button>
          <Button onClick={handleQuickOutbound} className="gap-2">
            <ArrowUpRight className="w-4 h-4" />
            快速出库
          </Button>
        </div>
      </section>

      {/* KPI 指标卡 */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总库存价值</p>
                <p className="text-3xl font-bold text-foreground mt-2 kpi-value">¥{Math.round(statistics.totalStockValue).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">库存商品总数</p>
                <p className="text-3xl font-bold text-foreground mt-2 kpi-value">{statistics.totalProductCount.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10">
                <ShoppingBag className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">预警货品数</p>
                <p className="text-3xl font-bold text-destructive mt-2 kpi-value">{statistics.warningProductCount ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">滞销产品数</p>
                <p className="text-3xl font-bold text-[hsl(38_92%_50%)] mt-2 kpi-value">{statistics.overstockProductCount ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(38_92%_50%)]/10">
                <Archive className="w-6 h-6 text-[hsl(38_92%_50%)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日出入库</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-bold kpi-value text-[hsl(142_71%_45%)]">+{statistics.todayInbound ?? 0}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-lg font-bold kpi-value text-destructive">-{statistics.todayOutbound ?? 0}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(38_92%_50%)]/10">
                <TrendingUp className="w-6 h-6 text-[hsl(38_92%_50%)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 仓库统计 */}
      {statistics.warehouseValues?.length > 0 && (
        <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statistics.warehouseValues.slice(0, 4).map((warehouse) => (
              <Card key={warehouse.warehouse} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{warehouse.warehouse}</p>
                    <p className="text-2xl font-bold text-foreground mt-2 kpi-value">¥{Math.round(warehouse.value).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{warehouse.count} 种商品</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-semibold text-foreground">{warehouse.quantity.toLocaleString()} 件库存</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Warehouse className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* 库存分布图表 */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              按产品分类分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.categoryDistribution?.length > 0 ? (
              <ReactECharts
                option={categoryPieOption}
                style={{ height: '300px' }}
                theme="default"
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                暂无分类数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-accent" />
              按仓库分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.warehouseDistribution?.length > 0 ? (
              <ReactECharts
                option={warehousePieOption}
                style={{ height: '300px' }}
                theme="default"
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                暂无仓库数据
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 预警清单 */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-[hsl(38_92%_50%)]" />
            预警清单
            <Badge variant="secondary" className="ml-2">最近10条</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>
            查看全部
          </Button>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted" />
              <p>暂无预警信息</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewProduct(alert.productId)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${alert.alertType === 'emergency' ? 'bg-destructive/10' : 'bg-[hsl(38_92%_50%)]/10'}`}>
                      <AlertTriangle className={`w-4 h-4 ${alert.alertType === 'emergency' ? 'text-destructive' : 'text-[hsl(38_92%_50%)]'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{alert.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        当前库存: <span className={`font-mono font-medium ${alert.currentStock < 0 ? 'text-destructive' : alert.currentStock === 0 ? 'text-destructive' : 'text-[hsl(38_92%_50%)]'}`}>{alert.currentStock}</span> / 
                        安全线: <span className="font-mono font-medium">{alert.safetyStock}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={alert.alertType === 'emergency' ? 'destructive' : 'default'} className="mb-1">
                      {alert.alertType === 'emergency' ? '严重缺货' : '缺货'} {alert.shortAmount}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
