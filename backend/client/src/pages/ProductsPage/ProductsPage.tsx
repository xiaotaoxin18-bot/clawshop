import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { toast } from 'sonner';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { uploadToOSS, getOSSConfig } from '@/utils/storage';
import { getAttachmentUrlSync } from '@/hooks/useSignedUrl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Upload,
  X,
  Image as ImageIcon,
  FileUp,
  Download,
  RefreshCw,
  Settings,
  Calendar,
  ArrowUpDown,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '@shared/api.interface';
import { getProducts, createProduct, getWarehouses, getAutomationConfig, updateAutomationConfig, getProductWarehouseStock, deleteProduct } from '@/api';
import type { Product, Warehouse, AutomationTriggerConfig, UpdateAutomationTriggerRequest } from '@shared/api.interface';
import { downloadProductTemplate, parseProductExcelFile, ProductImportItem } from '@/utils/excel-import';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as XLSX from 'xlsx';
import { CanRole, AbilityContext, ROLE_SUBJECT } from '@lark-apaas/client-toolkit/auth';

// 成本价显示组件
const CostPriceDisplay: React.FC<{ price: number | undefined }> = ({ price }) => {
  const ability = useContext(AbilityContext);
  const isAdmin = ability?.can('role_admin', ROLE_SUBJECT) ?? false;

  if (isAdmin) {
    return <span>¥{(price || 0).toFixed(2)}</span>;
  }
  return <span>****</span>;
};

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'emergency' | 'safe' | 'normal' | 'overstock'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 权限检查
  const ability = useContext(AbilityContext);
  const isAdmin = ability?.can('role_admin', ROLE_SUBJECT) ?? false;

  // 排序状态 - 默认按可售天数升序排列
  const [sortField, setSortField] = useState<'currentStock' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    costPrice: '',
    safetyStock: '',

    category: '',
  });
  const [imageAttachment, setImageAttachment] = useState<FileAttachment | null>(null);

  // 一键更新可售天数状态
  // 自动化任务配置状态
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [automationConfig, setAutomationConfig] = useState<AutomationTriggerConfig | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [executionIntervalDays, setExecutionIntervalDays] = useState(7);

  // 删除确认对话框状态
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 批量导入状态
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ProductImportItem[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string>('');

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProducts({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        warehouse: warehouseFilter === 'all' ? undefined : warehouseFilter,
        sortField: sortField || undefined,
        sortOrder: sortOrder || undefined,
      });
      setProducts(res.items);
      setTotal(res.total);
    } catch (error) {
      toast.error('加载货品列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, statusFilter, warehouseFilter, sortField, sortOrder]);

  // Load warehouses
  const loadWarehouses = useCallback(async () => {
    try {
      const res = await getWarehouses({ page: 1, pageSize: 100 });
      setWarehouses(res.items);
    } catch (error) {
      logger.error('加载仓库列表失败', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // 切换排序
  const handleSort = (field: 'currentStock') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'sellableDays' ? 'asc' : 'desc'); // 可售天数默认升序（预警优先）
    }
    // 切换排序时重置到第一页
    setPage(1);
  };

  // Image upload handler
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    setUploading(true);

    try {
      const ossConfig = getOSSConfig();
      const useOSS = ossConfig?.enabled;

      if (useOSS) {
        if (!ossConfig.endpoint || !ossConfig.accessKeyId || !ossConfig.accessKeySecret || !ossConfig.bucketName) {
          toast.error('OSS配置不完整，请检查附件配置');
          setUploading(false);
          return;
        }
        const result = await uploadToOSS(ossConfig, file);
        setImageAttachment({
          bucket_id: result.bucket_id,
          file_path: result.file_path,
          download_url: result.download_url,
        });
        toast.success('图片上传成功');
      } else {
        const dataloom = await getDataloom();
        const bucketId = getDefaultBucketId();
        const { data, error } = await dataloom
          .storage
          .from(bucketId)
          .uploadFile(file);

        if (error || !data || !data.file_path) {
          toast.error('图片上传失败');
          setUploading(false);
          return;
        }

        setImageAttachment({
          bucket_id: data.bucket_id,
          file_path: data.file_path,
          download_url: data.download_url,
        });
        toast.success('图片上传成功');
      }
    } catch (error) {
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageAttachment(null);
  }, []);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.code || !newProduct.costPrice || !newProduct.safetyStock) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      await createProduct({
        name: newProduct.name,
        code: newProduct.code,
        costPrice: parseFloat(newProduct.costPrice),
        safetyStock: parseInt(newProduct.safetyStock),
        imageAttachment: imageAttachment || undefined,
        category: newProduct.category || undefined,
      });

      toast.success('货品添加成功');
      setIsAddModalOpen(false);
      setNewProduct({ name: '', code: '', costPrice: '', safetyStock: '', category: '' });
      setImageAttachment(null);
      loadProducts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || '添加货品失败';
      toast.error(errorMessage);
    }
  };

  // 删除商品
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProduct(productToDelete.id);
      toast.success(`商品「${productToDelete.name}」已删除`);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      toast.error('删除商品失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 加载自动化任务配置
  const loadAutomationConfig = async () => {
    try {
      setAutomationLoading(true);
      const config = await getAutomationConfig();
      setAutomationConfig(config);
      setExecutionIntervalDays(config.executionIntervalDays);
    } catch (error) {
      logger.error('加载自动化任务配置失败', error);
    } finally {
      setAutomationLoading(false);
    }
  };

  // 更新自动化任务配置
  const handleUpdateAutomationConfig = async () => {
    try {
      setAutomationLoading(true);
      const data: UpdateAutomationTriggerRequest = {
        executionIntervalDays,
        active: true,
      };
      await updateAutomationConfig(data);
      toast.success('自动化任务配置已更新');
      setIsAutomationModalOpen(false);
    } catch (error) {
      toast.error('更新自动化任务配置失败');
    } finally {
      setAutomationLoading(false);
    }
  };

  // 打开自动化任务配置弹窗
  const openAutomationModal = () => {
    loadAutomationConfig();
    setIsAutomationModalOpen(true);
  };

  // 导出库存数据
  const handleExportInventory = async () => {
    try {
      setLoading(true);

      // 获取全部产品（不分页）
      const allProductsRes = await getProducts({
        page: 1,
        pageSize: 10000,
        keyword: searchKeyword || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        warehouse: warehouseFilter === 'all' ? undefined : warehouseFilter,
      });
      const allProducts = allProductsRes.items;

      // 获取当前筛选的仓库名称
      const selectedWarehouse = warehouseFilter !== 'all'
        ? warehouses.find(w => w.id === warehouseFilter)?.name
        : null;

      // 准备导出数据
      const exportData: Array<{
        '商品编码': string;
        '商品名称': string;
        '分类': string;
        '当前库存': number;
        '所属仓库': string;
        '安全库存线': number;
        '库存状态': string;
      }> = [];

      for (const product of allProducts) {
        if (selectedWarehouse) {
          // 如果选择了特定仓库筛选，只显示该仓库的一行数据
          exportData.push({
            '商品编码': product.code,
            '商品名称': product.name,
            '分类': product.category || '-',
            '当前库存': product.currentStock,
            '所属仓库': selectedWarehouse,
            '安全库存线': product.safetyStock,
            '库存状态': product.status === 'safe' ? '安全' : '预警',
          });
        } else {
          // 导出全部仓库时，每个仓库分别显示一行
          try {
            const stockRes = await getProductWarehouseStock(product.id);
            if (stockRes.warehouses && stockRes.warehouses.length > 0) {
              // 为每个仓库生成一行数据
              for (const warehouse of stockRes.warehouses) {
                exportData.push({
                  '商品编码': product.code,
                  '商品名称': product.name,
                  '分类': product.category || '-',
                  '当前库存': warehouse.currentStock,
                  '所属仓库': warehouse.warehouseName,
                  '安全库存线': product.safetyStock,
                  '库存状态': warehouse.currentStock >= product.safetyStock ? '安全' : '预警',
                });
              }
            } else {
              // 没有仓库数据时显示一行
              exportData.push({
                '商品编码': product.code,
                '商品名称': product.name,
                '分类': product.category || '-',
                '当前库存': 0,
                '所属仓库': '未分配',
                '安全库存线': product.safetyStock,
                '库存状态': product.status === 'safe' ? '安全' : '预警',
              });
            }
          } catch (error) {
            // 查询失败时显示一行
            exportData.push({
              '商品编码': product.code,
              '商品名称': product.name,
              '分类': product.category || '-',
              '当前库存': product.currentStock,
              '所属仓库': '未分配',
              '安全库存线': product.safetyStock,
              '库存状态': product.status === 'safe' ? '安全' : '预警',
            });
          }
        }
      }

      // 创建工作簿
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '库存数据');

      // 设置列宽
      ws['!cols'] = [
        { wch: 20 }, // 商品编码
        { wch: 30 }, // 商品名称
        { wch: 15 }, // 分类
        { wch: 12 }, // 当前库存
        { wch: 25 }, // 所属仓库
        { wch: 12 }, // 安全库存线
        { wch: 10 }, // 库存状态
      ];

      // 导出文件
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `库存数据_${dateStr}.xlsx`);

      toast.success('库存数据导出成功');
    } catch (error) {
      logger.error('导出库存数据失败', error);
      toast.error('导出库存数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'emergency' | 'safe' | 'normal' | 'overstock') => {
    switch (status) {
      case 'emergency':
        return (
          <Badge className="bg-[hsl(0_93%_96%)] text-[hsl(0_72%_51%)] hover:bg-[hsl(0_93%_96%)] border-0">
            <AlertTriangle className="w-3 h-3 mr-1" />
            紧急
          </Badge>
        );
      case 'safe':
        return (
          <Badge className="bg-[hsl(142_76%_97%)] text-[hsl(142_71%_45%)] hover:bg-[hsl(142_76%_97%)] border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            安全
          </Badge>
        );
      case 'overstock':
        return (
          <Badge className="bg-gray-100 text-[#e78007] hover:bg-gray-100 border-0 font-medium">
            <Package className="w-3 h-3 mr-1" />
            滞销
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            正常
          </Badge>
        );
    }
  };

  const getImageUrl = (attachment: FileAttachment | null) => {
    if (!attachment) return null;
    return getAttachmentUrlSync(attachment);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">商品管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理货品基础信息，商品编码唯一，与库存安全线</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openAutomationModal}>
            <Settings className="w-4 h-4 mr-2" />
            自动化任务
          </Button>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            批量导入
          </Button>
          <Button variant="outline" onClick={handleExportInventory} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            导出库存数据
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            新增货品
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索货品名称或编码..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择仓库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部仓库</SelectItem>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={w.name}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-primary text-primary-foreground' : ''}
              >
                全部
              </Button>
              <Button
                variant={statusFilter === 'emergency' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('emergency')}
                className={statusFilter === 'emergency' ? 'bg-primary text-primary-foreground' : ''}
              >
                紧急
              </Button>
              <Button
                variant={statusFilter === 'safe' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('safe')}
                className={statusFilter === 'safe' ? 'bg-primary text-primary-foreground' : ''}
              >
                安全
              </Button>
              <Button
                variant={statusFilter === 'normal' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('normal')}
                className={statusFilter === 'normal' ? 'bg-primary text-primary-foreground' : ''}
              >
                正常
              </Button>
              <Button
                variant={statusFilter === 'overstock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('overstock')}
                className={statusFilter === 'overstock' ? 'bg-primary text-primary-foreground' : ''}
              >
                滞销
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">图片</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">货品信息</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">商品编码</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">成本价</th>
                  )}
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">售价</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">销量</th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('currentStock')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      当前库存
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'currentStock' ? 'text-primary' : ''}`} />
                    </div>
                  </th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">库存价值</th>
                  )}
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">可售状态</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 7} className="py-8 text-center text-muted-foreground">加载中...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 7} className="py-8 text-center text-muted-foreground">暂无货品数据</td>
                  </tr>
                ) : (
                  products.map((product, index) => (
                    <tr
                      key={product.id}
                      className={cn(
                        "hover:bg-muted/50 transition-colors duration-150",
                        index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                      )}
                    >
                      <td className="px-4 py-3">
                        {product.imageAttachment ? (
                          <img
                            src={getImageUrl(product.imageAttachment) || ''}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm text-foreground">{product.name}</span>
                        {product.category && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{product.code}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-right font-mono"><CostPriceDisplay price={product.costPrice} /></td>
                      )}
                      <td className="px-4 py-3 text-sm text-right font-mono">¥{(product.salePrice || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-muted-foreground">{product.salesCount || 0}</td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-medium ${product.currentStock < 0 ? 'text-destructive' : ''}`}>{product.currentStock}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-right font-mono">¥{(product.stockValue || 0).toLocaleString()}</td>
                      )}
                      <td className="px-4 py-3 text-center">{getStatusBadge(product.sellableStatus)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/products/${product.id}`)}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                          >
                            详情
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProductToDelete(product);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    共 {total} 条记录
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">每页</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">条</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    上一页
                  </Button>
                  <span className="flex items-center px-2 text-sm text-muted-foreground">
                    第 {page} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= total}
                    onClick={() => setPage(p => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 批量导入弹窗 */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量导入产品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">请先下载模板，按格式填写后上传</span>
              <Button variant="link" size="sm" onClick={downloadProductTemplate} className="ml-auto">
                下载模板
              </Button>
            </div>

            <div className="space-y-2">
              <Label>选择Excel文件</Label>
              <div className="flex items-center gap-4">
                <label className={cn(
                  "flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors",
                  importLoading && "opacity-50 cursor-not-allowed"
                )}>
                  <FileUp className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {importFile ? importFile.name : '点击上传Excel文件'}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setImportFile(file);
                      setImportLoading(true);
                      setImportError('');

                      const result = await parseProductExcelFile(file);
                      if (result.error) {
                        setImportError(result.error);
                        setImportData([]);
                      } else {
                        setImportData(result.data);
                        toast.success(`成功解析 ${result.data.length} 条数据`);
                      }
                      setImportLoading(false);
                    }}
                    disabled={importLoading}
                  />
                </label>
              </div>
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
            </div>

            {importData.length > 0 && (
              <div className="space-y-2">
                <Label>预览数据（共 {importData.length} 条）</Label>
                <div className="max-h-48 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">产品名称</th>
                        <th className="px-3 py-2 text-left">商品编码</th>
                        <th className="px-3 py-2 text-right">成本价</th>
                        <th className="px-3 py-2 text-left">分类</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 font-mono">{item.code}</td>
                          <td className="px-3 py-2 text-right"><CostPriceDisplay price={item.costPrice} /></td>
                          <td className="px-3 py-2">{item.category || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportModalOpen(false);
              setImportFile(null);
              setImportData([]);
              setImportError('');
            }}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (importData.length === 0) {
                  toast.error('请先上传有效的Excel文件');
                  return;
                }

                setImportLoading(true);
                let successCount = 0;
                let errorCount = 0;

                for (const item of importData) {
                  try {
                    await createProduct({
                      name: item.name,
                      code: item.code,
                      costPrice: item.costPrice,
                      safetyStock: 0, // 默认为0，后续由自动化任务更新
                      category: item.category || undefined,
                    });
                    successCount++;
                  } catch (error: any) {
                    errorCount++;
                    logger.error(`导入失败: ${item.name}`, error);
                  }
                }

                setImportLoading(false);
                if (successCount > 0) {
                  toast.success(`成功导入 ${successCount} 个产品`);
                }
                if (errorCount > 0) {
                  toast.error(`${errorCount} 个产品导入失败（可能是编码重复）`);
                }

                setIsImportModalOpen(false);
                setImportFile(null);
                setImportData([]);
                loadProducts();
              }}
              disabled={importLoading || importData.length === 0}
              className="bg-primary text-primary-foreground"
            >
              {importLoading ? '导入中...' : `确认导入 (${importData.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增货品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>货品图片（可选）</Label>
              <div className="flex items-center gap-4">
                {imageAttachment ? (
                  <div className="relative">
                    <img
                      src={getImageUrl(imageAttachment) || ''}
                      alt="Preview"
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className={cn(
                    "flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}>
                    <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">{uploading ? '上传中...' : '上传'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">货品名称 <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="请输入货品名称"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">货品编码 <span className="text-destructive">*</span></Label>
              <Input
                id="code"
                placeholder="如：SKU-2024-001"
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">成本价（元） <span className="text-destructive">*</span></Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newProduct.costPrice}
                onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safetyStock">安全库存线 <span className="text-destructive">*</span></Label>
              <Input
                id="safetyStock"
                type="number"
                placeholder="低于此数量将触发预警"
                value={newProduct.safetyStock}
                onChange={(e) => setNewProduct({ ...newProduct, safetyStock: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类（可选）</Label>
              <Input
                id="category"
                placeholder="如：电子产品、服装等"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>取消</Button>
            <Button onClick={handleAddProduct} className="bg-primary text-primary-foreground">确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 自动化任务配置弹窗 */}
      <Dialog open={isAutomationModalOpen} onOpenChange={setIsAutomationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              可售天数自动更新配置
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">任务说明</span>
              </div>
              <p className="text-sm text-muted-foreground">
                系统将自动根据每个货品的当前库存和最近14天的销售数据，计算并更新可售天数。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="executionIntervalDays">执行周期（天）</Label>
              <Input
                id="executionIntervalDays"
                type="number"
                min="1"
                max="30"
                value={executionIntervalDays}
                onChange={(e) => setExecutionIntervalDays(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                每 {executionIntervalDays} 天自动执行一次可售天数更新
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">当前状态</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已启用
                </Badge>
                <span className="text-sm text-muted-foreground">
                  下次执行: 每 {executionIntervalDays} 天
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAutomationModalOpen(false)}>取消</Button>
            <Button onClick={handleUpdateAutomationConfig} disabled={automationLoading} className="bg-primary text-primary-foreground">
              {automationLoading ? '保存中...' : '保存配置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              确定要删除商品「<span className="font-medium text-foreground">{productToDelete?.name}</span>」吗？
            </p>
            <p className="text-sm text-destructive mt-2">
              此操作不可恢复，删除后将同时清除该商品的所有库存记录。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
