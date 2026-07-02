/**
 * 构建后清理 index.html
 *
 * 1. 移除 @lark-apaas/fullstack-rspack-preset 注入的飞书 SDK 脚本
 * 2. 移除内联 platform 脚本，替换为外部 platform-config.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'dist', 'client', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('[clean-html] index.html not found at', htmlPath);
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf-8');
const originalLength = html.length;
let changes = 0;

// 辅助函数：移除从 start 到结束的脚本块
const removeScriptAt = (pos, startMarker) => {
  const scriptStart = startMarker ? html.lastIndexOf('<script>', pos) : html.lastIndexOf('<script', pos);
  const scriptEnd = html.indexOf('</script>', pos) + '</script>'.length;
  if (scriptStart >= 0 && scriptEnd > scriptStart) {
    html = html.slice(0, scriptStart) + html.slice(scriptEnd);
    return true;
  }
  return false;
};

// 1. 移除 Slardar 脚本
let idx = html.indexOf('const slardarScript');
if (idx >= 0) {
  const p1 = html.lastIndexOf('</script>', idx) + '</script>'.length;
  const e1 = html.indexOf('</script>', idx) + '</script>'.length;
  html = html.slice(0, p1) + html.slice(e1);
  changes++;
  console.log('[clean-html] Removed Slardar script');
}

// 2. 移除 Feishu Performance 脚本
idx = html.indexOf('sf3-scmcdn-cn.feishucdn.com/obj/unpkg/byted/performance');
if (idx >= 0) {
  if (removeScriptAt(idx, false)) { changes++; console.log('[clean-html] Removed Performance script'); }
}

// 3. 移除 Tea 分析脚本
idx = html.indexOf('LogAnalyticsObject');
if (idx >= 0) {
  if (removeScriptAt(idx, false)) { changes++; console.log('[clean-html] Removed Tea script'); }
}

// 4. 移除内联 __platform__ script
idx = html.indexOf('__platform__ = JSON.parse');
if (idx >= 0) {
  if (removeScriptAt(idx, true)) { changes++; console.log('[clean-html] Removed inline __platform__ script'); }
}

// 5. 移除内联 csrfToken script（以及其他窗口属性）
idx = html.indexOf('window.csrfToken');
if (idx >= 0) {
  if (removeScriptAt(idx, true)) { changes++; console.log('[clean-html] Removed inline csrfToken/etc script'); }
}

// 6. 插入 platform-config.js（在 main.js 前）
const configTag = '  <script defer src="/clawshop/platform-config.js"></script>\n';
html = html.replace('<script defer src="/clawshop/main.js">', configTag + '<script defer src="/clawshop/main.js">');

// 7. 清理多余空行
html = html.replace(/\n{4,}/g, '\n\n');

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log(`[clean-html] ${changes} changes, ${originalLength} -> ${html.length} bytes`);
