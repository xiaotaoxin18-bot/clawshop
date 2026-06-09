import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Settings, AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import axios from 'axios';

const axiosForBackend = axios.create({
  baseURL: process.env.CLIENT_BASE_PATH || '/',
});

const ProfilePage: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearData = async () => {
    if (!password) {
      toast.error('请输入管理员密码');
      return;
    }
    try {
      setClearing(true);
      const response = await axiosForBackend({
        url: '/api/system-config/clear-all-data',
        method: 'POST',
        data: { password },
      });
      if (response.data?.success) {
        toast.success('所有数据已清除');
        setShowClearDialog(false);
        setPassword('');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(response.data?.message || '密码错误');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '清除数据失败');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">个人管理</h1>
        <p className="text-sm text-muted-foreground mt-1">账户信息与偏好设置</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              账户信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">用户名</p>
              <p className="font-medium">{userInfo.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">邮箱</p>
              <p className="font-medium">{userInfo.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">角色</p>
              <p className="font-medium">管理员</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">数据来源</p>
              <p className="font-medium">抖店浏览器采集</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">采集频率</p>
              <p className="font-medium">每天 09:00 / 21:00</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">版本</p>
              <p className="font-medium">v1.0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 危险区域 */}
      <Card className="shadow-sm border-destructive/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            危险区域
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">一键清除所有数据</p>
              <p className="text-sm text-muted-foreground mt-1">
                清除后所有商品、出入库记录、预警、采集快照都将被删除，且不可恢复
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              className="shrink-0 ml-4"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清除数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 密码确认弹窗 */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              确认清除所有数据
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              此操作将删除所有数据，包括商品、入库记录、出库记录、预警和采集快照。
              请输入管理员密码确认。
            </p>
            <div className="space-y-2">
              <Label htmlFor="admin-password">管理员密码</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理员密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleClearData()}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowClearDialog(false); setPassword(''); }}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleClearData} disabled={clearing}>
              {clearing ? '清除中...' : '确认清除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
