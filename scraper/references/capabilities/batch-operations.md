# 批量操作能力

> 对应 SKILL.md 中的「批量下架/上架」功能

## 操作列表

| 操作 | 说明 | 风险 |
|------|------|------|
| 批量下架 | 将指定商品从在售状态改为下架 | ⚠️ 中 |
| 批量上架 | 将指定商品重新上架 | ⚠️ 低 |
| 批量改价 | 修改商品价格 | 🔴 **必须店主确认** |

## 批量下架流程

完整流程通过 `cli.py delist` 一键执行：

```bash
python cli.py delist "1234567890123456789,9876543210987654321"
```

或使用 Python API：

```python
from douyin_operator.browser import BrowserManager
from douyin_operator.batch_ops import BatchOperator

with BrowserManager(user_data_dir="./chrome-data") as browser:
    op = BatchOperator(browser)
    result = op.batch_delist("1234567890123456789,9876543210987654321")
    print(result)  # {"success": True, "count": 2, ...}
```

### 内部步骤

1. **搜索**：React 搜索框填入逗号分隔的商品ID
2. **查询**：点击查询按钮
3. **全选**：勾选表头全选框
4. **批量下架**：点击批量下架按钮
5. **确认弹窗**：找「仍要下架」按钮点击

## 🔴 安全规则

1. **改价必须店主确认**：任何修改价格的操作必须询问店主
2. **不能刷单**：所有操作必须合规
3. **如果搜索不到商品**：确认商品ID格式后再操作

## 常见问题

### 搜索后找不到商品
- 确认商品ID是15位以上的纯数字
- 确认商品属于当前店铺
- 检查是否已经下架

### 弹窗确认按钮找不到
- 检查弹窗内容：`page.evaluate("document.querySelector('.ecom-modal-body')?.innerText")`
- 不同操作弹窗用词可能不同

### React 输入框不生效
Playwright 的 `fill()` 方法通常会自动处理 React 合成事件。
如果无效，使用 JS setter 方式强制触发。
