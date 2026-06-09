# clawshop-douyin-operator 🛒

**抖音小店（抖店）后台运营自动化** — 独立版（已剥离 OpenClaw 依赖）

通过 Playwright 浏览器自动化操作抖店后台，支持全量商品采集、批量上下架、每日巡检。

---

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt
python -m playwright install chromium

# 2. 配置飞书（可选，用于 Bitable 同步）
export FEISHU_APP_ID=your_app_id
export FEISHU_APP_SECRET=your_app_secret

# 3. 运行
python cli.py collect          # 全量采集在售商品
python cli.py inspect          # 每日巡检
python cli.py delist "id1,id2" # 批量下架
```

> ⚠️ **前置条件**：浏览器需已登录抖店后台（`fxg.jinritemai.com`）。
> 首次运行会打开浏览器窗口，登录一次后可通过 `BROWSER_DATA_DIR` 保持登录态。

---

## CLI 命令

| 命令 | 说明 | 用法 |
|------|------|------|
| `collect` | 全量采集在售商品 | `python cli.py collect [--headless]` |
| `delist` | 批量下架 | `python cli.py delist <商品ID1,商品ID2,...>` |
| `inspect` | 每日巡检 | `python cli.py inspect [--with-revenue]` |
| `report` | 生成日报 | `python cli.py report` |
| `check-rejected` | 检查审核驳回 | `python cli.py check-rejected` |

选项：
- `--headless` 无头模式运行（不显示浏览器窗口）
- `--with-revenue` / `-r` 采集经营概览数据

### 环境变量

| 变量 | 说明 |
|------|------|
| `BROWSER_DATA_DIR` | Chrome 用户数据目录路径（保持登录态） |
| `FEISHU_APP_ID` | 飞书应用 App ID（Bitable 同步用） |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret |

---

## 核心 URL 速查

基础域: `https://fxg.jinritemai.com`

| 功能 | 路径 |
|------|------|
| 商品管理（在售） | `/ffa/g/list?sov_draft_status=0&sov_goodsType=0` |
| 商品管理（审核驳回） | `/ffa/g/list?sov_draft_status=3` |
| 商品创建 | `/ffa/g/create` |
| 订单管理 | `/ffa/morder/order/list` |
| 发货中心 | `/ffa/morder/logistics/ewaybill-delivery` |
| 经营概览（罗盘） | `/ffa/mcompass/overview` |
| 商机中心 ⭐ | `/ffa/bu/NewBusinessCenter` |
| 体验分 | `/ffa/eco/experience-score` |
| 售后工作台 | `/ffa/maftersale/aftersale/list` |

---

## 每日巡检流程

```bash
python cli.py inspect --with-revenue
```

程序自动：
1. 打开订单管理，读取今日订单数
2. 打开商品管理，读取在售商品总数
3. 检查审核驳回数量
4. 采集经营概览（罗盘）数据（--with-revenue 时）
5. 生成日报

日报格式：
```
📊 每日巡检日报
🗓️ YYYY-MM-DD

在售商品：X个 | 今日订单：X单 | 审核驳回：X个

📈 经营数据
- 浏览量: X
- 成交金额: ¥X
[需要店主确认的事项]
```

---

## 批量下架流程

```bash
python cli.py delist "1234567890123456789,9876543210987654321"
```

程序自动：
1. 打开商品管理页
2. 搜索框输入商品ID → 查詢
3. 全选 → 批量下架
4. 确认弹窗

---

## 飞书 Bitable 商品库

通过 `douyin_operator/feishu_client.py` 直接调用飞书 API，无需 OpenClaw 工具。

配置方式：
```bash
export FEISHU_APP_ID=cli_xxxxx
export FEISHU_APP_SECRET=xxxxx
```

---

## ⚠️ 浏览器操作铁律

1. **操作前确认浏览器已登录抖店后台**
2. **改价必须店主确认**，不能自己改价格
3. **不能刷单、不违规操作**
4. **虚拟滚动**：商品列表每页只渲染可见行，必须边滚边采
5. **图片上传无法自动化**，需手动操作
6. **弹窗按钮文本可能变化**：如「仍要下架」找不到，查看弹窗内容确认实际文案

---

## 参考文档

- [browser-automation.md](references/browser-automation.md) — ⭐ 浏览器踩坑录（必读）
- [strategy.md](references/strategy.md) — 运营策略手册
- [capabilities/product-management.md](references/capabilities/product-management.md) — 商品管理
- [capabilities/batch-operations.md](references/capabilities/batch-operations.md) — 批量操作
- [capabilities/daily-inspection.md](references/capabilities/daily-inspection.md) — 每日巡检
- [capabilities/order-management.md](references/capabilities/order-management.md) — 订单管理
- [faq/base.md](references/faq/base.md) — 开店/保证金
- [faq/experience-score.md](references/faq/experience-score.md) — 体验分
- [faq/listing.md](references/faq/listing.md) — 上架规则
- [faq/fulfillment.md](references/faq/fulfillment.md) — 发货物流
- [errors/common.md](references/errors/common.md) — 常见错误处理
