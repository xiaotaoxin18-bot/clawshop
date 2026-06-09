# 常见错误处理

> 各操作步骤可能遇到的错误及对策

## 页面加载类

| 现象 | 原因 | 对策 |
|------|------|------|
| 浏览器窗口闪退 | Playwright 找不到 Chromium | 运行 `python -m playwright install chromium` |
| 页面空白 | 页面未完全加载 | 打开后等 1-2 秒再操作 |
| 加载超时 | 网络慢/抖店页面重 | 增加 wait_seconds 参数 |
| 跳转到登录页 | 登录态过期 | 手动登录一次，用 `BROWSER_DATA_DIR` 保持会话 |
| 「页面异常，请刷新」 | 抖店服务端问题 | 等待 5 秒后重试 |

## 浏览器操作类

| 现象 | 原因 | 对策 |
|------|------|------|
| `TimeoutError` | 页面元素没找到 | 增加等待时间，检查选择器是否有效 |
| 选择器没匹配到 | 页面结构变化 | 用 `page.content()` 检查实际 DOM |
| JS evaluate 报语法错误 | 多语句需要 IIFE | 用箭头函数包裹: `() => { ... }` |
| 截图不包含关键数据 | 页面太长 | 截 full_page 截图 |

## 商品管理类

| 现象 | 原因 | 对策 |
|------|------|------|
| 搜索不到商品 | ID格式不对/不属于本店 | 确认ID 15位以上纯数字 |
| 全选后操作按钮灰色 | 没有真正选中 | 检查全选框状态，等 1 秒再点操作按钮 |
| 批量下架按钮没反应 | 按钮被遮挡 | 先 `window.scrollTo(0, 0)` 再点 |
| 弹窗找不到确认按钮 | 弹窗文本不同 | 检查弹窗内容，从弹窗文本提取按钮名 |
| 虚拟滚动采不全 | 滚动太快 | 每次 scroll 500px，等 200ms |

## 订单类

| 现象 | 原因 | 对策 |
|------|------|------|
| 订单数为 0 | 筛选条件不对 | 检查订单页筛选是否选了「全部订单」 |
| 订单数异常大 | 统计周期不对 | 确认匹配「今日订单」，不是「全部」 |

## 飞书 Bitable 类

| 现象 | 原因 | 对策 |
|------|------|------|
| 授权失败 `code != 0` | App ID / Secret 错误 | 检查 FEISHU_APP_ID / FEISHU_APP_SECRET |
| 读取记录失败 | token 已过期 | FeishuClient 会自动刷新 token |
| 写入失败字段名错误 | 主字段名不对 | 用 `list_fields()` 获取实际主字段名 |
| 重复入库 | 没先查重 | `list_records` 查全量后按商品名去重 |

## React 输入框

抖店搜索框是 React 组件，监听合成事件：

```python
# Playwright fill() 通常能正确处理
page.fill('input[placeholder*="商品名称"]', '商品ID')

# 如果不行，用 JS setter 强推
page.evaluate("""(value) => {
    const input = document.querySelector('input[placeholder*="商品名称"]');
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}""", "商品ID")
```

## 降级策略

如果某个操作连续失败 3 次：
1. 截图保存当前页面
2. 输出具体哪个步骤失败（如「第2步-全选失败」）
3. 建议手动操作该步骤
4. 记录到笔记供后续参考
