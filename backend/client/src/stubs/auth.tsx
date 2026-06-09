/**
 * Auth stub - 替代 @lark-apaas/client-toolkit/auth
 * 鉴权功能将不可用，但页面不会白屏
 */
import React from 'react';

export const ROLE_SUBJECT = {
  ALL: '*',
  MENU: 'menu',
  PAGE: 'page',
  OPERATE: 'operate',
};

export const AbilityContext = React.createContext<unknown>(null);

interface CanRoleProps {
  children: React.ReactNode;
  role?: string | string[];
  subject?: string;
  [key: string]: unknown;
}

export const CanRole: React.FC<CanRoleProps> = ({ children }) => {
  return <>{children}</>;
};
