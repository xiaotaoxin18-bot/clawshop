# 库存管理系统 - 需求拆解文档

## 产品概述

- **产品类型**: 库存管理 SaaS 系统
- **场景类型**: prototype - app
- **目标用户**: 仓库管理员、采购人员、运营决策者
- **核心价值**: 实现库存数据自动化核算、出入库全流程数字化、智能预警降低断货与积压风险
- **界面语言**: 中文
- **主题偏好**: light
- **导航模式**: 路径导航
- **导航布局**: Sidebar（侧边栏导航，适合管理系统多模块场景）

---

## 页面结构总览

> **说明**：此表为页面生成的唯一数据源，包含所有页面（一级+二级）

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 库存总览 | `DashboardPage.tsx` | `/` | 一级 | 导航 |
| 货品管理 | `ProductsPage.tsx` | `/products` | 一级 | 导航 |
| 货品详情 | `ProductDetailPage.tsx` | `/products/:id` | 二级 | 货品管理页 → 列表项点击 |
| 入库管理 | `InboundPage.tsx` | `/inbound` | 一级 | 导航 |
| 出库管理 | `OutboundPage.tsx` | `/outbound` | 一级 | 导航 |
| 预警中心 | `AlertsPage.tsx` | `/alerts` | 一级 | 导航 |
| 数据统计 | `AnalyticsPage.tsx` | `/analytics` | 一级 | 导航 |

> **页面类型说明**：
> - **一级页面**：出现在导航中，用户可直接访问
> - **二级页面**：不在导航中，从一级页面跳转进入

---

## 导航配置

- **导航布局**: Sidebar（左侧固定侧边栏）
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标 |
|---------|------|------|
| 库存总览 | `/` | LayoutDashboard |
| 货品管理 | `/products` | Package |
| 入库管理 | `/inbound` | ArrowDownLeft |
| 出库管理 | `/outbound` | ArrowUpRight |
| 预警中心 | `/alerts` | Bell |
| 数据统计 | `/analytics` | BarChart3 |

---

## 功能列表

### 库存总览 `/`
- **页面目标**: 展示全局库存状态，快速了解库存健康度
- **功能点**:
  - **KPI 指标卡**: 展示总库存价值、库存品类数、预警货品数、今日出入库数量
  - **库存分布图**: 各品类库存占比环形图
  - **预警清单**: 底部展示当前预警的货品列表（可点击跳转详情）
  - **快捷操作**: 快速入库/出库按钮

### 货品管理 `/products`
- **页面目标**: 维护货品基础信息，管理库存安全线
- **功能点**:
  - **货品列表**: 展示货品名称、编码、当前库存、成本价、库存价值、状态（安全/预警）
  - **搜索筛选**: 按名称/编码搜索，按状态筛选
  - **新增货品**: 弹窗表单录入货品基础信息（名称、编码、成本价、安全库存线）
  - **编辑货品**: 点击列表项进入货品详情页编辑
  - **批量操作**: 批量设置安全库存线

### 货品详情 `/products/:id`
- **页面目标**: 查看单个货品的完整信息和出入库历史
- **功能点**:
  - **基础信息**: 展示货品名称、编码、成本价、当前库存、安全库存线、库存价值
  - **库存状态**: AI 智能判断显示"安全"或"预警"状态（基于当前库存与安全线对比）
  - **状态说明**: 展示自然语言描述的库存判断规则
  - **出入库记录**: 该货品的历史出入库流水表格
  - **编辑功能**: 修改货品基础信息和安全库存线

### 入库管理 `/inbound`
- **页面目标**: 记录和管理货品入库操作
- **功能点**:
  - **入库单列表**: 展示入库记录（货品、数量、入库人、入库时间）
  - **新增入库**: 弹窗表单选择货品、输入入库数量、填写入库人
  - **入库提醒**: 入库成功后显示确认通知
  - **批量导入**: 支持批量导入入库数据（可选扩展）

### 出库管理 `/outbound`
- **页面目标**: 记录和管理货品出库操作
- **功能点**:
  - **出库单列表**: 展示出库记录（货品、数量、出库人、出库时间）
  - **新增出库**: 弹窗表单选择货品、输入出库数量、填写出库人
  - **库存校验**: 出库数量不能超过当前库存
  - **出库提醒**: 出库成功后显示确认通知
  - **库存联动**: 出库后实时更新库存总表

### 预警中心 `/alerts`
- **页面目标**: 集中管理所有预警提醒
- **功能点**:
  - **预警分类标签**: 库存临界值/缺货预警/全部
  - **预警列表**: 展示预警货品（货品信息、当前库存、安全库存线、缺货数量）
  - **预警详情**: 查看预警货品的详细信息和历史记录
  - **标记处理**: 将已处理的预警标记为已读
  - **预警统计**: 本月预警次数、高频预警货品

### 数据统计 `/analytics`
- **页面目标**: 库存数据可视化展示，支撑决策
- **功能点**:
  - **库存成本趋势**: 折线图展示库存总价值变化趋势
  - **出入库趋势**: 柱状图对比近期出入库数量
  - **货品周转排行**: 横向条形图展示高频出入库货品
  - **预警趋势**: 预警次数月度变化
  - **数据导出**: 导出统计报表（可选扩展）

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_inv_products` | 货品基础信息及实时库存，类型为 `IProduct[]` | 库存总览、货品管理、入库管理、出库管理、预警中心 |
| `__global_inv_inbound_records` | 入库记录列表，类型为 `IInboundRecord[]` | 入库管理、货品详情、数据统计 |
| `__global_inv_outbound_records` | 出库记录列表，类型为 `IOutboundRecord[]` | 出库管理、货品详情、数据统计 |
| `__global_inv_current_product` | 当前选中的货品详情，类型为 `IProduct` | 货品详情 |
| `__global_inv_alerts` | 预警记录列表，类型为 `IAlert[]` | 预警中心、库存总览 |
| `__global_inv_search_keyword` | 搜索关键词，类型为 `string` | 货品管理 |

```ts
interface IProduct {
  id: string;
  name: string;
  code: string;
  costPrice: number;
  currentStock: number;
  safetyStock: number;
  stockValue: number;
  status: 'safe' | 'warning';
  createdAt: string;
  updatedAt: string;
}

interface IInboundRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  operator: string;
  createdAt: string;
}

interface IOutboundRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  operator: string;
  createdAt: string;
}

interface IAlert {
  id: string;
  productId: string;
  productName: string;
  alertType: 'critical' | 'shortage';
  currentStock: number;
  safetyStock: number;
  shortAmount: number;
  isRead: boolean;
  createdAt: string;
}

-------

# UI 设计指南

> **场景类型**: `prototype - app`（应用架构设计 - 多页面管理系统）
> **确认检查**: 本指南适用于库存管理 SaaS 系统，包含侧边栏导航、多页面结构、数据表单与可视化组件。

> ℹ️ Section 1-2 为设计意图与决策上下文。Code agent 实现时以 Section 3 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解
- **目标用户**: 仓库管理员（日常操作）、采购人员（补货决策）、运营决策者（数据洞察）
- **使用场景**: 办公室桌面端为主，需要长时间注视数据表格，高频进行出入库录入操作
- **核心目的**: 建立库存数据自动化核算体系，实现出入库全流程数字化，通过智能预警降低断货与积压风险
- **期望情绪**: 专业、清晰、可控、高效 —— 让用户对库存状态一目了然，操作有信心
- **需避免的感受**: 焦虑（预警过于刺眼）、混乱（信息过载）、廉价感（不专业的视觉）
- **品牌关键词**: 精准、自动化、可追溯、数据驱动

### 1.2 设计语言
- **Aesthetic Direction**: 现代专业型 SaaS 界面，以清晰的信息层级和友好的交互反馈为核心
- **Visual Signature**: 
  - 左侧固定 Sidebar 导航锚定全局位置感
  - 圆角卡片容器组织信息区块
  - 状态色块（安全绿/预警琥珀/危险红）快速传达库存健康度
  - 数据表格斑马纹 + Hover 高亮提升可读性
  - 微妙的阴影层次区分内容层级
- **Emotional Tone**: 冷静专业中带有人性温度 —— 数据冰冷但界面友好，预警醒目但不恐慌
- **Design Style**: **Rounded 圆润几何** — 管理系统需要亲和力降低使用门槛，圆角卡片 + pill 按钮 + 柔和阴影营造现代友好的专业感，适合长时间操作的仓库管理场景
- **Application Type**: App（多页面后台管理系统）

## 2. Design Principles (设计理念)

1. **信息密度与可读性平衡** — 库存管理涉及大量数据表格，在保持信息完整的同时通过斑马纹、Hover 态、足够的行高确保长时间阅读不疲劳

2. **状态即反馈** — 库存状态（安全/预警/危险）必须一目了然，通过色彩、图标、标签三重编码确保用户无需思考即可理解当前状况

3. **操作路径最短化** — 高频操作（入库/出库）在任意页面都可快速触达，减少页面跳转次数，提升操作效率

4. **渐进式信息揭示** — 概览页展示关键指标，详情页展示完整流水，避免一次性呈现过多信息造成认知负荷

5. **一致性降低学习成本** — 所有表单、表格、按钮遵循统一的交互模式，让用户形成肌肉记忆

## 3. Color System (色彩系统)

> **配色设计理由**: 库存管理系统需要建立专业可信的视觉形象，选择 Indigo（靛蓝）作为主色传达技术与信赖感，Teal（青绿）作为强调色增添活力与现代感。预警系统使用 Amber（琥珀）平衡醒目与柔和，避免红色过度使用造成焦虑。

> **⚠️ App 场景配色规则**: 本系统为 App 子场景，配色从内容理解自主推导，未使用预设配色方案库。

### 3.1 主题颜色

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| bg | `--background` | `bg-background` | `hsl(210 20% 98%)` | 极浅灰蓝，减少纯白刺眼感，长时间阅读更舒适 |
| surface | `--card` | `bg-card` | `hsl(0 0% 100%)` | 纯白卡片背景，与页面背景形成明确层次 |
| text | `--foreground` | `text-foreground` | `hsl(222 47% 11%)` | 深蓝黑，高对比度确保文字清晰可读 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | `hsl(215 16% 47%)` | 中灰蓝，用于次要信息、标签、占位符 |
| primary | `--primary` | `bg-primary` | `hsl(226 70% 55%)` | Indigo 靛蓝，专业信赖感，用于主按钮、激活态、关键操作 |
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | `hsl(210 40% 98%)` | 近白色，确保在 primary 背景上的可读性 |
| accent | `--accent` | `bg-accent` | `hsl(175 60% 45%)` | Teal 青绿，比 primary 更活泼，用于次级强调、hover 态、成功状态 |
| accent-foreground | `--accent-foreground` | `text-accent-foreground` | `hsl(210 40% 98%)` | 近白色，确保在 accent 背景上的可读性 |
| border | `--border` | `border-border` | `hsl(214 32% 91%)` | 浅灰蓝边框，柔和分隔各元素 |

### 3.2 Sidebar 颜色

> **定义时机**: Navigation Type 为 Sidebar，必须完整定义

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| sidebar | `--sidebar` | `bg-sidebar` | `hsl(226 70% 55%)` | 与 primary 一致，作为全局导航基底，强化品牌认知 |
| sidebar-foreground | `--sidebar-foreground` | `text-sidebar-foreground` | `hsl(210 40% 98%)` | 近白色，对比度充足，确保导航文字清晰 |
| sidebar-primary | `--sidebar-primary` | `bg-sidebar-primary` | `hsl(210 40% 98%)` | 激活态背景使用浅色，形成明确的当前位置指示 |
| sidebar-primary-foreground | `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | `hsl(226 70% 55%)` | 激活态文字使用 primary 色，与背景形成对比 |
| sidebar-accent | `--sidebar-accent` | `bg-sidebar-accent` | `hsl(226 70% 45%)` | Hover 态背景比 sidebar 稍深，提供明确的交互反馈 |
| sidebar-accent-foreground | `--sidebar-accent-foreground` | `text-sidebar-accent-foreground` | `hsl(210 40% 98%)` | Hover 态文字保持浅色 |
| sidebar-border | `--sidebar-border` | `border-sidebar-border` | `hsl(226 60% 45%)` | 比 sidebar 背景稍亮的边框，微妙分隔 |
| sidebar-ring | `--sidebar-ring` | `ring-sidebar-ring` | `hsl(210 40% 98%)` | 聚焦环使用浅色，键盘导航时清晰可见 |

### 3.3 语义颜色（状态反馈）

> 库存管理系统需要明确的状态反馈，定义完整的语义色板

| 用途 | 角色 | HSL 值 | 设计说明 |
|-----|-----|--------|---------|
| 成功/安全 | `--success` | `hsl(142 71% 45%)` | 绿色，库存充足、操作成功 |
| 成功背景 | `--success-bg` | `hsl(142 76% 97%)` | 极浅绿背景，用于状态标签 |
| 警告/预警 | `--warning` | `hsl(38 92% 50%)` | Amber 琥珀，库存临界、需要关注 |
| 警告背景 | `--warning-bg` | `hsl(48 100% 96%)` | 极浅琥珀背景 |
| 危险/缺货 | `--destructive` | `hsl(0 72% 51%)` | 红色，库存不足、操作危险 |
| 危险背景 | `--destructive-bg` | `hsl(0 93% 96%)` | 极浅红背景 |
| 信息/提示 | `--info` | `hsl(226 70% 55%)` | 与 primary 一致，普通提示 |

## 4. Typography (字体排版)

- **Heading**: `Inter`, `Noto Sans SC`, `system-ui`, `sans-serif`
- **Body**: `Inter`, `Noto Sans SC`, `system-ui`, `sans-serif`
- **数字专用**: `JetBrains Mono`, `ui-monospace`, `monospace` — 用于库存数量、金额等需要等宽对齐的数据

**字体导入**:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

**字体层级**:

| 层级 | 尺寸 | 字重 | 行高 | 用途 |
|-----|-----|-----|-----|-----|
| H1 | `text-2xl` (24px) | `font-bold` (700) | `leading-tight` | 页面主标题 |
| H2 | `text-xl` (20px) | `font-semibold` (600) | `leading-tight` | 区块标题 |
| H3 | `text-lg` (18px) | `font-medium` (500) | `leading-snug` | 卡片标题 |
| Body | `text-sm` (14px) | `font-normal` (400) | `leading-relaxed` | 正文内容 |
| Small | `text-xs` (12px) | `font-normal` (400) | `leading-normal` | 辅助文字、标签 |
| Data | `text-sm` (14px) | `font-medium` (500) | `leading-none` | 表格数据（等宽字体）|

## 5. Global Layout Structure (全局布局结构)

### 5.1 Navigation Strategy (导航策略)

- **导航模式**: Sidebar（左侧固定侧边栏）
- **选择理由**: 7个一级页面，需要持久的全局导航，Sidebar 提供稳定的位置感，适合管理系统场景
- **Sidebar 配置**:
  - 宽度: `w-64` (256px)
  - 位置: 固定左侧 `fixed left-0 top-0 h-screen`
  - 背景: `bg-sidebar` (Indigo 靛蓝)
  - 导航项: 图标 + 文字，垂直排列
  - 激活态: 白色背景圆角卡片，文字变为 primary 色
  - Hover 态: 背景加深 `bg-sidebar-accent`

### 5.2 Page Content Zones (页面区块配置)

**Standard Content Zone（全页面统一）**:
- **Maximum Width**: `max-w-[1400px]` — 后台管理系统需要较宽视口展示数据表格，但不超过 1400px 避免行过长
- **Padding**: `px-6 lg:px-8` — 适中的水平内边距
- **Alignment**: `mx-auto` — 居中
- **Vertical Spacing**: `space-y-6` — 区块间距 24px

**宽内容溢出策略**: 数据表格区域使用 `overflow-x-auto` 实现横向滚动，不放大容器 max-w

**页面结构骨架**:
```html
<div class="min-h-screen bg-background">
  <!-- Sidebar Navigation -->
  <aside class="fixed left-0 top-0 w-64 h-screen bg-sidebar z-40">
    <!-- Logo Area -->
    <div class="h-16 flex items-center px-6 border-b border-sidebar-border">
      <span class="text-sidebar-foreground font-bold text-lg">库存管理系统</span>
    </div>
    <!-- Navigation Items -->
    <nav class="p-4 space-y-1">
      <a href="..." class="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
        <Icon class="w-5 h-5" />
        <span>导航文字</span>
      </a>
      <!-- Active State -->
      <a href="..." class="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-medium">
        <Icon class="w-5 h-5" />
        <span>当前页面</span>
      </a>
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="ml-64 min-h-screen">
    <!-- Top Header (Optional, for page title + actions) -->
    <header class="h-16 bg-card border-b border-border px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      <h1 class="text-2xl font-bold text-foreground">页面标题</h1>
      <div class="flex items-center gap-3">
        <!-- Action Buttons -->
      </div>
    </header>
    
    <!-- Page Content -->
    <div class="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 space-y-6">
      <!-- Content Blocks -->
    </div>
  </main>
</div>
```

## 6. Visual Effects & Motion (视觉效果与动效)

- **装饰手法**: 无复杂装饰，依靠卡片阴影和色彩层次区分内容
- **圆角策略**:
  - 卡片/容器: `rounded-lg` (8px)
  - 按钮: `rounded-md` (6px) 或 `rounded-full` (pill 形状用于特殊操作)
  - 输入框: `rounded-md` (6px)
  - 标签/徽章: `rounded-full` (pill)
- **阴影策略**:
  - 卡片: `shadow-sm` — 微妙的投影，不抢夺注意力
  - 浮动元素（Dropdown/Modal）: `shadow-lg` — 明显的投影表现层级
  - Sidebar: `shadow-xl` — 固定侧边栏需要明显的投影与内容区分
- **复杂背景文字处理**: 
  - Sidebar 使用深色背景（Indigo），文字固定为浅色 `text-sidebar-foreground`，对比度充足无需额外处理
  - 表格行 Hover 使用 `bg-muted`（浅灰蓝），文字颜色不变
- **缓动函数**: `cubic-bezier(0.4, 0, 0.2, 1)` — 标准 ease-out，自然的交互反馈
- **关键动效**:
  - 页面切换: 无动画（多页应用保持快速响应）
  - 按钮 Hover: `transition-colors duration-200` — 颜色过渡 200ms
  - 卡片 Hover: `transition-shadow duration-200` — 阴影加深
  - 表格行 Hover: `transition-colors duration-150` — 快速反馈
  - Modal 弹出: `animate-in fade-in zoom-in-95 duration-200` — 缩放淡入
  - 数字变化: 无动画（数据展示保持静态可读性）

## 7. Components (组件指南)

### 7.1 Buttons

**Primary Button**:
- 背景: `bg-primary` (Indigo)
- 文字: `text-primary-foreground` (白色)
- Hover: `hover:bg-primary/90` — 透明度降低
- 圆角: `rounded-md`
- 内边距: `px-4 py-2`
- 字重: `font-medium`
- 过渡: `transition-colors duration-200`

**Secondary Button**:
- 背景: `bg-card` (白色)
- 边框: `border border-border`
- 文字: `text-foreground`
- Hover: `hover:bg-muted hover:text-foreground`
- 其他同 Primary

**Danger Button**:
- 背景: `bg-destructive` (红色)
- 文字: `text-white`
- Hover: `hover:bg-destructive/90`
- 用途: 删除操作、严重警告确认

**Ghost Button**:
- 背景: 透明
- 文字: `text-muted-foreground`
- Hover: `hover:bg-muted hover:text-foreground`
- 用途: 图标按钮、次级操作

### 7.2 Form Elements

**Input**:
- 背景: `bg-card`
- 边框: `border border-border`
- 圆角: `rounded-md`
- 内边距: `px-3 py-2`
- 文字: `text-sm text-foreground`
- Placeholder: `placeholder:text-muted-foreground`
- Focus: `focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

**Select/Dropdown**:
- 同 Input 样式
- 下拉菜单: `bg-card shadow-lg rounded-md border border-border`

**Label**:
- 文字: `text-sm font-medium text-foreground`
- 间距: `mb-1.5` (与输入框间距)

### 7.3 Cards

**Standard Card**:
- 背景: `bg-card`
- 边框: `border border-border`
- 圆角: `rounded-lg`
- 阴影: `shadow-sm`
- 内边距: `p-6`

**KPI Card** (指标卡片):
- 同 Standard Card
- 内部结构: 顶部图标 + 中间大数字 `text-3xl font-bold text-foreground` + 底部标签 `text-sm text-muted-foreground`
- 状态指示: 底部添加状态标签（安全绿/预警琥珀/危险红）

**Table Card**:
- 同 Standard Card
- 内部: 表格容器 `overflow-x-auto`
- 表格样式见下文

### 7.4 Tables

**Data Table**:
- 表头: `bg-muted border-b border-border`
- 表头文字: `text-xs font-medium text-muted-foreground uppercase tracking-wider`
- 单元格内边距: `px-4 py-3`
- 行样式: `border-b border-border last:border-0`
- 斑马纹: `even:bg-muted/50`（可选，数据密集时开启）
- 行 Hover: `hover:bg-muted transition-colors duration-150`
- 文字: `text-sm text-foreground`
- 数字列: 右对齐 `text-right`，使用等宽字体 `font-mono`

### 7.5 Status Badges (状态标签)

**安全 (Safe)**:
- 背景: `bg-[hsl(142_76%_97%)]`
- 文字: `text-[hsl(142_71%_45%)]`
- 圆角: `rounded-full`
- 内边距: `px-2.5 py-0.5`
- 文字: `text-xs font-medium`

**预警 (Warning)**:
- 背景: `bg-[hsl(48_100%_96%)]`
- 文字: `text-[hsl(38_92%_50%)]`
- 其他同上

**危险 (Danger)**:
- 背景: `bg-[hsl(0_93%_96%)]`
- 文字: `text-[hsl(0_72%_51%)]`
- 其他同上

### 7.6 Modal/Dialog

**Overlay**:
- 背景: `bg-black/50` — 半透明黑色遮罩
- 位置: 固定全屏 `fixed inset-0 z-50`
- 点击: 点击遮罩关闭

**Dialog Container**:
- 背景: `bg-card`
- 圆角: `rounded-lg`
- 阴影: `shadow-lg`
- 宽度: `max-w-lg`（根据内容调整，表单用 `max-w-md`，确认框用 `max-w-sm`）
- 动画: `animate-in fade-in zoom-in-95 duration-200`

**Dialog Header**:
- 内边距: `p-6 pb-4`
- 标题: `text-lg font-semibold text-foreground`
- 描述: `text-sm text-muted-foreground mt-1`

**Dialog Footer**:
- 内边距: `p-6 pt-4`
- 布局: `flex justify-end gap-3`
- 按钮: 左侧 Secondary（取消），右侧 Primary（确认）

### 7.7 Alerts (预警通知)

**Alert Banner** (页面顶部预警条):
- 背景: `bg-warning-bg border-l-4 border-warning`
- 内边距: `p-4`
- 图标: `text-warning`
- 文字: `text-sm text-foreground`
- 关闭按钮: 右侧 `text-muted-foreground hover:text-foreground`

**Toast Notification** (操作反馈):
- 位置: 固定右下角 `fixed bottom-4 right-4`
- 背景: `bg-card shadow-lg border border-border`
- 圆角: `rounded-lg`
- 内边距: `p-4`
- 成功: 左侧绿色竖条 `border-l-4 border-success`
- 错误: 左侧红色竖条 `border-l-4 border-destructive`

## 8. Flexibility Note (灵活性说明)

> **一致性优先原则**: 本系统为 7 页面的多页应用，所有页面必须使用相同的核心参数（最大宽度 1400px、Sidebar 宽度 256px、统一的圆角阴影风格），确保整体设计语言统一。

**允许的微调范围**（code agent 可自行判断）:
- 响应式断点适配（移动端 Sidebar 可收缩为汉堡菜单）
- 页面内部的局部间距（如卡片内边距可根据内容量微调 ±2px）
- 表格列宽根据实际数据内容调整
- 图表高度根据数据密度调整

**禁止的随意变更**:
- ❌ 不同页面使用不同的最大宽度
- ❌ 不同页面使用不同的圆角/阴影风格
- ❌ 不同页面使用不同的主色调
- ❌ 改变 Sidebar 导航结构（必须在所有页面保持一致）

## 9. Signature & Constraints (设计签名与禁区)

### DO (视觉签名)
1. **Indigo Sidebar + 白色激活态** — 左侧导航使用靛蓝底色，当前页面用白色圆角卡片高亮，形成强烈的当前位置感知
   ```css
   .sidebar-active { @apply bg-sidebar-primary text-sidebar-primary-foreground rounded-lg font-medium; }
   ```

2. **状态色块三件套** — 所有库存状态统一使用绿/琥珀/红三色标签，圆角 pill 形状，左侧配图标（CheckCircle/AlertTriangle/XCircle）
   ```css
   .badge-safe { @apply bg-[hsl(142_76%_97%)] text-[hsl(142_71%_45%)] rounded-full px-2.5 py-0.5 text-xs font-medium; }
   ```

3. **数据表格斑马纹 + Hover 高亮** — 提升长时间阅读数据的可读性
   ```css
   .data-table tr:nth-child(even) { @apply bg-muted/50; }
   .data-table tr:hover { @apply bg-muted transition-colors duration-150; }
   ```

4. **JetBrains Mono 数字** — 所有库存数量、金额使用等宽字体，确保表格列对齐
   ```css
   .numeric { @apply font-mono text-sm font-medium; }
   ```

5. **Modal 表单录入** — 入库/出库/新增货品操作使用 Modal 弹窗而非跳转页面，保持上下文连贯

### DON'T (禁止做法)
> 通用约束参见「通用约束」。以下为库存管理系统特有:
- ❌ 使用纯黑色背景（Dark Mode）— 仓库管理员需要长时间操作系统，深色模式易造成视觉疲劳
- ❌ 预警使用闪烁动画或红色背景填充 — 避免造成用户焦虑，使用琥珀色标签即可
- ❌ 表格单元格文字换行 — 库存数据应单行展示，使用 `whitespace-nowrap` + 横向滚动
- ❌ 在数据表格中使用卡片包裹每一行 — 表格应保持标准表格形态，卡片用于组织区块而非行