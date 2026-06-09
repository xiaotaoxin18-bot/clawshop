# 商品管理能力

> 对应 SKILL.md 中的「全量商品读取」和「商品管理」功能
> 首次执行前必须先阅读本文档

## 操作列表

| 操作 | 用途 | 入口URL |
|------|------|---------|
| 查看在售商品 | 读取全量在售商品 | `https://fxg.jinritemai.com/ffa/g/list?status=2` |
| 查看审核驳回 | 检查未通过审核的商品 | `https://fxg.jinritemai.com/ffa/g/list?sov_draft_status=3` |
| 商品创建 | 新增商品 | `https://fxg.jinritemai.com/ffa/g/create` |

## 全量商品采集（唯一可靠方法）

**已验证**：79件商品，4页全量拿到，精确（2026-03-03）

### 核心步骤

1. 打开在售商品页，等待8秒加载完成
2. 用 `window._all = {}` 初始化全局缓存
3. 每页滚动采集（虚拟滚动每次只渲染~7条，必须边滚边采）
4. 点击页码翻页（不是依赖URL变化）
5. 导出结果

### 核心实现

通过 `douyin_operator/collector.py` 的 `ProductCollector` 类实现。

```python
from douyin_operator.browser import BrowserManager
from douyin_operator.collector import ProductCollector

browser = BrowserManager(user_data_dir="path/to/chrome/data")
browser.start()

collector = ProductCollector(browser)
browser.navigate("https://fxg.jinritemai.com/ffa/g/list?status=2")

products = collector.collect_all()  # 返回 [{id, date, name}, ...]
```

采集原理：JS 滚动 `.ecom-table-body` 容器 + 每次提取可见行 DOM。

### 翻页要点

- 页码 li 必须用 `li.className.includes('pagination-item')` 过滤
- 每次翻页后等 2 秒再开始滚动
- 总条数用 `document.body.innerText.match(/共 ?(\d+)/)` 确认

### ❌ 不要用的方法

- **导出查询商品** → 点完生成任务，需在历史报表下载，路径太长、容易断链
- **历史报表下载** → 文件只保留24小时，curl 下会 403，需 browser fetch

## 价格字段说明

抖店价格格式通常为 `￥4.88 ~ ￥9.16`（区间价），取最低价作为参考。
用 `utils.parse_price()` 解析。

## 与 Bitable 同步

全量采集后，用 `douyin_operator.utils.compare_with_bitable()` 对比商品库：
- 新上架商品 → 写入 Bitable，状态设为 `已上架`
- 已下架商品 → 更新 Bitable 状态为 `已下架`
- 日期不一致 → 更新上架日期

Bitable 操作通过 `douyin_operator.feishu_client.FeishuClient` 实现。
