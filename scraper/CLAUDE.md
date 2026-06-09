# 抖店运营自动化 — Python 浏览器采集工具

## 项目定位

独立浏览器自动化采集工具，通过 Playwright 操作抖店后台 UI，采集商品/订单/评价等数据。
采集结果通过 HTTP API 推送到 `D:\clawshop\backend`（NestJS 全栈项目）进行持久化存储和展示。

## 启动方式

```bash
# 安装
pip install -r requirements.txt

# 采集 + 推送到后端（每日定时任务用这个）
python cli.py daily-push --api-url http://localhost:3000

# 单独命令
python cli.py collect --edge           # 仅采集在售商品（含售价/库存/销量）
python cli.py inspect --edge           # 仅巡检
python cli.py delist "id1,id2" --edge  # 批量下架
python cli.py check-rejected --edge    # 检查审核驳回
```

首次运行 `--edge` 会弹出 Edge 浏览器，扫码登录抖店后自动保存登录态。
后续可用 `--headless` 无头模式静默运行。

## 数据流向

```
Python Playwright（浏览器采集）
  │
  ├── products.json（本地备份）
  │
  └── POST /api/douyin/scrape/push-daily → NestJS 后端
        ├── PostgreSQL
        │     ├── product（商品表，同步名称/售价/库存/销量）
        │     ├── inbound_record（入库记录，新商品自动生成）
        │     ├── outbound_record（出库记录，销量变化自动生成）
        │     ├── alert_record（预警记录，库存为0时生成）
        │     └── douyin_daily_snapshot（每日采集快照）
        │
        └── React 前端（/douyin、/products、/inbound、/outbound 等）
```

## 采集频率

Windows 任务计划程序每天自动运行两次（9:00 / 21:00）：
```bash
# 早晨任务
schtasks /Create /TN "clawshop-daily-push-am" /TR "cmd /c cd /d D:\clawshop\scraper && python cli.py daily-push --api-url http://localhost:3000 --edge --headless" /SC DAILY /ST 09:00 /F

# 晚间任务
schtasks /Create /TN "clawshop-daily-push-pm" /TR "cmd /c cd /d D:\clawshop\scraper && python cli.py daily-push --api-url http://localhost:3000 --edge --headless" /SC DAILY /ST 21:00 /F
```

## 采集数据清单

| 页面 | 采集字段 | 用途 |
|------|---------|------|
| 商品列表 | 商品名/ID/售价/销量/库存/体验分 | 商品管理、入库记录 |
| 订单页 | 今日订单数、待发货/待处理/退款中 | 每日快照、出库记录 |
| 审核驳回 | 驳回商品数 | 每日快照 |
| 商品评价 | 评价总数、好评率 | 每日快照 |
| 经营概览 | 浏览量/访客数/成交金额（部分账号不可用） | 抖店看板 |

## 飞书同步

设置环境变量自动启用飞书 Bitable 同步：

```bash
set FEISHU_APP_ID=cli_xxxxx
set FEISHU_APP_SECRET=xxxxx
```

首次运行自动创建「赛博店长-商品库」多维表格，含 4 个子表：

| 表名 | 写入时机 | 字段 |
|------|---------|------|
| 商品明细 | 每次采集更新 | 商品名称/ID/售价/库存/累计销量/上架日期/体验分/状态 |
| 每日汇总 | 每天一条 | 采集日期/在售商品/今日订单/审核驳回/新增商品数/下架商品数 |
| 入库记录 | 新商品时写入 | 商品名称/数量/入库时间 |
| 出库记录 | 销量增加时写入 | 商品名称/销量变化/累计销量/出库时间 |

飞书配置保存在 `feishu_config.json`（自动生成）。

## 登录态持久化

登录态通过两层保存：
1. `edge_profile/` — 浏览器完整 profile（244MB）
2. `cookies.json` — 纯 cookie 备份（12KB，45个抖店 cookie）

每次运行自动恢复 cookie，无需重复扫码。cookie 过期时自动提示重新登录。

## 目录结构

```
scraper/
├── cli.py                  # CLI 入口（所有命令 + 飞书同步）
├── requirements.txt        # Python 依赖
├── cookies.json            # 登录态 cookie 备份（自动生成）
├── feishu_config.json      # 飞书配置（自动生成）
├── products.json           # 最近一次采集结果
├── last_products.json      # 上次采集结果（用于对比变化）
├── edge_profile/           # 浏览器登录态（自动生成）
├── douyin_operator/        # Python 包
│   ├── browser.py          # Playwright 浏览器管理
│   ├── collector.py        # 全量商品采集（含分页/虚拟滚动）
│   ├── batch_ops.py        # 批量上下架操作
│   ├── inspector.py        # 每日巡检（订单/评价/经营概览）
│   ├── feishu_client.py    # 飞书 API 客户端
│   └── utils.py            # 工具函数（价格解析/日期处理）
├── scripts/                # JS 参考脚本
└── references/             # 参考文档
```

## 推送协议

`POST /api/douyin/scrape/push-daily` 请求体格式：

```json
{
  "snapshot": {
    "date": "2026-06-08",
    "product_count": 4,
    "order_count": 3,
    "rejected_count": 0,
    "order_statuses": {"待发货": 0},
    "revenue_data": null,
    "review_data": {"total_reviews": "46", "good_rate": "97.83%"}
  },
  "products": [
    {
      "douyin_product_id": "3813525542121112025",
      "name": "不沾油双面海绵擦",
      "listed_date": "2026-05-26",
      "status": "active",
      "sale_price": 9.9,
      "sales_count": 9731,
      "stock": 56,
      "category": "57%好评"
    }
  ],
  "changes": {
    "new_products": [],
    "delisted_products": []
  }
}
```

## 关联项目

- `D:\clawshop\backend` — NestJS 全栈项目（数据库 + API + 前端）
- `D:\clawshop\backend\server\modules\douyin\` — 后端抖音模块
- `D:\clawshop\backend\client\src\pages\DouyinPage\` — 前端每日快照页

## 导航栏

```
📊 抖店看板      ← 全局 KPI 总览
📦 商品管理       ← 抖店真实商品数据
⬇ 入库管理       ← 新商品自动生成
⬆ 出库管理       ← 销量变化自动生成
📈 经营数据       ← 销量趋势分析
🛍 每日快照       ← 采集详情
🔔 预警中心       ← 库存预警

系统设置
  ⚙ 预警阈值
  👤 个人管理     ← 清除数据、系统信息
```

## 常见问题

### 闪退问题
已修复。两个原因：1) emoji 在 GBK 终端输出崩溃；2) 页面跳转时 evaluate 上下文被销毁。
- 所有 emoji 替换为 ASCII 标记
- `_ensure_login` 加了 wait_for_load_state + 重试逻辑

### 商品名提取
已修复。之前 `t.split('\n')[0]` 取到的是复选框列的空白。
改为从第 2 个 `<td>` 取第一行文本，正确提取商品名。

### 一键清除数据
在「个人管理」页底部，输入管理员密码（默认 admin123，在 .env 的 ADMIN_CLEAR_PASSWORD 修改）。
清除后所有商品/入库/出库/预警/快照数据都将删除。

### 数据自动生成规则
- **入库记录**：商品首次在采集中出现时自动创建
- **出库记录**：两次采集间销量增加时自动创建
- **预警记录**：库存为 0 时自动创建
