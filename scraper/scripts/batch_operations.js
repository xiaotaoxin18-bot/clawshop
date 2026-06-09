/**
 * 批量上下架操作脚本 — 抖店商品管理页
 *
 * 用法: 在抖店商品管理页执行，通过 OpenClaw evaluate 调用
 *
 * 完整流程:
 *   1. searchProducts(ids)  — 搜索指定商品ID
 *   2. selectAll()          — 全选
 *   3. clickBatchAction()   — 点批量下架/上架
 *   4. confirmDialog()      — 确认弹窗
 *
 * ⚠️ 注意: 所有操作都用 evaluate + 直接 DOM 操作，避免 ref 失效问题
 */

// ============================================================
// 步骤 1: 搜索商品（根据商品ID或名称）
// ============================================================

// 按商品ID搜索（逗号分隔）
// act evaluate
(productIds) => {
  const input = document.querySelector('input[placeholder*="商品名称"]');
  if (!input) return '❌ 找不到搜索框';

  // React 组件监听合成事件，必须用 setter + dispatchEvent
  const nativeInputValueSetter =
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(input, productIds);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return `✅ 已填入: ${productIds}`;
}

// 点击查询按钮
// act evaluate （填入ID后等300ms再点查询）
() => {
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.innerText.trim() === '查询');
  if (btn) { btn.click(); return '✅ 已点击查询'; }
  return '❌ 找不到查询按钮';
}

// ============================================================
// 步骤 2: 全选
// ============================================================
// act evaluate
() => {
  const checkbox = document.querySelector('thead input[type=checkbox]')
    || document.querySelector('.ecom-table-thead input[type=checkbox]')
    || document.querySelector('.ecom-checkbox-input');
  if (checkbox) { checkbox.click(); return '✅ 已全选'; }
  return '❌ 找不到全选框';
}

// ============================================================
// 步骤 3: 点击批量下架 / 批量上架
// ============================================================
// act evaluate
(action) => {
  const label = action === '下架' ? '批量下架' : '批量上架';
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.innerText.includes(label));
  if (btn) { btn.click(); return `✅ 已点击${label}`; }
  return `❌ 找不到"${label}"按钮`;
}

// ============================================================
// 步骤 4: 确认弹窗
// ============================================================
// act evaluate — 弹窗出现后调用
(confirmText) => {
  const text = confirmText || '仍要下架';
  const btn = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === text);
  if (btn) { btn.click(); return `✅ 已确认: ${text}`; }
  return `❌ 找不到"${text}"按钮，弹窗内容: ${document.querySelector('.ecom-modal-body')?.innerText || '无弹窗'}`;
}

// ============================================================
// 辅助: 检查搜索结果
// ============================================================
// act evaluate — 搜索后查看结果数量
() => {
  const m = document.body.innerText.match(/共 ?(\d+) ?件商品/);
  const count = m ? parseInt(m[1]) : 0;
  return { count, text: count > 0 ? `✅ 搜索到 ${count} 件商品` : '⚠️ 搜索结果为空' };
}

// ============================================================
// 辅助: 等待结果加载
// ============================================================
// act evaluate
() => new Promise(r => setTimeout(r, 2000));

// ============================================================
// 一键批量下架流程（合并版 — 供不拆分步骤时使用）
// ============================================================
// act evaluate
async (productIds) => {
  // Step 1: 填入搜索框
  const input = document.querySelector('input[placeholder*="商品名称"]');
  if (!input) return { step: 'search_input', error: '找不到搜索框' };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, productIds);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // Step 2: 点查询
  await new Promise(r => setTimeout(r, 500));
  const searchBtn = [...document.querySelectorAll('button')]
    .find(b => b.innerText.trim() === '查询');
  if (!searchBtn) return { step: 'search_btn', error: '找不到查询按钮' };
  searchBtn.click();

  // Step 3: 等结果加载，全选
  await new Promise(r => setTimeout(r, 2000));
  const cb = document.querySelector('thead input[type=checkbox]')
    || document.querySelector('.ecom-checkbox-input');
  if (!cb) return { step: 'checkbox', error: '找不到全选框' };
  cb.click();

  // Step 4: 点批量下架
  const delBtn = [...document.querySelectorAll('button')]
    .find(b => b.innerText.includes('批量下架'));
  if (!delBtn) return { step: 'delist_btn', error: '找不到批量下架按钮' };
  delBtn.click();

  // Step 5: 确认弹窗
  await new Promise(r => setTimeout(r, 1000));
  const confirmBtn = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === '仍要下架');
  if (!confirmBtn) return { step: 'confirm', error: '找不到确认按钮', modal: document.querySelector('.ecom-modal-body')?.innerText };
  confirmBtn.click();

  return { step: 'done', status: '✅ 批量下架流程完成' };
}
