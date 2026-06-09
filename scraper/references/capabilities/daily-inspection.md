# 每日巡检能力

> 对应 SKILL.md 中的「每日巡检」功能

## 巡检流程

```
python cli.py inspect [--with-revenue]
```

1. 订单管理 → 今日订单数
2. 商品管理 → 在售商品总数
3. 审核驳回页 → 驳回数量
4. 飞书 Bitable 候选库 → 商品状态追踪（可选）
5. 生成日报

## 各步骤详情

### 1. 今日订单数

URL: `https://fxg.jinritemai.com/ffa/morder/order/list`

### 2. 在售商品数

URL: `https://fxg.jinritemai.com/ffa/g/list?status=2`

### 3. 审核驳回

URL: `https://fxg.jinritemai.com/ffa/g/list?sov_draft_status=3`

### 4. Bitable 读取（可选）

通过 `douyin_operator.feishu_client.FeishuClient` 读取飞书多维表。

```python
from douyin_operator.feishu_client import FeishuClient

client = FeishuClient(app_id="...", app_secret="...")
records = client.list_records(app_token, table_id)
```

### 5. 生成日报

使用 `python cli.py inspect` 自动完成。

日报格式：
```
📊 每日巡检日报
🗓️ YYYY-MM-DD

在售商品：X个 | 今日订单：X单 | 审核驳回：X个

⚠️ 需要确认的事项
```

## 关键注意

- 打开页面后等 1-2 秒再读数据
- 使用 `BROWSER_DATA_DIR` 保持登录态，避免重复登录
- 经营概览数据（罗盘）为可选，使用 `--with-revenue` 启用
