import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  History,
  Image as ImageIcon,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { FileAttachment, ProductWarehouseStockResponse } from '@shared/api.interface';
import { getProduct, updateProduct, getInbounds, getOutbounds, getProductWarehouseStock } from '@/api';
import { getAttachmentUrlSync } from '@/hooks/useSignedUrl';
import type { Product, InboundRecord, OutboundRecord } from '@shared/api.interface';
import { CanRole, AbilityContext, ROLE_SUBJECT } from '@lark-apaas/client-toolkit/auth';

type ICombinedRecord = 
  | (InboundRecord & { type: 'inbound' })
  | (OutboundRecord & { type: 'outbound' });

// 成本价显示组件
const CostPriceDisplay: React.FC<{ price: number; className?: string }> = ({ price, className = '' }) => {
  const ability = useContext(AbilityContext);
  const isAdmin = ability?.can('role_admin', ROLE_SUBJECT) ?? false;

  if (isAdmin) {
    return <span className={className}>¥{price.toFixed(2)}</span>;
  }
  return <span className={className}>****</span>;
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const [outboundRecords, setOutboundRecords] = useState<OutboundRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [loading, setLoading] = useState(false);
  const [warehouseStock, setWarehouseStock] = useState<ProductWarehouseStockResponse | null>(null);

  // 权限检查
  const ability = useContext(AbilityContext);
  const isAdmin = ability?.can('role_admin', ROLE_SUBJECT) ?? false;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [productRes, inboundRes, outboundRes, warehouseStockRes] = await Promise.all([
        getProduct(id),
        getInbounds({ productId: id }),
        getOutbounds({ productId: id }),
        getProductWarehouseStock(id),
      ]);
      setProduct(productRes);
      setEditForm(productRes);
      setInboundRecords(inboundRes.items);
      setOutboundRecords(outboundRes.items);
      setWarehouseStock(warehouseStockRes);
    } catch (error) {
      toast.error('加载数据失败');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!product || !id || !editForm.name || !editForm.code) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      await updateProduct(id, {
        name: editForm.name,
        code: editForm.code,
        costPrice: editForm.costPrice,
        safetyStock: editForm.safetyStock,
        category: editForm.category,
      });

      setIsEditing(false);
      loadData();
      toast.success('货品信息已更新');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || '更新失败';
      toast.error(errorMessage);
    }
  };

  const getAIStatusDescription = (sellableStatus: string, sellableDays: number | null) => {
    const daysText = sellableDays === null || sellableDays === undefined ? '-' : (sellableDays >= 999 ? '无限' : `${sellableDays.toFixed(1)}天`);
    switch (sellableStatus) {
      case 'emergency':
        return `当前可售天数为 ${daysText}，库存处于紧急状态，建议立即补货以避免断货风险。`;
      case 'safe':
        return `当前可售天数为 ${daysText}，库存处于安全状态，短期内无需补货。`;
      case 'overstock':
        return `当前可售天数为 ${daysText}，库存处于滞销状态，建议采取促销措施减少库存积压。`;
      default:
        return `当前可售天数为 ${daysText}，库存处于正常状态，可正常销售。`;
    }
  };

  const getAllRecords = (): ICombinedRecord[] => {
    const all: ICombinedRecord[] = [
      ...inboundRecords.map((r) => ({ ...r, type: 'inbound' as const })),
      ...outboundRecords.map((r) => ({ ...r, type: 'outbound' as const })),
    ];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getFilteredRecords = () => {
    if (activeTab === 'inbound') return inboundRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (activeTab === 'outbound') return outboundRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return getAllRecords();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getImageUrl = (attachment: FileAttachment | null) => {
    if (!attachment) return null;
    return getAttachmentUrlSync(attachment);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full flex items-center justify-center h-64">
        <div className="text-muted-foreground">货品不存在</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <section className="w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/products')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">货品详情</h1>
            <p className="text-sm text-muted-foreground">查看和管理货品信息</p>
          </div>
        </div>
        <Button
          variant={isEditing ? 'secondary' : 'default'}
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          className={!isEditing ? 'bg-primary text-primary-foreground' : ''}
        >
          {isEditing ? (
            <>
              <X className="mr-2 h-4 w-4" />
              取消
            </>
          ) : (
            <>
              <Edit3 className="mr-2 h-4 w-4" />
              编辑信息
            </>
          )}
        </Button>
      </section>

      <section className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              基础信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>货品名称</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>货品编码</Label>
                  <Input
                    value={editForm.code || ''}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  />
                </div>
                <CanRole roles={['role_admin']}>
                  <div className="space-y-2">
                    <Label>成本价（元）</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.costPrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, costPrice: parseFloat(e.target.value) })}
                    />
                  </div>
                </CanRole>
                <div className="space-y-2">
                  <Label>安全库存线</Label>
                  <Input
                    type="number"
                    value={editForm.safetyStock || ''}
                    onChange={(e) => setEditForm({ ...editForm, safetyStock: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Input
                    placeholder="如：电子产品、服装等"
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>可售天数</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg">
                      {editForm.sellableDays === null || editForm.sellableDays === undefined ? '-' : (editForm.sellableDays >= 999 ? '无限' : `${editForm.sellableDays.toFixed(1)}天`)}
                    </p>
                    <Badge variant="outline" className={
                      editForm.sellableStatus === 'emergency' ? 'bg-red-50 text-red-600 border-red-200' :
                      editForm.sellableStatus === 'safe' ? 'bg-green-50 text-green-600 border-green-200' :
                      editForm.sellableStatus === 'overstock' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'
                    }>
                      {editForm.sellableStatus === 'emergency' ? '紧急' :
                       editForm.sellableStatus === 'safe' ? '安全' :
                       editForm.sellableStatus === 'overstock' ? '滞销' : '正常'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">根据最近14天销售数据自动计算，不可手动编辑</p>
                </div>
                <div className="col-span-2 flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSave} className="bg-primary text-primary-foreground">
                    <Save className="mr-2 h-4 w-4" />
                    保存修改
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">货品名称</p>
                  <p className="text-lg font-medium">{product.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">货品编码</p>
                  <p className="font-mono text-lg">{product.code}</p>
                </div>
                {isAdmin && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">成本价</p>
                    <p className="font-mono text-lg"><CostPriceDisplay price={product.costPrice} /></p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">安全库存线</p>
                  <p className="font-mono text-lg">{product.safetyStock}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">可售天数</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg">
                      {product.sellableDays === null || product.sellableDays === undefined ? '-' : (product.sellableDays >= 999 ? '无限' : `${product.sellableDays.toFixed(1)}天`)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">可售状态</p>
                  <Badge className={
                    product.sellableStatus === 'emergency' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                    product.sellableStatus === 'safe' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                    product.sellableStatus === 'overstock' ? 'bg-gray-100 text-gray-600 hover:bg-gray-100' :
                    'bg-blue-50 text-blue-600 hover:bg-blue-50'
                  }>
                    {product.sellableStatus === 'emergency' ? '紧急' :
                     product.sellableStatus === 'safe' ? '安全' :
                     product.sellableStatus === 'overstock' ? '滞销' : '正常'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">分类</p>
                  <p className="text-lg">{product.category || '未分类'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">当前总库存</p>
                  <p className={`font-mono text-2xl font-bold ${product.currentStock < 0 ? 'text-destructive' : product.currentStock < product.safetyStock ? 'text-[hsl(38_92%_50%)]' : 'text-[hsl(142_71%_45%)]'}`}>
                    {product.currentStock}
                  </p>
                </div>
                {isAdmin && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">库存总价值</p>
                    <p className="font-mono text-lg text-primary">¥{product.stockValue.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-primary" />
                货品图片
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.imageAttachment ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={getImageUrl(product.imageAttachment) || ''}
                    alt={product.name}
                    className="w-full max-w-[200px] rounded-lg object-cover border"
                  />
                  <p className="text-xs text-muted-foreground">{product.imageAttachment.file_path.split('/').pop()}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">暂无图片</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {product.sellableStatus === 'safe' || product.sellableStatus === 'normal' ? (
                  <CheckCircle className="h-4 w-4 text-[hsl(142_71%_45%)]" />
                ) : product.sellableStatus === 'emergency' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <Package className="h-4 w-4 text-gray-500" />
                )}
                AI 智能状态判断
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={
                    product.sellableStatus === 'emergency'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : product.sellableStatus === 'safe'
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : product.sellableStatus === 'overstock'
                      ? 'bg-gray-50 text-gray-600 border-gray-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                  }
                >
                  {product.sellableStatus === 'emergency' ? '紧急' :
                   product.sellableStatus === 'safe' ? '安全' :
                   product.sellableStatus === 'overstock' ? '滞销' : '正常'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  最后更新: {new Date(product.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm leading-relaxed">
                  {getAIStatusDescription(product.sellableStatus, product.sellableDays)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">当前库存</span>
                  <span className={`font-mono font-medium ${product.currentStock < 0 ? 'text-destructive' : ''}`}>{product.currentStock}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">可售天数</span>
                  <span className="font-mono font-medium">
                    {product.sellableDays === null || product.sellableDays === undefined ? '-' : (product.sellableDays >= 999 ? '无限' : `${product.sellableDays.toFixed(1)}天`)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">安全库存线</span>
                  <span className="font-mono font-medium">{product.safetyStock}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Warehouse Stock */}
      <section className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              各仓库库存
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warehouseStock && warehouseStock.warehouses.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm pb-3 border-b">
                  <span className="text-muted-foreground">总库存</span>
                  <span className="font-mono font-bold text-xl text-primary">{warehouseStock.totalStock}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(142_71%_45%)]"></span>正库存</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground"></span>零库存</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive"></span>负库存</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {warehouseStock.warehouses.map((w) => (
                    <div key={w.warehouseId} className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{w.warehouseName}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${w.currentStock < 0 ? 'text-destructive' : w.currentStock === 0 ? 'text-muted-foreground' : 'text-[hsl(142_71%_45%)]'}`}>
                          {w.currentStock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无仓库库存数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Inbound/Outbound Records */}
      <section className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                出入库记录
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('all')}
                  className={activeTab === 'all' ? 'bg-primary text-primary-foreground' : ''}
                >
                  全部
                </Button>
                <Button
                  variant={activeTab === 'inbound' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('inbound')}
                  className={activeTab === 'inbound' ? 'bg-primary text-primary-foreground' : ''}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  入库
                </Button>
                <Button
                  variant={activeTab === 'outbound' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('outbound')}
                  className={activeTab === 'outbound' ? 'bg-primary text-primary-foreground' : ''}
                >
                  <TrendingDown className="mr-1 h-4 w-4" />
                  出库
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase">类型</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase">货品名称</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase text-right">数量</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase">操作人</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase">时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredRecords().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        暂无记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredRecords().map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          {'type' in record && record.type === 'inbound' ? (
                            <Badge variant="outline" className="bg-[hsl(142_76%_97%)] text-[hsl(142_71%_45%)] border-[hsl(142_76%_97%)]">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              入库
                            </Badge>
                          ) : 'type' in record && record.type === 'outbound' ? (
                            <Badge variant="outline" className="bg-[hsl(0_93%_96%)] text-[hsl(0_72%_51%)] border-[hsl(0_93%_96%)]">
                              <TrendingDown className="mr-1 h-3 w-3" />
                              出库
                            </Badge>
                          ) : (
                            <Badge variant="outline">入库</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{record.productName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {'type' in record && record.type === 'outbound' ? '-' : '+'}
                          {record.quantity}
                        </TableCell>
                        <TableCell>{record.operator}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(record.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ProductDetailPage;
