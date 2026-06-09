"""批量上下架操作 — 抖店商品管理页"""

import time
from typing import List, Optional, Dict

from .browser import BrowserManager


class BatchOperator:
    """批量上下架操作"""

    BASE_URL = "https://fxg.jinritemai.com"
    PRODUCT_LIST_URL = BASE_URL + "/ffa/g/list?status=2"

    def __init__(self, browser: BrowserManager):
        self.browser = browser

    def search_products(self, product_ids: str) -> bool:
        """
        在搜索框输入商品ID并查询

        Args:
            product_ids: 逗号分隔的商品ID，如 "123,456,789"
        """
        # React 组件需用 setter 触发合成事件
        js_set_value = """(value) => {
            const input = document.querySelector('input[placeholder*="商品名称"]');
            if (!input) return false;
            const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;
            setter.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }"""
        self.browser.evaluate(js_set_value, product_ids)
        time.sleep(0.3)
        return True

    def click_search(self) -> bool:
        """点击查询按钮"""
        return self.browser.click_by_text("查询")

    def select_all(self) -> bool:
        """全选"""
        js = """() => {
            const cb = document.querySelector('thead input[type=checkbox]')
                || document.querySelector('.ecom-table-thead input[type=checkbox]')
                || document.querySelector('.ecom-checkbox-input');
            if (!cb) return false;
            cb.click();
            return true;
        }"""
        return self.browser.evaluate(js)

    def click_batch_action(self, action: str = "下架") -> bool:
        """点击批量下架/上架按钮"""
        label = "批量下架" if action == "下架" else "批量上架"
        return self.browser.click_by_text(label)

    def confirm_dialog(self, confirm_text: str = "仍要下架") -> bool:
        """确认弹窗"""
        time.sleep(0.5)
        js = f"""() => {{
            const btn = [...document.querySelectorAll('button')]
                .find(b => b.textContent.trim() === '{confirm_text}');
            if (btn) {{ btn.click(); return true; }}
            return false;
        }}"""
        clicked = self.browser.evaluate(js)
        if not clicked:
            modal_text = self.browser.evaluate(
                "() => document.querySelector('.ecom-modal-body')?.innerText || ''"
            )
            raise RuntimeError(f"找不到确认按钮「{confirm_text}」，弹窗内容: {modal_text}")
        return True

    def get_search_result_count(self) -> int:
        """获取搜索结果数量"""
        text = self.browser.get_text()
        import re
        m = re.search(r"共\s*(\d+)\s*件商品", text)
        return int(m.group(1)) if m else 0

    def batch_delist(self, product_ids: str) -> Dict:
        """
        一键批量下架（完整流程）

        Args:
            product_ids: 逗号分隔的商品ID

        Returns:
            操作结果
        """
        self.browser.navigate(self.PRODUCT_LIST_URL, wait_seconds=3)

        # 1. 搜索
        self.search_products(product_ids)
        self.click_search()
        time.sleep(2)

        # 2. 检查结果
        count = self.get_search_result_count()
        if count == 0:
            return {"success": False, "step": "search", "error": "未搜索到任何商品"}

        # 3. 全选
        if not self.select_all():
            return {"success": False, "step": "select_all", "error": "找不到全选框"}

        time.sleep(0.5)

        # 4. 点击批量下架
        if not self.click_batch_action("下架"):
            return {"success": False, "step": "delist_btn", "error": "找不到批量下架按钮"}

        # 5. 确认弹窗
        time.sleep(1)
        try:
            self.confirm_dialog("仍要下架")
        except RuntimeError as e:
            return {"success": False, "step": "confirm", "error": str(e)}

        return {"success": True, "count": count, "message": f"成功下架 {count} 件商品"}

    def wait_for_load(self, seconds: float = 2.0):
        """等待页面加载"""
        time.sleep(seconds)
