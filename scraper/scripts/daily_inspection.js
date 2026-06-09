/**
 * 每日巡检脚本 — 抖店运营日报自动采集
 *
 * 流程:
 *   1. checkOrderCount()    — 打开订单管理，确认今日订单数
 *   2. checkProductCount()  — 打开商品管理，确认在售商品总数
 *   3. checkRejectedCount() — 检查审核驳回数量
 *   4. generateReport()     — 生成日报摘要
 *
 * 配合 clawshop-data-manager 读取飞书 Bitable 候选库状态。
 */

// ============================================================
// 步骤 1: 检查订单数
// ============================================================
// 需要在订单管理页执行: https://fxg.jinritemai.com/ffa/morder/order/list

// act evaluate — 读取今日订单数
() => {
  const text = document.body.innerText;

  // 尝试多种匹配模式
  const patterns = [
    /今日订单[：:]\s*(\d+)/,
    /今日[^。]{0,20}?(\d+)\s*单/,
    /全部[^。]{0,10}?(\d+)\s*单/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { count: parseInt(m[1]), source: m[0] };
  }

  // 兜底: 页面上所有数字 + "单"字组合
  const allMatches = text.match(/\d+\s*单/g);
  if (allMatches) {
    const counts = allMatches.map(s => parseInt(s));
    return { count: Math.max(...counts), source: 'auto_detect', raw: allMatches };
  }

  return { count: -1, source: 'not_found' };
}

// ============================================================
// 步骤 2: 检查在售商品数
// ============================================================
// 需要在商品管理页执行: https://fxg.jinritemai.com/ffa/g/list?status=2

// act evaluate
() => {
  const m = document.body.innerText.match(/共 ?(\d+) ?件商品/);
  return {
    count: m ? parseInt(m[1]) : -1,
    text: m ? m[0] : '❌ 未找到商品总数'
  };
}

// ============================================================
// 步骤 3: 检查审核驳回
// ============================================================
// 需要在审核驳回页执行: https://fxg.jinritemai.com/ffa/g/list?sov_draft_status=3

// act evaluate
() => {
  const m = document.body.innerText.match(/共 ?(\d+) ?件商品/);
  return {
    rejected: m ? parseInt(m[1]) : 0,
    detail: m ? `${m[1]} 件商品审核驳回` : '✅ 无审核驳回'
  };
}

// ============================================================
// 步骤 4: 读取页面核心指标汇总
// ============================================================
// 需要在经营概览执行: https://fxg.jinritemai.com/ffa/mcompass/overview

// act evaluate — 提取罗盘概览数据
() => {
  const text = document.body.innerText;

  const extract = (patterns) => {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1];
    }
    return null;
  };

  return {
    views: extract([/浏览量[：:]?\s*([\d,.]+)/, /浏览[：:]?\s*([\d,.]+)/]),
    visitors: extract([/访客[数]?[：:]?\s*([\d,.]+)/]),
    orderCount: extract([/订单数[：:]?\s*([\d,.]+)/, /成交[：:]?\s*([\d,.]+)/]),
    revenue: extract([/成交金额[：:]?\s*([\d,.]+)/, /销售额[：:]?\s*([\d,.]+)/]),
    conversionRate: extract([/转化率[：:]?\s*([\d.]+%)/]),
  };
}

// ============================================================
// 步骤 5: 生成巡检日报
// ============================================================
// 这个在 AI agent 层面组合数据，不是浏览器内执行

// 日报格式参考:
/*
📊 每日巡检日报
🗓️ YYYY-MM-DD

在售商品：X个 | 今日订单：X单 | 审核驳回：X个

📦 商品概况
- 在售商品: X 个
- 审核驳回: X 个（需处理）
- 候选库待评估: X 个

📈 经营数据
- 浏览量: X
- 访客数: X
- 成交金额: ¥X
- 转化率: X%

⚠️ 需要确认的事项
- [如果审核驳回 > 0] 有 X 个商品审核驳回，需查看原因并修改
- [如果候选库待评估 > 5] 候选库积压 X 个，建议评估
- [其他异常]
*/

// ============================================================
// 辅助: 检查页面是否加载完成
// ============================================================
// act evaluate — 确认页面已渲染
() => {
  const state = {
    ready: document.readyState === 'complete',
    hasTable: !!document.querySelector('table'),
    hasText: document.body.innerText.length > 100,
    title: document.title,
    url: window.location.href,
  };
  state.loaded = state.ready && state.hasText;
  return state;
}

// ============================================================
// 辅助: 截图准备 — 滚动到页面顶部确保全页可见
// ============================================================
// act evaluate
() => {
  window.scrollTo(0, 0);
  return '已滚动到顶部';
}
