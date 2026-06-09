import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Search,
  Plus,
  Eye,
  Trash2,
  Edit2,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Package,
  Download,
  FileUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '@shared/api.interface';
import {
  getIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  getIssueTypeConfigs,
  getIssueFieldConfigs,
  getWarehouses,
} from '@/api';
import type {
  Issue,
  IssueTypeConfig,
  IssueFieldConfig,
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueListParams,
  Warehouse,
} from '@shared/api.interface';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { isOSSEnabled, uploadToOSS, getOSSConfig } from '@/utils/storage';
import { UserSelect } from '@/components/business-ui/user-select';
import { UserDisplay } from '@/components/business-ui/user-display';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
  closed: { label: '已关闭', color: 'bg-gray-100 text-gray-700' },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-100 text-gray-700' },
  medium: { label: '中', color: 'bg-blue-100 text-blue-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: '紧急', color: 'bg-red-100 text-red-700' },
};

// 获取文件图标
const getFileIcon = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return <ImageIcon className="w-4 h-4 text-muted-foreground" />;
  }
  return <FileText className="w-4 h-4 text-muted-foreground" />;
};

const IssuePage = () => {
  const currentUser = useCurrentUserProfile();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [issueTypes, setIssueTypes] = useState<IssueTypeConfig[]>([]);
  const [issueFields, setIssueFields] = useState<IssueFieldConfig[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportYearMonth, setExportYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ trackingNo: string; orderNo: string; productName: string; productCode?: string }>>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  // 扩展的表单类型，包含仓库字段和处理人
  interface FormDataType extends Partial<CreateIssueRequest> {
    warehouse?: string;
    handler?: string;
  }

  const [formData, setFormData] = useState<FormDataType>({
    issueTypeId: '',
    trackingNo: '',
    orderNo: '',
    productName: '',
    description: '',
    status: 'pending',
    customFields: {},
    attachments: [],
    warehouse: '',
    handler: '',
  });

  // Upload state
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadIssues();
    loadConfig();
    loadWarehouses();
  }, [page, statusFilter, typeFilter]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const params: IssueListParams = {
        page,
        pageSize,
      };
      if (statusFilter !== 'all') params.status = statusFilter as any;
      if (typeFilter !== 'all') params.type = typeFilter;

      const res = await getIssues(params);
      setIssues(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('加载异常问题列表失败', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const [types, fields] = await Promise.all([
        getIssueTypeConfigs(),
        getIssueFieldConfigs(),
      ]);
      setIssueTypes(types);
      setIssueFields(fields);
    } catch (error) {
      logger.error('加载配置失败', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await getWarehouses({ page: 1, pageSize: 100 });
      setWarehouses(response.items);
    } catch (error) {
      logger.error('加载仓库列表失败', error);
    }
  };

  // 文件上传处理
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
            setFormData(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), {
                bucket_id: result.bucket_id,
                file_path: result.file_path,
                download_url: result.download_url,
              }],
            }));
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

            setFormData(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), {
                bucket_id: data.bucket_id,
                file_path: data.file_path,
                download_url: data.download_url,
              }],
            }));
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
  }, []);

  // 移除附件
  const handleRemoveAttachment = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  }, []);

  // 重置表单
  const resetForm = () => {
    setFormData({
      issueTypeId: '',
      trackingNo: '',
      orderNo: '',
      productName: '',
      description: '',
      status: 'pending',
      customFields: {},
      attachments: [],
      warehouse: '',
      handler: '',
    });
  };

  // 打开编辑弹窗
  const handleEdit = async (id: string) => {
    try {
      const issue = await getIssue(id);
      setSelectedIssue(issue);
      setFormData({
        issueTypeId: issue.issueTypeId,
        trackingNo: issue.trackingNo || '',
        orderNo: issue.orderNo || '',
        productName: issue.productName || '',
        description: issue.description || '',
        status: issue.status,
        customFields: issue.customFields || {},
        attachments: issue.attachments || [],
        warehouse: issue.warehouse || '',
        handler: issue.handler || '',
      });
      setEditDialogOpen(true);
    } catch (error) {
      toast.error('获取详情失败');
    }
  };

  // 提交创建
  const handleCreate = async () => {
    if (!formData.issueTypeId) {
      toast.error('请选择异常类型');
      return;
    }
    try {
      await createIssue(formData as CreateIssueRequest);
      toast.success('创建成功');
      setCreateDialogOpen(false);
      resetForm();
      loadIssues();
    } catch (error) {
      toast.error('创建失败');
    }
  };

  // 提交更新
  const handleUpdate = async () => {
    if (!selectedIssue) return;
    try {
      const updateData: UpdateIssueRequest = {
        issueTypeId: formData.issueTypeId,
        trackingNo: formData.trackingNo,
        orderNo: formData.orderNo,
        productName: formData.productName,
        description: formData.description,
        status: formData.status as any,
        customFields: formData.customFields,
        attachments: formData.attachments,
        warehouse: formData.warehouse,
        handler: formData.handler,
      };
      await updateIssue(selectedIssue.id, updateData);
      toast.success('更新成功');
      setEditDialogOpen(false);
      resetForm();
      loadIssues();
    } catch (error) {
      toast.error('更新失败');
    }
  };

  // 删除
  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteIssue(deletingId);
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadIssues();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 按月批量导出
  const handleExportByMonth = () => {
    try {
      // 解析选择的年月
      const [year, month] = exportYearMonth.split('-').map(Number);
      const monthStr = exportYearMonth;

      // 过滤当月数据
      const monthlyIssues = issues.filter((issue) => {
        const issueDate = new Date(issue.createdAt);
        return issueDate.getFullYear() === year && issueDate.getMonth() + 1 === month;
      });

      if (monthlyIssues.length === 0) {
        toast.info(`${monthStr} 暂无异常问题数据`);
        return;
      }

      // 准备 CSV 数据
      const headers = ['异常类型', '快递单号', '在线订单号', '产品名称', '问题描述', '状态', '优先级', '处理人', '所属仓库', '创建时间'];
      const rows = monthlyIssues.map((issue) => [
        issueTypes.find((t) => t.id === issue.issueTypeId)?.name || '-',
        issue.trackingNo || '-',
        issue.orderNo || '-',
        issue.productName || '-',
        issue.description || '-',
        statusMap[issue.status]?.label || issue.status,
        priorityMap[issue.customFields?.priority]?.label || priorityMap[issue.priority]?.label || '-',
        issue.handler || '-',
        issue.warehouse || '-',
        new Date(issue.createdAt).toLocaleString(),
      ]);

      // 生成 CSV 内容
      const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

      // 下载文件
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `异常问题列表_${monthStr}.csv`;
      link.click();

      toast.success(`${monthStr} 数据导出成功，共 ${monthlyIssues.length} 条`);
      setExportDialogOpen(false);
    } catch (error) {
      toast.error('导出失败');
      logger.error('导出异常问题列表失败:', error);
    }
  };

  // 查看详情
  const handleViewDetail = async (id: string) => {
    try {
      const issue = await getIssue(id);
      setSelectedIssue(issue);
      setDetailDialogOpen(true);
    } catch (error) {
      toast.error('获取详情失败');
    }
  };

  // 处理导入文件选择
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportLoading(true);

    try {
      let data: Array<{ trackingNo: string; orderNo: string; productName: string }> = [];

      if (file.name.endsWith('.csv')) {
        // 解析 CSV
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());

        // 查找列索引
        const trackingNoIndex = headers.findIndex(h => h.includes('快递单号') || h.includes('tracking') || h.includes('单号'));
        const orderNoIndex = headers.findIndex(h => h.includes('在线订单号') || h.includes('order') || h.includes('订单号'));
        const productNameIndex = headers.findIndex(h => h.includes('产品名称') || h.includes('productName') || h.includes('名称'));
        const productCodeIndex = headers.findIndex(h => h.includes('产品编码') || h.includes('productCode') || h.includes('编码'));

        if (trackingNoIndex === -1 || orderNoIndex === -1 || (productNameIndex === -1 && productCodeIndex === -1)) {
          toast.error('文件格式错误：缺少必要的列（快递单号、在线订单号、产品名称/编码）');
          setImportLoading(false);
          return;
        }

        data = lines.slice(1).map(line => {
          const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          return {
            trackingNo: cells[trackingNoIndex] || '',
            orderNo: cells[orderNoIndex] || '',
            productName: cells[productNameIndex] || cells[productCodeIndex] || '',
          };
        }).filter(item => item.trackingNo && item.orderNo && item.productName);
      } else {
        // Excel 文件使用简单文本解析提示
        toast.error('请先将 Excel 文件另存为 CSV 格式后导入');
        setImportLoading(false);
        return;
      }

      if (data.length === 0) {
        toast.error('未找到有效数据，请检查文件格式');
        setImportLoading(false);
        return;
      }

      setImportPreview(data);
      toast.success(`成功解析 ${data.length} 条数据`);
    } catch (error) {
      toast.error('文件解析失败');
      logger.error('导入文件解析失败:', error);
    } finally {
      setImportLoading(false);
    }
  };

  // 提交批量导入
  const handleImportSubmit = async () => {
    if (importPreview.length === 0) return;

    // 获取默认异常类型和仓库
    const defaultIssueType = issueTypes.find(t => t.code === 'other') || issueTypes[0];
    const defaultWarehouse = warehouses[0]?.name || '';

    if (!defaultIssueType) {
      toast.error('请先配置异常类型');
      return;
    }

    setImportLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of importPreview) {
        try {
          await createIssue({
            issueTypeId: defaultIssueType.id,
            trackingNo: item.trackingNo,
            orderNo: item.orderNo,
            productName: item.productName,
            description: `批量导入：${item.productName}`,
            status: 'pending',
            priority: 'medium',
            customFields: {},
            attachments: [],
            warehouse: defaultWarehouse,
          });
          successCount++;
        } catch (error) {
          failCount++;
          logger.error('导入单条失败:', error);
        }
      }

      if (successCount > 0) {
        toast.success(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
        setImportDialogOpen(false);
        setImportFile(null);
        setImportPreview([]);
        loadIssues();
      } else {
        toast.error('导入失败，请检查数据格式');
      }
    } catch (error) {
      toast.error('批量导入失败');
      logger.error('批量导入失败:', error);
    } finally {
      setImportLoading(false);
    }
  };

  // 筛选后的数据
  const filteredIssues = issues.filter((issue) => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && issue.issueTypeId !== typeFilter) {
      return false;
    }
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      issue.trackingNo?.toLowerCase().includes(keyword) ||
      issue.orderNo?.toLowerCase().includes(keyword) ||
      issue.productName?.toLowerCase().includes(keyword) ||
      issue.description?.toLowerCase().includes(keyword) ||
      issue.handler?.toLowerCase().includes(keyword)
    );
  });

  // 渲染字段输入
  const renderFieldInput = (field: IssueFieldConfig) => {
    const value = formData.customFields?.[field.fieldKey] || '';

    const handleChange = (newValue: string) => {
      setFormData({
        ...formData,
        customFields: { ...formData.customFields, [field.fieldKey]: newValue },
      });
    };

    switch (field.fieldType) {
      case 'textarea':
        return (
          <textarea
            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`请输入${field.name}`}
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue placeholder={`请选择${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`请输入${field.name}`}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">异常问题列表</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            批量导入
          </Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            按月批量导出
          </Button>
          <Button onClick={() => { resetForm(); setFormData(prev => ({ ...prev, handler: currentUser?.user_id || '' })); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            登记异常
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总数量</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待处理</p>
                <p className="text-2xl font-bold text-[#fc1001]">{issues.filter(i => i.status === 'pending' || i.status === 'processing').length}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已解决</p>
                <p className="text-2xl font-bold text-[#07ff2d]">{issues.filter(i => i.status === 'resolved' || i.status === 'closed').length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <AlertCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索单号或描述..."
                className="pl-9"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {issueTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>异常类型</TableHead>
                  <TableHead>所属仓库</TableHead>
                  <TableHead>快递单号</TableHead>
                  <TableHead>在线订单号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>附件</TableHead>
                  <TableHead>处理人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {issueTypes.find((t) => t.id === issue.issueTypeId)?.name || issue.issueTypeId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {warehouses.find((w) => w.id === issue.warehouse)?.name || issue.warehouse || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{issue.trackingNo || '-'}</TableCell>
                    <TableCell>{issue.orderNo || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {issue.productName || '-'}
                    </TableCell>
                    <TableCell>
                      {issue.priority && (
                        <Badge className={priorityMap[issue.priority]?.color}>
                          {priorityMap[issue.priority]?.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[issue.status]?.color}>
                        {statusMap[issue.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.attachments && issue.attachments.length > 0 ? (
                        <Badge variant="outline">{issue.attachments.length}个附件</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {issue.handler ? (
                        <UserDisplay value={[issue.handler]} size="small" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(issue.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetail(issue.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(issue.id)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <CanRole roles={['role_admin']}>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(issue.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </CanRole>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredIssues.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialogOpen ? '编辑异常问题' : '登记异常问题'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 异常类型、所属仓库、优先级 - 并排显示 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  异常类型 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.issueTypeId}
                  onValueChange={(value) => setFormData({ ...formData, issueTypeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择异常类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  所属仓库 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.warehouse}
                  onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.name}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>优先级</Label>
                <Select
                  value={formData.customFields?.priority || 'medium'}
                  onValueChange={(value) => setFormData({ ...formData, customFields: { ...formData.customFields, priority: value } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueFields.find(f => f.fieldKey === 'priority')?.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">紧急</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 快递单号 */}
            <div className="space-y-2">
              <Label>
                快递单号 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.trackingNo}
                onChange={(e) => setFormData({ ...formData, trackingNo: e.target.value })}
                placeholder="请输入快递单号"
              />
            </div>

            {/* 在线订单号 */}
            <div className="space-y-2">
              <Label>
                在线订单号 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.orderNo}
                onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                placeholder="请输入在线订单号"
              />
            </div>

            {/* 产品名称 */}
            <div className="space-y-2">
              <Label>
                产品名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="请输入产品名称"
              />
            </div>

            {/* 问题描述 */}
            <div className="space-y-2">
              <Label>问题描述</Label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入问题描述..."
              />
            </div>

            {/* 状态 */}
            <div className="space-y-2">
              <Label>
                状态 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {issueFields.find(f => f.fieldKey === 'status')?.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="processing">处理中</SelectItem>
                      <SelectItem value="resolved">已解决</SelectItem>
                      <SelectItem value="closed">已关闭</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 处理人 */}
            <div className="space-y-2">
              <Label>处理人</Label>
              <UserSelect
                value={formData.handler || null}
                onChange={(value) => setFormData({ ...formData, handler: value || '' })}
                placeholder="请选择处理人"
                triggerType="search"
              />
            </div>

            {/* 动态字段 - 过滤掉已在顶部固定显示的字段 */}
            {issueFields
              .filter((field) => field.fieldKey !== 'warehouse' && field.fieldKey !== 'priority' && field.fieldKey !== 'description')
              .map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.name}
                    {field.isRequired && <span className="text-destructive">*</span>}
                  </Label>
                  {renderFieldInput(field)}
                </div>
              ))}

            {/* 附件上传 */}
            <div className="space-y-2">
              <Label>附件</Label>
              <div className="flex flex-wrap gap-2">
                {(formData.attachments || []).map((att, index) => (
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

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
                resetForm();
              }}>
                取消
              </Button>
              <Button
                onClick={editDialogOpen ? handleUpdate : handleCreate}
                disabled={!formData.issueTypeId}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editDialogOpen ? '保存修改' : '确认登记'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>选择导出月份</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>月份</Label>
              <Input
                type="month"
                value={exportYearMonth}
                onChange={(e) => setExportYearMonth(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleExportByMonth}>
                <Download className="w-4 h-4 mr-2" />
                确认导出
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量导入异常问题</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择文件 (CSV/Excel)</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFileChange}
              />
              <p className="text-xs text-muted-foreground">
                文件需包含列：快递单号、在线订单号、产品名称(或产品编码)
              </p>
            </div>

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>预览 (前5条)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>快递单号</TableHead>
                        <TableHead>在线订单号</TableHead>
                        <TableHead>产品名称</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 5).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.trackingNo}</TableCell>
                          <TableCell>{item.orderNo}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  共 {importPreview.length} 条数据
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportPreview([]); }}>
                取消
              </Button>
              <Button onClick={handleImportSubmit} disabled={importLoading || importPreview.length === 0}>
                {importLoading ? '导入中...' : '确认导入'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>异常问题详情</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">异常类型</span>
                  <p className="font-medium">
                    {issueTypes.find((t) => t.id === selectedIssue.issueTypeId)?.name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">状态</span>
                  <p>
                    <Badge className={statusMap[selectedIssue.status]?.color}>
                      {statusMap[selectedIssue.status]?.label}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">优先级</span>
                  <p>
                    {selectedIssue.priority ? (
                      <Badge className={priorityMap[selectedIssue.priority]?.color}>
                        {priorityMap[selectedIssue.priority]?.label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">处理人</span>
                  <div className="mt-1">
                    {selectedIssue.handler ? (
                      <UserDisplay value={[selectedIssue.handler]} size="small" />
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">快递单号</span>
                  <p className="font-medium">{selectedIssue.trackingNo || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">在线订单号</span>
                  <p className="font-medium">{selectedIssue.orderNo || '-'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">产品名称</span>
                  <p className="font-medium">{selectedIssue.productName || '-'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">问题描述</span>
                  <p className="font-medium">{selectedIssue.description || '-'}</p>
                </div>
                {/* 附件列表 */}
                {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">附件列表</span>
                    <div className="mt-2 space-y-2">
                      {selectedIssue.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          {getFileIcon(file.file_path)}
                          <span className="text-sm truncate">{file.file_path.split('/').pop()}</span>
                          {file.download_url && (
                            <UniversalLink
                              to={file.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm hover:underline ml-auto"
                            >
                              下载
                            </UniversalLink>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedIssue.status === 'resolved' || selectedIssue.status === 'closed') && (
                  <>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">解决方案</span>
                      <p className="font-medium">{selectedIssue.resolutionNote || '-'}</p>
                    </div>
                    {selectedIssue.resolvedAt && (
                      <div>
                        <span className="text-muted-foreground">解决时间</span>
                        <p>{new Date(selectedIssue.resolvedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <span className="text-muted-foreground">创建时间</span>
                  <p>{new Date(selectedIssue.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">更新时间</span>
                  <p>{new Date(selectedIssue.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">确定删除此异常问题吗？此操作不可恢复。</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssuePage;
