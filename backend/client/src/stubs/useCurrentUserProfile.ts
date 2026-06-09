/**
 * useCurrentUserProfile stub - 替代 @lark-apaas/client-toolkit/hooks/useCurrentUserProfile
 * 返回空对象而非 null，避免页面访问 userInfo.name 时报错
 */

export const useCurrentUserProfile = (): Record<string, unknown> => {
  return {};
};
