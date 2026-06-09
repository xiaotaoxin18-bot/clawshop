"""全量商品采集 — 抖店商品管理页虚拟滚动分页采集"""

import re
import time
from typing import List, Dict, Optional

from .browser import BrowserManager


class ProductCollector:
    """商品采集器"""

    BASE_URL = "https://fxg.jinritemai.com"
    SALE_URL = BASE_URL + "/ffa/g/list?status=2"
    REJECTED_URL = BASE_URL + "/ffa/g/list?sov_draft_status=3"

    def __init__(self, browser: BrowserManager):
        self.browser = browser

    def get_total_count(self) -> int:
        """获取商品总数"""
        text = self.browser.get_text()
        m = re.search(r"共\s*(\d+)\s*件商品", text)
        return int(m.group(1)) if m else -1

    def get_total_pages(self, page_size: int = 20) -> int:
        """估算总页数"""
        total = self.get_total_count()
        if total <= 0:
            return 0
        return (total + page_size - 1) // page_size

    def collect_page(self) -> Dict[str, Dict]:
        """
        采集当前页所有商品（滚动 + 提取）

        Returns:
            {商品ID: {date: 上架日期, name: 商品名片段}}
        """
        products = {}

        def extract():
            """从当前 DOM 提取商品信息"""
            rows = self.browser.evaluate("""() => {
                return Array.from(document.querySelectorAll('table tbody tr')).map(r => {
                    const t = r.innerText;
                    const id = (t.match(/ID:(\\d{15,})/) || [])[1];
                    const dt = (t.match(/(202\\d\\/\\d{2}\\/\\d{2})/) || [])[1];
                    // 商品名在第 2 个 td（商品信息列），取第一行（去掉规格行）
                    const name = (() => {
                        const c = r.querySelectorAll('td');
                        return c.length >= 2 ? c[1].innerText.trim().split('\\n')[0].trim() : '';
                    })();
                    // 售价在第 3 个 td，销量在第 4 个 td，库存可能在后续 td
                    const cells = r.querySelectorAll('td');
                    const priceText = cells.length >= 3 ? cells[2].innerText.trim() : '';
                    const saleText = cells.length >= 4 ? cells[3].innerText.trim() : '';
                    // 尝试从各行提取库存数字
                    const stockText = cells.length >= 5 ? cells[4].innerText.trim() : '';
                    const catText = cells.length >= 6 ? cells[5].innerText.trim() : '';
                    // 取价格中的数字（如有区间取最低价）
                    const priceMatch = priceText.match(/(\\d+\\.?\\d*)/);
                    const saleMatch = saleText.match(/(\\d+)/);
                    const stockMatch = stockText.match(/(\\d+)/);
                    const salePrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
                    const salesCount = saleMatch ? parseInt(saleMatch[1]) : 0;
                    const stock = stockMatch ? parseInt(stockMatch[1]) : 0;
                    // 商品图片：从第 2 个 td 里找 img 标签
                    const imgEl = cells.length >= 2 ? cells[1].querySelector('img') : null;
                    const imageUrl = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';
                    // 分类：取不含ID、日期的中文文本
                    const category = catText.replace(/ID:\\d+/g, '').replace(/202\\d\\/\\d{2}\\/\\d{2}/g, '').trim();
                    return { id, date: dt, name, salePrice, salesCount, stock, category };
                }).filter(x => x.id);
            }""")
            for item in rows:
                if item["id"]:
                    products[item["id"]] = {
                        "date": item.get("date", ""),
                        "name": item.get("name", ""),
                        "salePrice": item.get("salePrice", 0),
                        "salesCount": item.get("salesCount", 0),
                        "stock": item.get("stock", 0),
                        "category": item.get("category", ""),
                        "imageUrl": item.get("imageUrl", ""),
                    }

        # 先滚到底部确保懒加载
        self.browser.evaluate("document.querySelector('.ecom-table-body')?.scrollTo(0, 0)")
        time.sleep(0.3)

        for i in range(15):
            extract()
            self.browser.evaluate(
                "document.querySelector('.ecom-table-body')?.scrollBy(0, 500) "
                "|| document.scrollingElement?.scrollBy(0, 500)"
            )
            time.sleep(0.2)

        time.sleep(0.3)
        extract()  # 最后一次补充
        return products

    def go_to_page(self, page_num: int) -> bool:
        """翻到指定页码"""
        js = f"""() => {{
            const btn = [...document.querySelectorAll('li')]
                .find(li => li.innerText.trim() === '{page_num}'
                    && li.className.includes('pagination-item'));
            if (!btn) return false;
            btn.click();
            return true;
        }}"""
        result = self.browser.evaluate(js)
        if result:
            time.sleep(2)  # 等待页面切换渲染
        return result

    def collect_all(self) -> List[Dict]:
        """
        全量采集所有在售商品

        Returns:
            [{id, date, name}, ...]
        """
        all_products = {}
        page = 1

        while True:
            products = self.collect_page()
            all_products.update(products)
            print(f"  第{page}页采集完成，累计 {len(all_products)} 件")

            # 尝试翻下一页
            if not self.go_to_page(page + 1):
                break
            page += 1

        # 排序：按上架日期倒序
        result = [
            {
                "id": pid,
                "date": info["date"],
                "name": info["name"],
                "salePrice": info.get("salePrice", 0),
                "salesCount": info.get("salesCount", 0),
                "stock": info.get("stock", 0),
                "category": info.get("category", ""),
                "imageUrl": info.get("imageUrl", ""),
            }
            for pid, info in all_products.items()
        ]
        result.sort(key=lambda x: x["date"], reverse=True)
        return result

    def check_rejected(self) -> List[Dict]:
        """检查审核驳回商品"""
        self.browser.navigate(self.REJECTED_URL)
        count = self.get_total_count()

        if count <= 0:
            return []

        products = self.collect_all()
        return products

    def get_order_count(self) -> int:
        """获取今日订单数"""
        text = self.browser.get_text()
        patterns = [
            r"今日订单[：:]\s*(\d+)",
            r"今日[^。]{0,20}?(\d+)\s*单",
            r"全部[^。]{0,10}?(\d+)\s*单",
        ]
        for p in patterns:
            m = re.search(p, text)
            if m:
                return int(m.group(1))
        return -1

    def get_revenue_summary(self) -> Dict:
        """获取经营概览数据"""
        text = self.browser.get_text()
        return {
            "views": self._extract(text, [r"浏览量[：:]?\s*([\d,.]+)", r"浏览[：:]?\s*([\d,.]+)"]),
            "visitors": self._extract(text, [r"访客[数]?[：:]?\s*([\d,.]+)"]),
            "order_count": self._extract(text, [r"订单数[：:]?\s*([\d,.]+)", r"成交[：:]?\s*([\d,.]+)"]),
            "revenue": self._extract(text, [r"成交金额[：:]?\s*([\d,.]+)", r"销售额[：:]?\s*([\d,.]+)"]),
            "conversion_rate": self._extract(text, [r"转化率[：:]?\s*([\d.]+%)"]),
        }

    @staticmethod
    def _extract(text: str, patterns: List[str]) -> Optional[str]:
        for p in patterns:
            m = re.search(p, text)
            if m:
                return m.group(1)
        return None
