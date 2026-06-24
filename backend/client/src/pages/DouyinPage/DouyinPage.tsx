import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
  RefreshCw,
  Clock,
  List,
  Play,
  Loader2,
  Store,
  Plus,
  Trash2,
  Settings2,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { getDouyinLatestSnapshot, triggerDouyinScrape, getShops, addShop, deleteShop } from '@/api';
import type { DouyinDailySnapshot, DouyinSnapshotProduct } from '@shared/api.interface';

const DouyinPage: React.FC = () => {
  const [latest, setLatest] = useState<DouyinDailySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [shops, setShops] = useState<{ shop_id: string; shop_name: string }[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState('');
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  // 登录功能已在独立页面 /login.html 实现

  useEffect(() => {
    loadData();
    loadShops();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getDouyinLatestSnapshot();
      setLatest(data);
    } catch (error) {
      toast.error('加载抖店数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      const list = await getShops();
      setShops(list);
    } catch (error) {
      // 静默失败
    }
  };

  const handleTriggerScrape = async () => {
    try {
      setCollecting(true);
      toast.info('正在启动采集器，浏览器将自动打开...');

      const result = await triggerDouyinScrape(selectedShop || undefined);

      if (result.success) {
        toast.success(result.message);
        // 10 秒后自动刷新数据
        setTimeout(async () => {
          await loadData();
          setCollecting(false);
        }, 10000);
      } else {
        toast.error(result.message);
        setCollecting(false);
      }
    } catch (error) {
      toast.error('触发采集失败，请检查后端是否运行');
      setCollecting(false);
    }
  };

  const handleAddShop = async () => {
    if (!shopId.trim()) {
      toast.error('请输入店铺 ID');
      return;
    }
    try {
      await addShop(shopId.trim(), shopName.trim() || shopId.trim());
      toast.success(`店铺 ${shopId} 已添加`);
      setShopId('');
      setShopName('');
      await loadShops();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '添加店铺失败');
    }
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!window.confirm(`确定删除店铺「${name}」？\n\n该店铺的所有商品、入库记录、出库记录、预警和快照数据都将被永久删除，无法恢复！`)) {
      return;
    }
    try {
      await deleteShop(id);
      toast.success(`店铺 ${name} 已删除，相关数据已清理`);
      if (selectedShop === id) setSelectedShop('');
      await loadShops();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '删除店铺失败');
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">抖店概览</h1>
            <p className="text-sm text-muted-foreground mt-1">查看抖店商品采集数据与每日运营概况</p>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">抖店概览</h1>
            <p className="text-sm text-muted-foreground mt-1">查看抖店商品采集数据与每日运营概况</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <select
              className="px-3 py-2 rounded-md border bg-background text-sm max-w-[160px]"
              value={selectedShop}
              onChange={e => setSelectedShop(e.target.value)}
            >
              <option value="">默认店铺</option>
              {shops.map(s => (
                <option key={s.shop_id} value={s.shop_id}>{s.shop_name}</option>
              ))}
            </select>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" /> 刷新
            </Button>
            <Button onClick={handleTriggerScrape} disabled={collecting}>
              {collecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {collecting ? '采集中...' : '手动采集'}
            </Button>
            <a href="/login.html" target="_blank">
              <Button variant="outline">
                <LogIn className="w-4 h-4 mr-2" /> 登录抖店
              </Button>
            </a>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">暂无采集数据</p>
            <p className="text-sm mt-1">点击"手动采集"按钮开始采集抖店数据</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const products = latest.allProducts as DouyinSnapshotProduct[] | undefined;
  const newProducts = latest.newProducts || [];
  const delistedProducts = latest.delistedProducts || [];
  const reviews = latest.revenueData?.reviews as Record<string, string> | undefined;
  const orderStatuses = latest.revenueData?.order_statuses as Record<string, number> | undefined;

  return (
    <div className="w-full space-y-6">
      {/* 页面标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">抖店概览</h1>
          <p className="text-sm text-muted-foreground mt-1">
            采集日期: {latest.snapshotDate}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="px-3 py-2 rounded-md border bg-background text-sm max-w-[160px]"
            value={selectedShop}
            onChange={e => setSelectedShop(e.target.value)}
          >
            <option value="">默认店铺</option>
            {shops.map(s => (
              <option key={s.shop_id} value={s.shop_id}>{s.shop_name}</option>
            ))}
          </select>
          <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="店铺管理">
                <Settings2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" /> 店铺管理
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* 添加店铺表单 */}
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
                    placeholder="店铺 ID（必填）"
                    value={shopId}
                    onChange={e => setShopId(e.target.value)}
                  />
                  <input
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
                    placeholder="店铺名称（选填）"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                  />
                  <Button size="sm" onClick={handleAddShop}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {/* 店铺列表 */}
                <div className="divide-y">
                  <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
                    <span>默认店铺（当前）</span>
                  </div>
                  {shops.map(s => (
                    <div key={s.shop_id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{s.shop_name}</p>
                        <p className="text-xs text-muted-foreground">ID: {s.shop_id}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteShop(s.shop_id, s.shop_name)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {shops.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">暂无其他店铺，在上方添加</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" /> 刷新数据
          </Button>
          <Button onClick={handleTriggerScrape} disabled={collecting}>
            {collecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {collecting ? '采集中...' : '手动采集'}
          </Button>
            <a href="/login.html" target="_blank">
              <Button variant="outline">
                <LogIn className="w-4 h-4 mr-2" /> 登录抖店
              </Button>
            </a>
        </div>
      </div>

      {/* KPI 指标卡 */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">在售商品</p>
                <p className="text-3xl font-bold text-foreground mt-2">{latest.productCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日订单</p>
                <p className="text-3xl font-bold text-foreground mt-2">{latest.orderCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(142_71%_45%)]/10">
                <TrendingUp className="w-6 h-6 text-[hsl(142_71%_45%)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">审核驳回</p>
                <p className="text-3xl font-bold text-destructive mt-2">{latest.rejectedCount}</p>
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
                <p className="text-sm text-muted-foreground">数据变动</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-bold text-[hsl(142_71%_45%)]">+{newProducts.length}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-lg font-bold text-destructive">-{delistedProducts.length}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(38_92%_50%)]/10">
                <ArrowUpDown className="w-6 h-6 text-[hsl(38_92%_50%)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 商品评价 + 订单状态 */}
      {(reviews || orderStatuses) && (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  商品评价
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {reviews.total_reviews && (
                    <div>
                      <p className="text-sm text-muted-foreground">评价总数</p>
                      <p className="text-2xl font-bold">{reviews.total_reviews}</p>
                    </div>
                  )}
                  {reviews.good_rate && (
                    <div>
                      <p className="text-sm text-muted-foreground">好评率</p>
                      <p className="text-2xl font-bold text-[hsl(142_71%_45%)]">{reviews.good_rate}</p>
                    </div>
                  )}
                  {reviews.avg_rating && (
                    <div>
                      <p className="text-sm text-muted-foreground">评分</p>
                      <p className="text-2xl font-bold text-[hsl(38_92%_50%)]">{reviews.avg_rating}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {orderStatuses && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  订单状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 flex-wrap">
                  {Object.entries(orderStatuses).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground">{key}</p>
                      <p className="text-2xl font-bold">{val}</p>
                    </div>
                  ))}
                  {Object.keys(orderStatuses).length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无订单状态数据</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 全部商品列表 */}
      {products && products.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <List className="w-5 h-5 text-primary" />
              全部商品 ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {products.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name || '未知商品'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID: {p.douyin_product_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p.listed_date}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      在售
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新增商品 */}
      {newProducts.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-[hsl(142_71%_45%)]" />
              新增商品 ({newProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {newProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name || '未知商品'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {p.douyin_product_id}</p>
                  </div>
                  <Badge variant="outline" className="ml-4 shrink-0 text-[hsl(142_71%_45%)] border-[hsl(142_71%_45%)]">
                    新增
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 下架商品 */}
      {delistedProducts.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              下架商品 ({delistedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {delistedProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name || '未知商品'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {p.douyin_product_id}</p>
                  </div>
                  <Badge variant="outline" className="ml-4 shrink-0 text-destructive border-destructive">
                    已下架
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default DouyinPage;
