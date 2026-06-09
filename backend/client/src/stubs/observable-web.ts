/**
 * @lark-apaas/observable-web stub
 *
 * 飞书可观测性 SDK，包含 initTimeOffset、collectorUrl 等 Feishu 平台 API 调用。
 * 在非飞书环境下这些请求会返回 HTML 而非 JSON，导致 JSON 解析报错。
 * 直接屏蔽整个包，不输出任何代码。
 */
export const observable = {
  log: () => {},
  startSpan: () => ({ end: () => {}, setAttribute: () => {} }),
  init: () => {},
  start: () => {},
};
export default {};
