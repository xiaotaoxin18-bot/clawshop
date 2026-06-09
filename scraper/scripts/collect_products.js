/**
 * 全量商品采集脚本 — 抖店商品管理页虚拟滚动分页采集
 *
 * 用法: 在抖店在售商品页 (https://fxg.jinritemai.com/ffa/g/list?status=2)
 *       打开浏览器控制台，或通过 OpenClaw evaluate 逐段执行。
 *
 * 已验证: 79件商品，4页全量拿到，精确 (2026-03-03)
 *
 * 流程:
 *   1. initCollector()  — 初始化全局缓存
 *   2. collectCurrentPage() — 滚动采集当前页所有可见行
 *   3. goToPage(N)      — 翻到第 N 页
 *   4. repeat 2-3 直到所有页采完
 *   5. exportResults()  — 导出结果
 */

// ============================================================
// 步骤 1: 初始化采集器 (在页面执行一次)
// ============================================================
// act evaluate
() => {
  window._all = {};
  window._pageTotal = 0;
  // 确认商品总数
  const totalMatch = document.body.innerText.match(/共 ?(\d+)/);
  window._totalGoods = totalMatch ? parseInt(totalMatch[1]) : 0;
  return `✅ 初始化完成，共 ${window._totalGoods} 件商品`;
}

// ============================================================
// 步骤 2: 采集当前页 (滚动 + 提取)
// ============================================================
// act evaluate — 在当前页边滚边采
() => {
  const extract = () => {
    document.querySelectorAll('table tbody tr').forEach(r => {
      const t = r.innerText;
      const id = t.match(/ID:(\d{15,})/);
      const dt = t.match(/202\d\/\d{2}\/\d{2}/);
      if (id && dt) {
        window._all[id[1]] = { date: dt[0], row: t.substring(0, 80) };
      }
    });
  };

  return new Promise(resolve => {
    const scrollEl = document.querySelector('.ecom-table-body')
      || document.scrollingElement;
    scrollEl.scrollTop = 0;
    let i = 0;
    const step = () => {
      extract();
      scrollEl.scrollTop += 500;
      i++;
      if (i < 15) {
        setTimeout(step, 200);
      } else {
        // 最后一次提取
        setTimeout(() => { extract(); resolve(Object.keys(window._all).length); }, 300);
      }
    };
    step();
  });
}

// ============================================================
// 步骤 3: 翻到指定页码
// ============================================================
// act evaluate（传入目标页码 N）
async (pageNum) => {
  const targetPage = String(pageNum);
  const pageBtn = [...document.querySelectorAll('li')]
    .find(li => li.innerText.trim() === targetPage
      && li.className.includes('pagination-item'));
  if (!pageBtn) return `❌ 找不到页码 ${targetPage} 的按钮`;
  pageBtn.click();
  await new Promise(r => setTimeout(r, 2000));
  return `✅ 已翻到第 ${targetPage} 页`;
}

// ============================================================
// 步骤 4: 翻页后采集（重复步骤 2 的逻辑，但含翻页等待）
// ============================================================
// act evaluate
async () => {
  const before = Object.keys(window._all).length;
  const scrollEl = document.querySelector('.ecom-table-body')
    || document.scrollingElement;
  scrollEl.scrollTop = 0;
  await new Promise(r => setTimeout(r, 500));

  for (let i = 0; i < 15; i++) {
    document.querySelectorAll('table tbody tr').forEach(r => {
      const t = r.innerText;
      const id = t.match(/ID:(\d{15,})/);
      const dt = t.match(/202\d\/\d{2}\/\d{2}/);
      if (id && dt) {
        window._all[id[1]] = { date: dt[0], row: t.substring(0, 80) };
      }
    });
    scrollEl.scrollTop += 500;
    await new Promise(r => setTimeout(r, 150));
  }
  const after = Object.keys(window._all).length;
  return { before, after, new: after - before };
}

// ============================================================
// 步骤 5: 导出结果
// ============================================================
// act evaluate
() => {
  const entries = Object.entries(window._all)
    .sort((a, b) => a[1].date < b[1].date ? 1 : -1);
  return {
    total: entries.length,
    products: entries.map(([id, info]) => ({ id, date: info.date }))
  };
}

// ============================================================
// 步骤 6 (备用): 获取商品总数
// ============================================================
// act evaluate
() => {
  const m = document.body.innerText.match(/共 ?(\d+) ?件商品/);
  return m ? parseInt(m[1]) : -1;
}

// ============================================================
// 单页采集（精简版 — 确认商品 ID 用）
// ============================================================
// act evaluate — 只采当前页不滚动
() => {
  return [...document.querySelectorAll('table tbody tr')].map(r => {
    const t = r.innerText;
    const id = (t.match(/ID:(\d{15,})/) || [])[1];
    const name = t.split('\n')[0];
    return { id, name };
  }).filter(p => p.id);
}
