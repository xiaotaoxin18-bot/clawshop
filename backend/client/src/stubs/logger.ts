/**
 * Logger stub - 替代 @lark-apaas/client-toolkit/logger
 * 避免打包飞书 SDK 代码触发 WebView 安全检测
 */

const noop = (..._args: unknown[]) => {};

export const logger = {
  debug: noop,
  info: console.log,
  warn: console.warn,
  error: console.error,
  log: console.log,
  trace: noop,
};
