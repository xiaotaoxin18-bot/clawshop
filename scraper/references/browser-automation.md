# 抖店浏览器自动化 - 踩坑录 & 最佳实践

> 实战总结，避免重复踩坑。每条都是真实踩过的。

---

## 🔴 必读：虚拟滚动 — 商品列表只渲染可见行

商品列表页使用虚拟滚动（Virtual Scrolling），**DOM 中只有当前视窗内的行**。

**错误做法**：直接 `querySelectorAll('.product-row')` 以为能获取所有商品

**正确做法**：滚动 + 分段采集

```python
# 在 Playwright 中：
page.evaluate("document.querySelector('.ecom-table-body')?.scrollBy(0, 500)")
time.sleep(0.2)  # 等新行渲染
# 然后提取
page.evaluate("""() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => {
        const t = r.innerText;
        const id = (t.match(/ID:(\\d{15,})/) || [])[1];
        const dt = (t.match(/(202\\d\\/\\d{2}\\/\\d{2})/) || [])[1];
        return { id, date: dt };
    }).filter(x => x.id);
}""")
```

已验证：15 次 scroll(500px) + 每次 200ms 延时，够采完当前页所有行。

---

## 🔴 翻页要点

```python
# 点击页码翻页（不依赖 URL 变化）
page.evaluate("""() => {
    const btn = [...document.querySelectorAll('li')]
        .find(li => li.innerText.trim() === '2'
            && li.className.includes('pagination-item'));
    if (btn) btn.click();
}""")
time.sleep(2)  # ⚠️ 等 2 秒！新页数据渲染需要时间
```

- 页码 li 必须用 `className.includes('pagination-item')` 过滤，否则会误匹配
- 每次翻页后等 2 秒再开始滚动

---

## 🔴 React 输入框：合成事件问题

抖店搜索框是 React 组件，监听合成事件，`value=` 直接赋值无效：

```python
# ❌ 这样 React 不会感知到
page.fill('input[placeholder*="商品名称"]', 'xxx')  # Playwright fill 会自动触发事件 ✅

# 如果 fill 无效，用 JS setter：
page.evaluate("""(value) => {
    const input = document.querySelector('input[placeholder*="商品名称"]');
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}""", "商品ID")
```

---

## 🔴 弹窗确认

弹窗里的按钮文本不是固定的，不同场景可能不同：

```python
# 先用 get_by_text 尝试
page.get_by_text("仍要下架").click()

# 如果失败，检查弹窗内容
modal_text = page.evaluate("document.querySelector('.ecom-modal-body')?.innerText")
# 从 modal_text 推测按钮文本
```

已知弹窗按钮文本：
- 下架确认：`仍要下架`
- 上架确认：`确认上架`

---

## 商品 ID 提取

```python
# 抖店商品 ID 是 15-19 位纯数字
import re
ids = re.findall(r'\d{15,}', page.evaluate("document.body.innerText"))
```

---

## 常用 CSS 选择器速查

| 用途 | 选择器 |
|------|--------|
| 搜索框 | `input[placeholder*="商品名称"]` |
| 查询按钮 | `button` 文本 `查询` |
| 批量下架 | `button` 文本 `批量下架` 或 `批量下架` |
| 确认下架 | `button` 文本 `仍要下架` |
| 全选框（表头） | `thead input[type=checkbox]` |
| 分页页码 | `li.pagination-item` |
| 商品总数 | 文本匹配 `/共 ?\d+ ?件商品/` |
| 虚拟滚动容器 | `.ecom-table-body` |

---

## 图片上传（目前无法自动化）

抖店商品图片上传使用 React 的 `<input type="file">`，Playwright `setInputFiles()` 可尝试，但在实际测试中可能被拦截。

**当前对策**：上传图片步骤手动完成，其余步骤自动化。

---

## Profile / 登录态保持

```python
# 使用 Chrome 用户数据目录保持登录态
browser = BrowserManager(
    user_data_dir="C:/Users/xxx/AppData/Local/Google/Chrome/User Data"
)
```

首次运行手动登录抖店后台，后续自动使用缓存的登录态。

---

## 页面加载等待

```python
# 打开后不要立刻操作
page.goto(url, wait_until="domcontentloaded")
time.sleep(2)  # 等 JS 渲染

# 如果内容没出来，截屏检查
page.screenshot(path="debug.png")
```

经验：`open` 后立刻截图 = 空白页，等 1-2 秒后再截图即有内容。
