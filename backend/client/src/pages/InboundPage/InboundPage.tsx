import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { isOSSEnabled, uploadToOSS, getOSSConfig } from '@/utils/storage';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, ArrowDownLeft, Search, Calendar, X, Upload, Eye, Paperclip, Image as ImageIcon, FileText, Package, FileUp, Download, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '@shared/api.interface';
import { getProducts, getInbounds, createInbound, getInbound, getWarehouses } from '@/api';
import type { Product, InboundRecord, InboundItem, Warehouse, InboundType } from '@shared/api.interface';
import { InboundTypeMap } from '@shared/api.interface';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { parseExcelFile, downloadTemplate, exportToExcel, INBOUND_TEMPLATE_HEADERS } from '@/utils/excel-import';


interface InboundFormItem {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
}

const InboundPage: React.FC = () => {
  const currentUser = useCurrentUserProfile();
  const [products, setProducts] = useState<Product[]>([]);
  const [records, setRecords] = useState<InboundRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [orderNoSearch, setOrderNoSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InboundRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form states
  const [formItems, setFormItems] = useState<InboundFormItem[]>([]);
  const [operator, setOperator] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [remark, setRemark] = useState('');
  const [inType, setInType] = useState<InboundType>('purchase');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Product search
  const [quickSearchKeyword, setQuickSearchKeyword] = useState('');

  // Warehouse data from API
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Batch import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [importWarehouse, setImportWarehouse] = useState('');
  const [importAttachments, setImportAttachments] = useState<FileAttachment[]>([]);
  const [importUploading, setImportUploading] = useState(false);

  // Export states
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isExportMonthDialogOpen, setIsExportMonthDialogOpen] = useState(false);
  const [selectedExportMonth, setSelectedExportMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Quick add product by search
  const quickSearchMatches = useMemo(() => {
    if (!quickSearchKeyword.trim()) return [];
    const keyword = quickSearchKeyword.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.code.toLowerCase().includes(keyword)
    ).slice(0, 5);
  }, [quickSearchKeyword, products]);

  const handleQuickAddProduct = (product?: Product) => {
    const targetProduct = product || (() => {
      if (!quickSearchKeyword.trim()) return null;
      const keyword = quickSearchKeyword.toLowerCase();
      return products.find(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.code.toLowerCase().includes(keyword)
      ) || null;
    })();

    if (targetProduct) {
      // Check if already added
      const alreadyAdded = formItems.some(item => item.productId === targetProduct.id);
      if (alreadyAdded) {
        toast.error(`"${targetProduct.name}" 已添加到列表中`);
        return;
      }

      setFormItems(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        productId: targetProduct.id,
        productName: targetProduct.name,
        quantity: '1',
      }]);
      setQuickSearchKeyword('');
      toast.success(`已添加 "${targetProduct.name}"`);
    } else {
      toast.error('未找到匹配的货品，请检查名称或编码');
    }
  };

  // Load products and records
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, recordsRes] = await Promise.all([
        getProducts({ page: 1, pageSize: 100 }),
        getInbounds({ page, pageSize, orderNo: orderNoSearch || undefined }),
      ]);
      setProducts(productsRes.items);
      setRecords(recordsRes.items);
      setTotal(recordsRes.total);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, orderNoSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentUser?.name) {
      setOperator(currentUser.name);
    }
  }, [currentUser]);

  // Load warehouse options from API
  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const warehousesRes = await getWarehouses({ page: 1, pageSize: 100 });
      const warehouses = warehousesRes.items;
      if (warehouses.length > 0) {
        setWarehouseOptions(warehouses.map((w) => w.name));
        setWarehouses(warehouses);
        // Set default warehouse
        if (!warehouse && warehouses[0]?.name) {
          setWarehouse(warehouses[0].name);
        }
      } else {
        setWarehouseOptions([]);
      }
    } catch (error) {
      logger.error('加载仓库列表失败', error);
      toast.error('加载仓库列表失败');
      setWarehouseOptions([]);
    }
  };

  // Add new item row
  const handleAddItem = () => {
    setFormItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      productId: '',
      productName: '',
      quantity: '1',
    }]);
  };

  // Remove item row
  const handleRemoveItem = (id: string) => {
    setFormItems(prev => prev.filter(item => item.id !== id));
  };

  // Update item product
  const handleItemProductChange = (id: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    setFormItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, productId, productName: product?.name || '' }
        : item
    ));
  };

  // Update item quantity
  const handleItemQuantityChange = (id: string, quantity: string) => {
    setFormItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过10MB限制`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const ossConfig = getOSSConfig();
      const useOSS = ossConfig?.enabled;

      for (const file of validFiles) {
        try {
          if (useOSS) {
            if (!ossConfig.endpoint || !ossConfig.accessKeyId || !ossConfig.accessKeySecret || !ossConfig.bucketName) {
              toast.error('OSS配置不完整，请检查附件配置');
              continue;
            }
            const result = await uploadToOSS(ossConfig, file);
            setAttachments(prev => [...prev, {
              bucket_id: result.bucket_id,
              file_path: result.file_path,
              download_url: result.download_url,
            }]);
          } else {
            const dataloom = await getDataloom();
            const bucketId = getDefaultBucketId();
            const { data, error } = await dataloom
              .storage
              .from(bucketId)
              .uploadFile(file);

            if (error) {
              logger.error('上传错误:', error);
              toast.error(`${file.name} 上传失败: ${error.message || '未知错误'}`);
              continue;
            }

            if (!data || !data.file_path) {
              toast.error(`${file.name} 上传返回数据异常`);
              continue;
            }

            setAttachments(prev => [...prev, {
              bucket_id: data.bucket_id,
              file_path: data.file_path,
              download_url: data.download_url,
            }]);
          }
        } catch (fileError: any) {
          logger.error('单个文件上传错误:', fileError);
          toast.error(`${file.name} 上传失败: ${fileError.message || '未知错误'}`);
        }
      }

      const successCount = validFiles.length;
      if (successCount > 0) {
        toast.success(`文件上传成功`);
      }
    } catch (error: any) {
      logger.error('文件上传失败:', error);
      toast.error(`文件上传失败: ${error.message || '请检查网络连接后重试'}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [attachments]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (formItems.length === 0) {
      toast.error('请至少添加一个货品');
      return;
    }

    // Validate all items
    for (const item of formItems) {
      if (!item.productId) {
        toast.error('请选择货品');
        return;
      }
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        toast.error('请输入有效的入库数量');
        return;
      }
    }

    if (!operator) {
      toast.error('请输入入库人');
      return;
    }

    if (!warehouse) {
      toast.error('请选择仓库');
      return;
    }

    try {
      const items: InboundItem[] = formItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: parseInt(item.quantity),
      }));

      await createInbound({
        items,
        operator,
        warehouse,
        remark: remark || undefined,
        inType,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      toast.success('入库成功');
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || '入库失败';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormItems([]);
    setWarehouse(warehouseOptions[0] || '');
    setRemark('');
    setInType('purchase');
    setAttachments([]);
    setQuickSearchKeyword('');
  };

  const handleViewDetail = async (record: InboundRecord) => {
    try {
      const detail = await getInbound(record.id);
      setSelectedRecord(detail);
      setIsDetailOpen(true);
    } catch (error) {
      toast.error('获取详情失败');
    }
  };

  const filteredRecords = records.filter(record =>
    record.orderNo?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    record.operator?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    record.warehouse?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    record.items?.some(item => item.productName?.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  // 批量导入处理
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportLoading(true);
    setImportError('');
    setImportPreviewData([]);

    const result = await parseExcelFile(file, 'inbound');

    if (result.error) {
      setImportError(result.error);
      setImportLoading(false);
      return;
    }

    setImportPreviewData(result.data);
    setImportLoading(false);
  };

  const handleBatchImport = async () => {
    const operator = currentUser?.name || '';
    if (!operator) {
      toast.error('无法获取当前登录人信息');
      return;
    }
    if (!importWarehouse) {
      toast.error('请选择仓库');
      return;
    }
    if (importPreviewData.length === 0) {
      toast.error('没有可导入的数据');
      return;
    }

    setImportLoading(true);

    // 收集所有有效的产品项
    const items: InboundItem[] = [];
    const notFoundProducts: string[] = [];

    for (const row of importPreviewData) {
      // 查找货品
      const product = products.find(p =>
        p.code === row['商品编码'] || p.name === row['商品编码']
      );

      if (!product) {
        notFoundProducts.push(row['商品编码']);
        continue;
      }

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: Number(row['数量']),
      });
    }

    if (items.length === 0) {
      setImportLoading(false);
      toast.error('未找到有效的产品数据，请检查商品编码是否正确');
      return;
    }

    try {
      // 将所有产品聚合成一个订单
      await createInbound({
        items,
        operator,
        warehouse: importWarehouse,
        remark: `批量导入 ${items.length} 种货品${notFoundProducts.length > 0 ? `，未找到 ${notFoundProducts.length} 个商品` : ''}`,
        attachments: importAttachments,
      });

      setImportLoading(false);

      const msg = notFoundProducts.length > 0
        ? `成功导入 ${items.length} 种货品，${notFoundProducts.length} 个商品未找到`
        : `成功导入 ${items.length} 种货品`;
      toast.success(msg);

      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportPreviewData([]);
      setImportWarehouse('');
      setImportAttachments([]);
      loadData();
    } catch (error: any) {
      setImportLoading(false);
      const errorMsg = error?.response?.data?.message || error?.message || '未知错误';
      toast.error(`导入失败：${errorMsg}`);
      logger.error('批量导入入库失败:', error);
    }
  };

  // 导入附件上传处理
  const handleImportFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过10MB限制`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setImportUploading(true);

    try {
      const ossConfig = getOSSConfig();
      const useOSS = ossConfig?.enabled;

      for (const file of validFiles) {
        try {
          if (useOSS) {
            if (!ossConfig.endpoint || !ossConfig.accessKeyId || !ossConfig.accessKeySecret || !ossConfig.bucketName) {
              toast.error('OSS配置不完整，请检查附件配置');
              continue;
            }
            const result = await uploadToOSS(ossConfig, file);
            setImportAttachments(prev => [...prev, {
              bucket_id: result.bucket_id,
              file_path: result.file_path,
              download_url: result.download_url,
            }]);
          } else {
            const dataloom = await getDataloom();
            const bucketId = getDefaultBucketId();
            const { data, error } = await dataloom
              .storage
              .from(bucketId)
              .uploadFile(file);

            if (error) {
              logger.error('上传错误:', error);
              toast.error(`${file.name} 上传失败: ${error.message || '未知错误'}`);
              continue;
            }

            if (!data || !data.file_path) {
              toast.error(`${file.name} 上传返回数据异常`);
              continue;
            }

            setImportAttachments(prev => [...prev, {
              bucket_id: data.bucket_id,
              file_path: data.file_path,
              download_url: data.download_url,
            }]);
          }
        } catch (fileError: any) {
          logger.error('单个文件上传错误:', fileError);
          toast.error(`${file.name} 上传失败: ${fileError.message || '未知错误'}`);
        }
      }

      if (validFiles.length > 0) {
        toast.success(`附件上传成功`);
      }
    } catch (error: any) {
      logger.error('文件上传失败:', error);
      toast.error(`文件上传失败: ${error.message || '请检查网络连接后重试'}`);
    } finally {
      setImportUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImportAttachment = (index: number) => {
    setImportAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 导出勾选记录
  const handleExportSelected = async () => {
    if (selectedRecords.size === 0) {
      toast.error('请先勾选要导出的记录');
      return;
    }
    // 将每个订单的每个货品拆分成单独的行
    const exportData: {
      orderNo: string;
      productName: string;
      quantity: number;
      warehouse: string;
      operator: string;
      attachments: { bucket_id?: string; download_url?: string; file_path?: string }[];
      attachmentCount: number;
      createdAt: string;
    }[] = [];

    records
      .filter(r => selectedRecords.has(r.id))
      .forEach(record => {
        if (record.items && record.items.length > 0) {
          record.items.forEach((item: InboundItem) => {
            exportData.push({
              orderNo: record.orderNo || '',
              productName: item.productName || '',
              quantity: item.quantity || 0,
              warehouse: record.warehouse || '',
              operator: record.operator || '',
              attachments: record.attachments || [],
              attachmentCount: record.attachmentCount || 0,
              createdAt: new Date(record.createdAt).toLocaleString('zh-CN'),
            });
          });
        } else {
          exportData.push({
            orderNo: record.orderNo || '',
            productName: record.productName || '',
            quantity: record.totalQuantity || record.quantity || 0,
            warehouse: record.warehouse || '',
            operator: record.operator || '',
            attachments: record.attachments || [],
            attachmentCount: record.attachmentCount || 0,
            createdAt: new Date(record.createdAt).toLocaleString('zh-CN'),
          });
        }
      });

    await exportToExcel(exportData, 'inbound', `入库记录_已勾选_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`已导出 ${exportData.length} 条记录`);
  };

  // 按月份导出记录
  const handleExportByMonth = () => {
    setIsExportMonthDialogOpen(true);
  };

  const handleConfirmExportByMonth = async () => {
    const [year, month] = selectedExportMonth.split('-').map(Number);
    const monthStr = selectedExportMonth;

    // 将每个订单的每个货品拆分成单独的行
    const exportData: {
      orderNo: string;
      productName: string;
      quantity: number;
      warehouse: string;
      operator: string;
      attachments: { bucket_id?: string; download_url?: string; file_path?: string }[];
      attachmentCount: number;
      createdAt: string;
    }[] = [];

    records
      .filter(r => {
        const date = new Date(r.createdAt);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      })
      .forEach(record => {
        if (record.items && record.items.length > 0) {
          record.items.forEach((item: InboundItem) => {
            exportData.push({
              orderNo: record.orderNo || '',
              productName: item.productName || '',
              quantity: item.quantity || 0,
              warehouse: record.warehouse || '',
              operator: record.operator || '',
              attachments: record.attachments || [],
              attachmentCount: record.attachmentCount || 0,
              createdAt: new Date(record.createdAt).toLocaleString('zh-CN'),
            });
          });
        } else {
          exportData.push({
            orderNo: record.orderNo || '',
            productName: record.productName || '',
            quantity: record.totalQuantity || record.quantity || 0,
            warehouse: record.warehouse || '',
            operator: record.operator || '',
            attachments: record.attachments || [],
            attachmentCount: record.attachmentCount || 0,
            createdAt: new Date(record.createdAt).toLocaleString('zh-CN'),
          });
        }
      });

    if (exportData.length === 0) {
      toast.error(`${monthStr} 月没有记录可导出`);
      return;
    }

    await exportToExcel(exportData, 'inbound', `入库记录_${monthStr}.xlsx`);
    toast.success(`已导出 ${monthStr} 月 ${exportData.length} 条记录`);
    setIsExportMonthDialogOpen(false);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  // 单条选择
  const handleSelectRecord = (id: string) => {
    const newSet = new Set(selectedRecords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRecords(newSet);
  };

  const handleExport = async () => {
    // 将每个订单的每个货品拆分成单独的行
    const exportData: {
      orderNo: string;
      productName: string;
      quantity: number;
      warehouse: string;
      operator: string;
      attachments: { bucket_id?: string; download_url?: string; file_path?: string }[];
      attachmentCount: number;
      createdAt: string;
    }[] = [];

    filteredRecords.forEach(record => {
      if (record.items && record.items.length > 0) {
        record.items.forEach((item: InboundItem) => {
          exportData.push({
            orderNo: record.orderNo || '',
            productName: item.productName || '',
            quantity: item.quantity || 0,
            warehouse: record.warehouse || '',
            operator: record.operator || '',
            attachments: record.attachments || [],
            attachmentCount: record.attachmentCount || 0,
            createdAt: new Date(record.createdAt).toLocaleString('zh-CN'),
          });
        });
      } else {
        exportData.push({
          orderNo: record.orderNo || '',
          productName: record.productName || '',
          quantity: record.totalQuantity || record.quantity || 0,
          warehouse: record.warehouse || '',
          operator: record.operator || '',
          attachments: record.attachments || [],
          attachmentCount: record.attachmentCount || 0,
          createdAt: new Date(record.createdAt).toLocaleString('zh-CN'),
        });
      }
    });

    await exportToExcel(exportData, 'inbound', `入库记录_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const isImageFile = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
  };

  const getFileIcon = (filePath: string) => {
    if (isImageFile(filePath)) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // 附件链接组件 - 使用签名URL
  const AttachmentLink: React.FC<{ attachment: FileAttachment }> = ({ attachment }) => {
    const { url, loading } = useSignedUrl(attachment);
    const fileName = attachment.file_path.split('/').pop() || '文件';

    if (loading || !url) {
      return (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg opacity-50 cursor-wait">
          {getFileIcon(attachment.file_path)}
          <span className="text-xs truncate flex-1">{fileName}</span>
          <Eye className="w-3 h-3 text-muted-foreground" />
        </div>
      );
    }

    return (
      <UniversalLink
        to={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
      >
        {getFileIcon(attachment.file_path)}
        <span className="text-xs truncate flex-1">{fileName}</span>
        <Eye className="w-3 h-3 text-muted-foreground" />
      </UniversalLink>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <section className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">入库管理</h1>
          <p className="text-sm text-muted-foreground mt-1">记录和管理货品入库操作，一个订单可包含多个货品</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => downloadTemplate('inbound')}
            title="下载入库表模板"
          >
            <Download className="w-4 h-4 mr-2" />
            下载模板
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            title="批量导入入库数据"
          >
            <FileUp className="w-4 h-4 mr-2" />
            批量导入
          </Button>
          <Button
            variant="outline"
            onClick={handleExportByMonth}
            title="按月份导出记录"
          >
            <Download className="w-4 h-4 mr-2" />
            按月份导出
          </Button>
          <Button
            variant="outline"
            onClick={handleExportSelected}
            disabled={selectedRecords.size === 0}
            title="导出勾选记录"
          >
            <Download className="w-4 h-4 mr-2" />
            导出勾选 ({selectedRecords.size})
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open) {
            getProducts({ page: 1, pageSize: 100 }).then(res => setProducts(res.items));
            if (formItems.length === 0) {
              handleAddItem();
            }
          } else {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              新增入库
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-primary" />
                新增入库
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Product Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    入库货品 <span className="text-destructive">*</span>
                  </Label>
                </div>

                {/* Quick Search Add */}
                <div className="relative mb-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="输入货品名称或编码快速添加..."
                        className="pl-9"
                        value={quickSearchKeyword}
                        onChange={(e) => setQuickSearchKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddProduct();
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleQuickAddProduct()}
                      disabled={!quickSearchKeyword.trim()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                  {/* Quick Search Suggestions */}
                  {quickSearchMatches.length > 0 && quickSearchKeyword.trim() && (
                    <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {quickSearchMatches.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between"
                          onClick={() => handleQuickAddProduct(product)}
                        >
                          <span>{product.name} ({product.code})</span>
                          <span className={`text-xs ${product.currentStock < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>库存: {product.currentStock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                {formItems.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-medium">货品</th>
                          <th className="text-left py-2 px-3 text-xs font-medium w-24">数量</th>
                          <th className="text-center py-2 px-3 text-xs font-medium w-10">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-2 px-3">
                              <Select
                                value={item.productId}
                                onValueChange={(value) => handleItemProductChange(item.id, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择货品" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                                className="w-24"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无货品，请使用上方搜索框添加</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加更多货品
                </Button>
              </div>

              {/* Inbound Type */}
              <div className="space-y-2">
                <Label>
                  入库类型 <span className="text-destructive">*</span>
                </Label>
                <Select value={inType} onValueChange={(value) => setInType(value as InboundType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择入库类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(InboundTypeMap).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Warehouse */}
              <div className="space-y-2">
                <Label>
                  入库仓库 <span className="text-destructive">*</span>
                </Label>
                <Select value={warehouse} onValueChange={setWarehouse} disabled={warehouseOptions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={warehouseOptions.length === 0 ? '暂无仓库，请先去创建' : '请选择仓库'} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseOptions.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {warehouseOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    暂无仓库数据，请先去
                    <UniversalLink
                      to="/settings/warehouses"
                      className="text-primary hover:underline ml-1"
                    >
                      分仓管理
                    </UniversalLink>
                    创建仓库
                  </p>
                )}
              </div>

              {/* Operator */}
              <div className="space-y-2">
                <Label>
                  入库人 <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="请输入入库人"
                />
              </div>

              {/* Remark */}
              <div className="space-y-2">
                <Label>备注（可选）</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请输入入库备注信息...填写采购单据号"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>附件（可选）</Label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                      {getFileIcon(att.file_path)}
                      <span className="text-xs truncate max-w-[120px]">{att.file_path.split('/').pop()}</span>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="ml-1 text-destructive hover:text-destructive/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className={cn(
                    "flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? '上传中...' : '上传附件'}
                    </span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">支持任意格式，单个文件不超过10MB</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={formItems.length === 0 || !operator || !warehouse}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  确认入库
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </section>

      {/* Records Table */}
      <section className="w-full">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-semibold">入库记录</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索订单号..."
                    className="pl-9 w-full sm:w-44"
                    value={orderNoSearch}
                    onChange={(e) => setOrderNoSearch(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索货品或入库人..."
                    className="pl-9 w-full sm:w-44"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedRecords.size === records.length && records.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">订单号</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">入库类型</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">货品信息</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">仓库</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">入库人</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">附件</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">时间</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">加载中...</td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">暂无入库记录</td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        className={cn(
                          "border-b border-border last:border-0 hover:bg-muted transition-colors cursor-pointer",
                          index % 2 === 1 && "bg-muted/30"
                        )}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(record.id)}
                            onChange={() => handleSelectRecord(record.id)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="py-3 px-4" onClick={() => handleViewDetail(record)}>
                          <span className="text-sm font-mono text-primary">{record.orderNo || '-'}</span>
                        </td>
                        <td className="py-3 px-4" onClick={() => handleViewDetail(record)}>
                          <Badge variant="outline" className="text-xs">
                            {record.inType ? InboundTypeMap[record.inType] : '撕单入库'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {record.itemCount === 1
                                  ? record.productName
                                  : `${record.productName} 等 ${record.itemCount} 种货品`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-accent border-accent/30 bg-accent/10">
                                +{record.totalQuantity || record.quantity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                共 {record.itemCount || 1} 项
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4" onClick={() => handleViewDetail(record)}>
                          <span className="text-sm">{record.warehouse || '-'}</span>
                        </td>
                        <td className="py-3 px-4" onClick={() => handleViewDetail(record)}>
                          <span className="text-sm">{record.operator}</span>
                        </td>
                        <td className="py-3 px-4" onClick={() => handleViewDetail(record)}>
                          {record.attachmentCount > 0 ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="text-xs">{record.attachmentCount}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4" onClick={() => handleViewDetail(record)}>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(record.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(record);
                            }}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  共 {total} 条记录
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    上一页
                  </Button>
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
          </CardContent>
        </Card>
      </section>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>入库单详情</SheetTitle>
          </SheetHeader>
          {selectedRecord && (
            <div className="mt-6 space-y-6">
              {/* Order Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">订单号</Label>
                    <p className="text-sm font-mono text-primary">{selectedRecord.orderNo || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">入库类型</Label>
                    <p className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        {selectedRecord.inType ? InboundTypeMap[selectedRecord.inType] : '撕单入库'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">货品种类</Label>
                    <p className="text-sm">{selectedRecord.itemCount || 1} 种</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">总数量</Label>
                    <p className="text-sm">
                      <Badge variant="outline" className="font-mono text-accent border-accent/30 bg-accent/10">
                        +{selectedRecord.totalQuantity || selectedRecord.quantity}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">入库仓库</Label>
                    <p className="text-sm">{selectedRecord.warehouse || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">入库人</Label>
                    <p className="text-sm">{selectedRecord.operator}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">入库时间</Label>
                    <p className="text-sm">{new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                {/* Items List */}
                {selectedRecord.items && selectedRecord.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2">
                      <Label className="text-xs font-medium">货品明细</Label>
                    </div>
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">货品名称</th>
                          <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">数量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecord.items?.map((item, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="py-2 px-4 text-sm">{item.productName || '-'}</td>
                            <td className="py-2 px-4 text-sm text-right font-mono text-accent">+{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedRecord.remark && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">备注</Label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedRecord.remark}</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <>
                  <div className="border-t" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      附件 ({selectedRecord.attachments.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRecord.attachments?.map((att, idx) => (
                        <AttachmentLink key={idx} attachment={att} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Batch Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportPreviewData([]);
          setImportError('');
          setImportWarehouse('');
          setImportAttachments([]);
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              批量导入入库数据
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">导入说明：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>请使用入库表模板格式（包含：商品编码、数量、单价、备注）</li>
                <li>商品编码可以是货品名称或编码</li>
                <li>出库表无法上传到入库页面，系统会自动检测并提示</li>
              </ul>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <Label>选择Excel文件</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadTemplate('inbound')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
              </div>
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  已选择：{importFile.name}
                </p>
              )}
            </div>

            {/* Error Message */}
            {importError && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                {importError}
              </div>
            )}

            {/* Import Settings */}
            {importPreviewData.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">导入设置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>入库人</Label>
                    <Input
                      value={currentUser?.name || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">自动识别当前登录人</p>
                  </div>
                  <div className="space-y-2">
                    <Label>仓库 <span className="text-destructive">*</span></Label>
                    <Select value={importWarehouse} onValueChange={setImportWarehouse} disabled={warehouseOptions.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder={warehouseOptions.length === 0 ? '暂无仓库，请先去创建' : '请选择仓库'} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseOptions.map(w => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {warehouseOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        暂无仓库数据，请先去
                        <UniversalLink
                          to="/settings/warehouses"
                          className="text-primary hover:underline ml-1"
                        >
                          分仓管理
                        </UniversalLink>
                        创建仓库
                      </p>
                    )}
                  </div>
                </div>

                {/* Attachment Upload */}
                <div className="space-y-2">
                  <Label>附件</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      multiple
                      onChange={handleImportFileUpload}
                      className="flex-1"
                      disabled={importUploading}
                    />
                    {importUploading && <span className="text-sm text-muted-foreground">上传中...</span>}
                  </div>
                  {importAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {importAttachments.map((att, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          附件{idx + 1}
                          <button
                            onClick={() => handleRemoveImportAttachment(idx)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            {importPreviewData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">数据预览（共 {importPreviewData.length} 条）</h4>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {INBOUND_TEMPLATE_HEADERS.map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{row['商品编码']}</td>
                          <td className="px-3 py-2">{row['数量']}</td>
                          <td className="px-3 py-2">{row['单价'] || '-'}</td>
                          <td className="px-3 py-2">{row['备注'] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreviewData.length > 10 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground bg-muted/50">
                      还有 {importPreviewData.length - 10} 条数据未显示...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
                disabled={importLoading}
              >
                取消
              </Button>
              <Button
                onClick={handleBatchImport}
                disabled={importLoading || importPreviewData.length === 0}
                className="bg-primary text-primary-foreground"
              >
                {importLoading ? '导入中...' : `确认导入 (${importPreviewData.length} 条)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export by Month Dialog */}
      <Dialog open={isExportMonthDialogOpen} onOpenChange={setIsExportMonthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              按月份导出
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择月份</Label>
              <Input
                type="month"
                value={selectedExportMonth}
                onChange={(e) => setSelectedExportMonth(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsExportMonthDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmExportByMonth}
                className="bg-primary text-primary-foreground"
              >
                确认导出
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InboundPage;
