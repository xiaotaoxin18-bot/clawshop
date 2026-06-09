/**
 * Runtime stub - 替代 @lark-apaas/client-toolkit/runtime
 *
 * 防止 preset 注入的运行时模块加载飞书 SDK 的：
 * - observable（遥测/监控，发起 TimeOffset API 请求）
 * - iframe-bridge（与飞书容器通信）
 * - axios（配置飞书拦截器）
 * - 其他初始化代码（dayjs, server-log 等）
 */

if (!window.__FULLSTACK_RUNTIME_INITIALIZED__) {
  window.__FULLSTACK_RUNTIME_INITIALIZED__ = true;
  // 所有飞书运行时初始化已跳过
}
