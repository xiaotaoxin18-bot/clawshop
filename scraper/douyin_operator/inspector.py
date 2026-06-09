"""每日巡检 — 抖店运营日报数据采集"""

import re
import time
from datetime import datetime
from typing import Optional, Dict, List

from .browser import BrowserManager
from .collector import ProductCollector


class DailyInspector:
    """每日巡检"""

    BASE_URL = "https://fxg.jinritemai.com"
    ORDER_URL = BASE_URL + "/ffa/morder/order/list"
    PRODUCT_URL = BASE_URL + "/ffa/g/list?status=2"
    REJECTED_URL = BASE_URL + "/ffa/g/list?sov_draft_status=3"
    COMPASS_URL = BASE_URL + "/ffa/mcompass/overview"
    COMMENT_URL = BASE_URL + "/ffa/g/comment"

    def __init__(self, browser: BrowserManager):
        self.browser = browser
        self.collector = ProductCollector(browser)

    def get_order_status_counts(self) -> Dict:
        """获取订单各状态数量"""
        self.browser.navigate(self.ORDER_URL)
        time.sleep(3)
        text = self.browser.get_text()
        result = {}
        patterns = [
            ("待发货", r"待发货[：:]?\s*(\d+)"),
            ("待处理", r"待处理[：:]?\s*(\d+)"),
            ("退款中", r"退款中[：:]?\s*(\d+)"),
            ("已完成", r"已完成[：:]?\s*(\d+)"),
        ]
        for key, pat in patterns:
            m = re.search(pat, text)
            if m:
                result[key] = int(m.group(1))
        return result

    def get_review_summary(self) -> Dict:
        """获取商品评价概览"""
        self.browser.navigate(self.COMMENT_URL)
        time.sleep(4)
        text = self.browser.get_text()
        result = {}
        patterns = [
            ("total_reviews", r"评价[数]?[：:]?\s*([\d,.]+)"),
            ("good_rate", r"好评率[：:]?\s*([\d.]+%)"),
            ("moderate_rate", r"中评率[：:]?\s*([\d.]+%)"),
            ("bad_rate", r"差评率[：:]?\s*([\d.]+%)"),
            ("avg_rating", r"评分[：:]?\s*([\d.]+)"),
        ]
        for key, pat in patterns:
            m = re.search(pat, text)
            if m:
                result[key] = m.group(1)
        return result

    def run(self, include_revenue: bool = False, include_reviews: bool = False) -> Dict:
        """
        执行完整巡检

        Args:
            include_revenue: 是否采集经营概览数据

        Returns:
            {product_count, order_count, rejected_count, revenue, ...}
        """
        result = {}

        # 1. 订单数
        print("[1/4] 检查订单数...")
        self.browser.navigate(self.ORDER_URL)
        result["order_count"] = self.collector.get_order_count()
        print(f"  -> 今日订单: {result['order_count']}")

        # 2. 在售商品数
        print("[2/4] 检查在售商品...")
        self.browser.navigate(self.PRODUCT_URL)
        result["product_count"] = self.collector.get_total_count()
        print(f"  -> 在售商品: {result['product_count']}")

        # 3. 审核驳回
        print("[3/4] 检查审核驳回...")
        self.browser.navigate(self.REJECTED_URL)
        result["rejected_count"] = self.collector.get_total_count()
        print(f"  -> 审核驳回: {result['rejected_count']}")

        # 4. 经营概览（可选）
        if include_revenue:
            print("[4/4] 采集经营概览...")
            self.browser.navigate(self.COMPASS_URL)
            result["revenue"] = self.collector.get_revenue_summary()
            print(f"  -> 经营数据已采集")
        else:
            result["revenue"] = None

        return result

    def generate_report(self, data: Dict, candidate_count: int = 0) -> str:
        """
        生成日报文本

        Args:
            data: run() 返回的巡检数据
            candidate_count: 候选库待评估数量

        Returns:
            格式化日报
        """
        date_str = datetime.now().strftime("%Y-%m-%d")
        pc = data.get("product_count", "?")
        oc = data.get("order_count", "?")
        rc = data.get("rejected_count", "?")

        lines = [
            "== 每日巡检日报 ==",
            f"日期: {date_str}",
            "",
            f"在售商品：{pc}个 | 今日订单：{oc}单 | 审核驳回：{rc}个",
            "",
        ]

        rev = data.get("revenue")
        if rev and any(rev.values()):
            lines.append(">> 经营数据")
            if rev.get("views"):
                lines.append(f"- 浏览量: {rev['views']}")
            if rev.get("visitors"):
                lines.append(f"- 访客数: {rev['visitors']}")
            if rev.get("revenue"):
                lines.append(f"- 成交金额: {rev['revenue']}")
            if rev.get("conversion_rate"):
                lines.append(f"- 转化率: {rev['conversion_rate']}")
            lines.append("")

        # 待确认事项
        lines.append("[!] 需要确认的事项")
        has_issues = False

        if isinstance(rc, int) and rc > 0:
            lines.append(f"- [!] 有 {rc} 个商品审核驳回，需查看原因并修改")
            has_issues = True
        if candidate_count > 5:
            lines.append(f"- [!] 候选库积压 {candidate_count} 个待评估")
            has_issues = True
        if isinstance(pc, int) and pc == 0:
            lines.append("- [!] 在售商品为 0，请检查店铺状态")
            has_issues = True
        if isinstance(oc, int) and oc == 0:
            lines.append("- 今日暂无新订单")
        if not has_issues:
            lines.append("- [OK] 无异常事项")

        return "\n".join(lines)
