import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * 匿名用户角色中间件
 * 为所有未登录用户自动分配管理员和操作员角色
 * 适用于内部网络或测试环境，让免登录用户获得完整权限
 */
@Injectable()
export class AnonymousRoleMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 如果请求没有用户信息（未登录），则添加匿名用户上下文
    if (!req.userContext) {
      (req as any).userContext = {
        userId: 'anonymous_user',
        tenantId: 'anonymous_tenant',
        appId: 'anonymous_app',
        env: 'runtime' as const,
        userName: '访客用户',
        userNameEn: 'Anonymous User',
        userNameI18n: { zh_cn: '访客用户', en_us: 'Anonymous User' },
      };
    }

    // 为所有请求添加角色信息（包括已登录和匿名用户）
    // 这里将管理员和操作员角色附加到请求的 platform_data 中
    const platformData = (req as any).__platform_data__ || {};
    platformData.roles = ['role_admin', 'role_operator'];
    (req as any).__platform_data__ = platformData;

    // 本地开发环境下覆盖 basename，使 React Router 正确匹配根路径
    // 避免 window.__BASENAME__ 被设为 /app/ 导致页面空白
    if (process.env.NODE_ENV !== 'production') {
      req.headers['x-miaoda-custom-host'] = 'localhost';
    }

    next();
  }
}
