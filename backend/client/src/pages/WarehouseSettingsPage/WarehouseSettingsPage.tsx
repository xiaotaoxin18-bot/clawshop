import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Warehouse, Plus, Search, Pencil, Trash2, Building2, MapPin, Phone, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/api';
import type { Warehouse as IWarehouse } from '@shared/api.interface';
import { logger } from '@lark-apaas/client-toolkit/logger';

const WarehouseSettingsPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<IWarehouse | null>(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState<IWarehouse | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    manager: '',
    phone: '',
    remark: '',
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const res = await getWarehouses({ page: 1, pageSize: 100 });
      setWarehouses(res.items);
    } catch (error) {
      logger.error('加载仓库列表失败', error);
      toast.error('加载仓库列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      manager: '',
      phone: '',
      remark: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (warehouse: IWarehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || '',
      manager: warehouse.manager || '',
      phone: warehouse.phone || '',
      remark: warehouse.remark || '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (warehouse: IWarehouse) => {
    setDeletingWarehouse(warehouse);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      toast.error('请填写仓库名称和编码');
      return;
    }

    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, formData);
        toast.success('仓库信息已更新');
      } else {
        await createWarehouse({
          ...formData,
          isDefault: warehouses.length === 0,
        });
        toast.success('仓库添加成功');
      }
      await loadWarehouses();
      setIsDialogOpen(false);
    } catch (error) {
      logger.error(editingWarehouse ? '更新仓库失败' : '创建仓库失败', error);
      toast.error(editingWarehouse ? '更新失败' : '创建失败');
    }
  };

  const handleDelete = async () => {
    if (deletingWarehouse) {
      try {
        await deleteWarehouse(deletingWarehouse.id);
        toast.success('仓库已删除');
        await loadWarehouses();
      } catch (error) {
        logger.error('删除仓库失败', error);
        toast.error('删除失败');
      } finally {
        setIsDeleteDialogOpen(false);
        setDeletingWarehouse(null);
      }
    }
  };

  const filteredWarehouses = warehouses.filter(w =>
    w.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    w.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (w.address && w.address.toLowerCase().includes(searchKeyword.toLowerCase())) ||
    (w.manager && w.manager.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  return (
    <>
      <style jsx>{`
        .warehouse-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="warehouse-page w-full space-y-6">
        <section className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Warehouse className="w-6 h-6 text-primary" />
              分仓管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理系统中的仓库信息，支持多仓库存管理</p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            新增仓库
          </Button>
        </section>

        <section className="w-full">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  仓库列表
                  <Badge variant="secondary" className="ml-2">
                    {warehouses.length} 个
                  </Badge>
                </CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索仓库名称、编码、地址..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium">仓库编码</TableHead>
                      <TableHead className="font-medium">仓库名称</TableHead>
                      <TableHead className="font-medium">地址</TableHead>
                      <TableHead className="font-medium">负责人</TableHead>
                      <TableHead className="font-medium">联系电话</TableHead>
                      <TableHead className="font-medium">备注</TableHead>
                      <TableHead className="font-medium text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            加载中...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredWarehouses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无仓库数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWarehouses.map((warehouse) => (
                        <TableRow key={warehouse.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{warehouse.code}</TableCell>
                          <TableCell className="font-medium">{warehouse.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {warehouse.address || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <User className="w-3 h-3 text-muted-foreground" />
                              {warehouse.manager || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {warehouse.phone ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {warehouse.phone}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {warehouse.remark || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(warehouse)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleOpenDelete(warehouse)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-primary" />
                {editingWarehouse ? '编辑仓库' : '新增仓库'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warehouse-code">
                    仓库编码 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="warehouse-code"
                    placeholder="如：WH-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse-name">
                    仓库名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="warehouse-name"
                    placeholder="如：主仓库"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse-address">仓库地址</Label>
                <Input
                  id="warehouse-address"
                  placeholder="请输入详细地址"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warehouse-manager">负责人</Label>
                  <Input
                    id="warehouse-manager"
                    placeholder="负责人姓名"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse-phone">联系电话</Label>
                  <Input
                    id="warehouse-phone"
                    placeholder="联系电话"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse-remark">备注</Label>
                <Input
                  id="warehouse-remark"
                  placeholder="备注信息（可选）"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {editingWarehouse ? '保存修改' : '确认添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                确认删除
              </DialogTitle>
              <DialogDescription>
                您确定要删除仓库 <strong>{deletingWarehouse?.name}</strong> 吗？
                此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default WarehouseSettingsPage;
