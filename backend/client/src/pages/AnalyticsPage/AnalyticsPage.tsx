import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, ArrowUpRight, ArrowDownLeft, Package, Loader2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { getAnalytics } from '@/api';
import type { AnalyticsData } from '@shared/api.interface';

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      }

      const analyticsData = await getAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      });
      setData(analyticsData);
    } catch (error) {
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const handleExport = () => {
    if (!data) return;
    
    const exportData = {
      库存价值趋势: data.stockValueTrend,
      出入库趋势: data.inOutboundTrend,
      货品周转排行: data.turnoverTop15,
      分仓库存趋势: data.warehouseStockTrend,
      本月入库: data.monthlyInbound,
      本月出库: data.monthlyOutbound,
      平均周转天数: data.avgTurnoverDays,
      预警处理率: data.alertHandleRate,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `数据统计报表_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('报表导出成功');
  };

  const stockTrendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>库存价值: ¥${Number(item.value).toLocaleString()}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data?.stockValueTrend?.map((item: any) => item.date) || [],
      axisLine: { lineStyle: { color: '#94a3b8' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: {
        color: '#64748b',
        formatter: (value: number) => `¥${(value / 1000).toFixed(0)}k`,
      },
    },
    series: [
      {
        name: '库存价值',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#3b82f6', width: 3 },
        itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        data: data?.stockValueTrend?.map((item: any) => item.value) || [],
      },
    ],
  };

  const inOutTrendOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['入库', '出库'],
      top: 0,
      textStyle: { color: '#64748b' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data?.inOutboundTrend?.map((item: any) => item.date) || [],
      axisLine: { lineStyle: { color: '#94a3b8' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: { color: '#64748b' },
    },
    series: [
      {
        name: '入库',
        type: 'bar',
        data: data?.inOutboundTrend?.map((item: any) => item.inbound) || [],
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
      {
        name: '出库',
        type: 'bar',
        data: data?.inOutboundTrend?.map((item: any) => item.outbound) || [],
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
    ],
  };

  // 仓库库存趋势图表配置
  const warehouseStockOption = useMemo(() => {
    if (!data?.warehouseStockTrend || data.warehouseStockTrend.length === 0) {
      return {
        title: {
          text: '暂无仓库数据',
          left: 'center',
          top: 'center',
          textStyle: { color: '#94a3b8' },
        },
      };
    }

    // 获取所有仓库列表
    const warehouses = [...new Set(data.warehouseStockTrend.map(item => item.warehouse))];
    // 获取所有日期
    const dates = [...new Set(data.warehouseStockTrend.map(item => item.date))].sort();

    // 为每个仓库生成系列数据
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const series = warehouses.map((warehouse, index) => ({
      name: warehouse,
      type: 'line',
      smooth: true,
      data: dates.map(date => {
        const record = data.warehouseStockTrend.find(
          item => item.date === date && item.warehouse === warehouse
        );
        return record?.quantity || 0;
      }),
      itemStyle: { color: colors[index % colors.length] },
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 6,
    }));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          let html = `${params[0]?.name}<br/>`;
          params.forEach(item => {
            html += `${item.marker} ${item.seriesName}: ${Number(item.value).toLocaleString()} 件<br/>`;
          });
          return html;
        },
      },
      legend: {
        data: warehouses,
        top: 0,
        textStyle: { color: '#64748b' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: { color: '#64748b' },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
        axisLabel: { color: '#64748b' },
      },
      series,
    };
  }, [data?.warehouseStockTrend]);

  const turnoverOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>出库数量: ${item.value} 件`;
      },
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'category',
      data: data?.turnoverTop15?.map((item: any) => item.productName).reverse() || [],
      axisLine: { lineStyle: { color: '#94a3b8' } },
      axisLabel: { color: '#64748b', width: 120, overflow: 'truncate' },
    },
    series: [
      {
        name: '出库数量',
        type: 'bar',
        data: data?.turnoverTop15?.map((item: any) => item.outboundQuantity).reverse() || [],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#8b5cf6' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          formatter: '{c} 件',
          color: '#64748b',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        },
      },
    ],
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <section className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">数据统计</h1>
          <p className="text-sm text-muted-foreground mt-1">
            库存数据可视化分析，支撑采购与运营决策
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card border border-border rounded-md p-1">
            {(['month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {range === 'month' ? '本月' : range === 'quarter' ? '本季' : '本年'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!data}>
            <Download className="mr-2 h-4 w-4" />
            导出报表
          </Button>
        </div>
      </section>

      <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              库存成本趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={stockTrendOption}
              theme="ud"
              style={{ height: '300px' }}
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="flex items-center gap-1">
                <ArrowDownLeft className="h-5 w-5 text-success" />
                <ArrowUpRight className="h-5 w-5 text-warning" />
              </div>
              出入库趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={inOutTrendOption}
              theme="ud"
              style={{ height: '300px' }}
              className="w-full"
            />
          </CardContent>
        </Card>
      </section>

      {/* 仓库库存趋势 */}
      <section className="w-full">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              分仓库存趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={warehouseStockOption}
              theme="ud"
              style={{ height: '350px' }}
              className="w-full"
            />
          </CardContent>
        </Card>
      </section>

      <section className="w-full">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              货品周转排行 TOP15
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={turnoverOption}
              theme="ud"
              style={{ height: '400px' }}
              className="w-full"
            />
          </CardContent>
        </Card>
      </section>

      <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月入库总量</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {data?.monthlyInbound?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <ArrowDownLeft className="h-3 w-3" />
                  件
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <ArrowDownLeft className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月出库总量</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {data?.monthlyOutbound?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-warning mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  件
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均周转天数</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {data?.avgTurnoverDays || 0}
                </p>
                <p className="text-xs text-success mt-1">天</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">预警处理率</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {data?.alertHandleRate || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">本月</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AnalyticsPage;
