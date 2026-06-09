import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { IssueTypeConfig, IssueFieldConfig, FieldOption } from '@shared/api.interface';
import {
  getIssueTypes,
  createIssueType as apiCreateIssueType,
  updateIssueType as apiUpdateIssueType,
  deleteIssueType as apiDeleteIssueType,
  getIssueFields,
  createIssueField as apiCreateIssueField,
  updateIssueField as apiUpdateIssueField,
  deleteIssueField as apiDeleteIssueField,
} from '@/api';

export default function IssueSettingsPage() {
  const [activeTab, setActiveTab] = useState('types');
  const [issueTypes, setIssueTypes] = useState<IssueTypeConfig[]>([]);
  const [issueFields, setIssueFields] = useState<IssueFieldConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Type form state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<IssueTypeConfig | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', code: '', description: '', isEnabled: true, sortOrder: 0 });

  // Field form state
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<IssueFieldConfig | null>(null);
  const [fieldForm, setFieldForm] = useState({
    name: '',
    fieldKey: '',
    fieldType: 'text' as IssueFieldConfig['fieldType'],
    isRequired: false,
    isEnabled: true,
    sortOrder: 0,
    options: [] as FieldOption[],
  });
  const [newOption, setNewOption] = useState({ label: '', value: '' });

  // Delete confirm state
  const [deleteTypeDialogOpen, setDeleteTypeDialogOpen] = useState(false);
  const [deleteFieldDialogOpen, setDeleteFieldDialogOpen] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [types, fields] = await Promise.all([getIssueTypes(), getIssueFields()]);
      setIssueTypes(Array.isArray(types) ? types : []);
      setIssueFields(Array.isArray(fields) ? fields : []);
    } catch (error) {
      toast.error('加载数据失败');
      setIssueTypes([]);
      setIssueFields([]);
    } finally {
      setLoading(false);
    }
  };

  // Type handlers
  const handleSaveType = async () => {
    try {
      if (editingType) {
        await apiUpdateIssueType(editingType.id, typeForm);
        toast.success('更新成功');
      } else {
        await apiCreateIssueType(typeForm);
        toast.success('创建成功');
      }
      setTypeDialogOpen(false);
      setEditingType(null);
      setTypeForm({ name: '', code: '', description: '', isEnabled: true, sortOrder: 0 });
      loadData();
    } catch (error) {
      toast.error(editingType ? '更新失败' : '创建失败');
    }
  };

  const handleEditType = (type: IssueTypeConfig) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      code: type.code,
      description: type.description || '',
      isEnabled: type.isEnabled,
      sortOrder: type.sortOrder,
    });
    setTypeDialogOpen(true);
  };

  const handleDeleteTypeClick = (id: string) => {
    setDeletingTypeId(id);
    setDeleteTypeDialogOpen(true);
  };

  const handleConfirmDeleteType = async () => {
    if (!deletingTypeId) return;
    try {
      await apiDeleteIssueType(deletingTypeId);
      toast.success('删除成功');
      setDeleteTypeDialogOpen(false);
      setDeletingTypeId(null);
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // Field handlers
  const handleSaveField = async () => {
    try {
      const data = { ...fieldForm };
      if (editingField) {
        await apiUpdateIssueField(editingField.id, data);
        toast.success('更新成功');
      } else {
        await apiCreateIssueField(data);
        toast.success('创建成功');
      }
      setFieldDialogOpen(false);
      setEditingField(null);
      setFieldForm({
        name: '',
        fieldKey: '',
        fieldType: 'text',
        isRequired: false,
        isEnabled: true,
        sortOrder: 0,
        options: [],
      });
      loadData();
    } catch (error) {
      toast.error(editingField ? '更新失败' : '创建失败');
    }
  };

  const handleEditField = (field: IssueFieldConfig) => {
    setEditingField(field);
    setFieldForm({
      name: field.name,
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isEnabled: field.isEnabled,
      sortOrder: field.sortOrder,
      options: field.options || [],
    });
    setFieldDialogOpen(true);
  };

  const handleDeleteFieldClick = (id: string) => {
    setDeletingFieldId(id);
    setDeleteFieldDialogOpen(true);
  };

  const handleConfirmDeleteField = async () => {
    if (!deletingFieldId) return;
    try {
      await apiDeleteIssueField(deletingFieldId);
      toast.success('删除成功');
      setDeleteFieldDialogOpen(false);
      setDeletingFieldId(null);
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleAddOption = () => {
    if (!newOption.label || !newOption.value) return;
    setFieldForm(prev => ({ ...prev, options: [...prev.options, { ...newOption }] }));
    setNewOption({ label: '', value: '' });
  };

  const handleRemoveOption = (index: number) => {
    setFieldForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">异常设置</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="types">异常类型</TabsTrigger>
          <TabsTrigger value="fields">字段配置</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingType(null); setTypeForm({ name: '', code: '', description: '', isEnabled: true, sortOrder: 0 }); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增异常类型
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingType ? '编辑异常类型' : '新增异常类型'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>名称 <span className="text-destructive">*</span></Label>
                    <Input
                      value={typeForm.name}
                      onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                      placeholder="如：破损异常"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>编码 <span className="text-destructive">*</span></Label>
                    <Input
                      value={typeForm.code}
                      onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                      placeholder="如：damage"
                      disabled={!!editingType}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Input
                      value={typeForm.description}
                      onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                      placeholder="异常类型描述"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>排序</Label>
                    <Input
                      type="number"
                      value={typeForm.sortOrder}
                      onChange={(e) => setTypeForm({ ...typeForm, sortOrder: parseInt(e.target.value) || 0 })}
                      placeholder="数字越小越靠前"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={typeForm.isEnabled}
                      onCheckedChange={(checked) => setTypeForm({ ...typeForm, isEnabled: checked })}
                    />
                    <Label>启用</Label>
                  </div>
                  <Button onClick={handleSaveType} className="w-full">
                    {editingType ? '更新' : '创建'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {Array.isArray(issueTypes) && issueTypes.map((type) => (
              <Card key={type.id} className={!type.isEnabled ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{type.name}</h3>
                        <p className="text-sm text-muted-foreground">{type.code}</p>
                        {type.description && (
                          <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${type.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {type.isEnabled ? '启用' : '禁用'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleEditType(type)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTypeClick(type.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {issueTypes.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无异常类型配置</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingField(null);
                  setFieldForm({ name: '', fieldKey: '', fieldType: 'text', isRequired: false, isEnabled: true, sortOrder: 0, options: [] });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增字段
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingField ? '编辑字段' : '新增字段'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>显示名称 <span className="text-destructive">*</span></Label>
                    <Input
                      value={fieldForm.name}
                      onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                      placeholder="如：快递单号"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>字段标识 <span className="text-destructive">*</span></Label>
                    <Input
                      value={fieldForm.fieldKey}
                      onChange={(e) => setFieldForm({ ...fieldForm, fieldKey: e.target.value })}
                      placeholder="如：tracking_no"
                      disabled={!!editingField}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>字段类型</Label>
                    <Select
                      value={fieldForm.fieldType}
                      onValueChange={(value) => setFieldForm({ ...fieldForm, fieldType: value as IssueFieldConfig['fieldType'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">文本</SelectItem>
                        <SelectItem value="number">数字</SelectItem>
                        <SelectItem value="select">下拉选择</SelectItem>
                        <SelectItem value="warehouse">仓库选择</SelectItem>
                        <SelectItem value="date">日期</SelectItem>
                        <SelectItem value="textarea">多行文本</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {fieldForm.fieldType === 'select' && (
                    <div className="space-y-2 border rounded-lg p-3">
                      <Label>选项配置</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="显示文字"
                          value={newOption.label}
                          onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                        />
                        <Input
                          placeholder="值"
                          value={newOption.value}
                          onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                        />
                        <Button type="button" onClick={handleAddOption} size="sm">添加</Button>
                      </div>
                      <div className="space-y-1">
                        {fieldForm.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-muted px-2 py-1 rounded">
                            <span>{opt.label} ({opt.value})</span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveOption(idx)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fieldForm.fieldType === 'warehouse' && (
                    <div className="space-y-2 border rounded-lg p-3 bg-blue-50 border-blue-200">
                      <p className="text-sm text-blue-700">
                        该字段将自动从分仓管理中获取仓库数据，无需手动配置选项。
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>排序</Label>
                    <Input
                      type="number"
                      value={fieldForm.sortOrder}
                      onChange={(e) => setFieldForm({ ...fieldForm, sortOrder: parseInt(e.target.value) || 0 })}
                      placeholder="数字越小越靠前"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={fieldForm.isRequired}
                        onCheckedChange={(checked) => setFieldForm({ ...fieldForm, isRequired: checked })}
                      />
                      <Label>必填</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={fieldForm.isEnabled}
                        onCheckedChange={(checked) => setFieldForm({ ...fieldForm, isEnabled: checked })}
                      />
                      <Label>启用</Label>
                    </div>
                  </div>
                  <Button onClick={handleSaveField} className="w-full">
                    {editingField ? '更新' : '创建'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {Array.isArray(issueFields) && issueFields.map((field) => (
              <Card key={field.id} className={!field.isEnabled ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{field.name}</h3>
                          {field.isRequired && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">必填</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{field.fieldKey} · {field.fieldType}</p>
                        {field.options && field.options.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            选项: {field.options.map(o => o.label).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${field.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {field.isEnabled ? '启用' : '禁用'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleEditField(field)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteFieldClick(field.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {issueFields.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无字段配置</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Type Confirm Dialog */}
      <Dialog open={deleteTypeDialogOpen} onOpenChange={setDeleteTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">确定删除此异常类型吗？此操作不可恢复。</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTypeDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteType}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Field Confirm Dialog */}
      <Dialog open={deleteFieldDialogOpen} onOpenChange={setDeleteFieldDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">确定删除此字段配置吗？此操作不可恢复。</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteFieldDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteField}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
