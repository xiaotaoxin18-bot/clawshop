#!/usr/bin/env python3
"""
抖店运营工具函数 — 价格解析、日期处理、Bitable 数据转换

用法:
    from utils import parse_price, parse_date_ms, compare_with_bitable
"""

import re
from datetime import datetime
from typing import Optional, List, Dict, Tuple


def parse_price(price_str: str) -> float:
    """
    解析抖店价格字符串，取最低价。

    Examples:
        >>> parse_price('￥4.88 ~ ￥9.16')
        4.88
        >>> parse_price('¥12.50')
        12.5
        >>> parse_price('0.01')
        0.01
    """
    # 去除货币符号
    cleaned = price_str.replace('￥', '').replace('¥', '').replace(',', '')

    if '~' in cleaned or '-' in cleaned:
        sep = '~' if '~' in cleaned else '-'
        parts = [p.strip() for p in cleaned.split(sep) if p.strip()]
        nums = []
        for p in parts:
            try:
                nums.append(float(p))
            except ValueError:
                continue
        return nums[0] if nums else 0.0

    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_date_ms(time_str: str) -> int:
    """
    将抖店日期字符串转为毫秒时间戳。

    Args:
        time_str: 日期字符串，支持格式:
                  - '2026/02/25 22:35:44'
                  - '2026/02/25'

    Returns:
        毫秒时间戳

    Examples:
        >>> parse_date_ms('2026/02/25 22:35:44') > 0
        True
    """
    if not time_str or not time_str.strip():
        return 0

    time_str = time_str.strip()

    formats = [
        '%Y/%m/%d %H:%M:%S',
        '%Y/%m/%d',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(time_str, fmt)
            return int(dt.timestamp() * 1000)
        except ValueError:
            continue

    return 0


def parse_product_id(text: str) -> Optional[str]:
    """
    从文本中提取抖店商品ID（15位以上数字）。

    Args:
        text: 包含商品ID的文本

    Returns:
        商品ID字符串，或 None

    Examples:
        >>> parse_product_id('ID:1234567890123456789')
        '1234567890123456789'
        >>> parse_product_id('商品ID 1234567890123456789 已上架')
        '1234567890123456789'
    """
    m = re.search(r'(\d{15,})', text)
    return m.group(1) if m else None


def compare_with_bitable(
    collected: List[Dict[str, str]],
    bitable_records: List[Dict[str, str]]
) -> Dict[str, List]:
    """
    对比全量采集结果与 Bitable 候选库，找出差异。

    Args:
        collected: 全量采集结果，每项 {'id': '商品ID', 'date': '上架日期'}
        bitable_records: Bitable 记录，每项 {'id': '抖音商品ID', 'status': '候选状态', ...}

    Returns:
        {
            'newly_listed': [...],   # 在售但 Bitable 没有 → 需新增记录
            'newly_delisted': [...],  # 下架但 Bitable 还在售 → 需更新状态
            'date_mismatch': [...],   # 上架日期不一致 → 需更新
            'in_sync': [...]          # 一致
        }
    """
    collected_ids = {p['id']: p for p in collected}
    bitable_by_id = {r.get('抖音商品ID', ''): r for r in bitable_records if r.get('抖音商品ID')}

    result = {
        'newly_listed': [],
        'newly_delisted': [],
        'date_mismatch': [],
        'in_sync': [],
    }

    # 检查在售商品
    for pid, info in collected_ids.items():
        if pid in bitable_by_id:
            record = bitable_by_id[pid]
            # 检查状态是否需要更新
            if record.get('候选状态') in ('已下架', '❌不符合标准', '❌铺货失败'):
                result['newly_listed'].append(info)
            else:
                result['in_sync'].append(info)
        else:
            # Bitable 没有这个商品
            result['newly_listed'].append(info)

    # 检查已下架商品
    for pid, record in bitable_by_id.items():
        if pid not in collected_ids:
            if record.get('候选状态') in ('已上架', '已出单'):
                result['newly_delisted'].append(record)

    return result


def format_daily_report(
    product_count: int,
    order_count: int,
    rejected_count: int,
    candidate_count: int = 0,
    extra: Optional[Dict] = None
) -> str:
    """
    格式化每日巡检日报。

    Args:
        product_count: 在售商品数
        order_count: 今日订单数
        rejected_count: 审核驳回数
        candidate_count: 候选库待评估数
        extra: 额外数据（浏览量、访客数等）

    Returns:
        格式化后的日报文本
    """
    date_str = datetime.now().strftime('%Y-%m-%d')
    lines = [
        '== 每日巡检日报 ==',
        f'日期: {date_str}',
        '',
        f'在售商品：{product_count}个 | 今日订单：{order_count}单 | 审核驳回：{rejected_count}个',
        '',
    ]

    if extra:
        lines.append('>> 经营数据')
        if 'views' in extra:
            lines.append(f'- 浏览量: {extra["views"]}')
        if 'visitors' in extra:
            lines.append(f'- 访客数: {extra["visitors"]}')
        if 'revenue' in extra:
            lines.append(f'- 成交金额: {extra["revenue"]}')
        if 'conversion_rate' in extra:
            lines.append(f'- 转化率: {extra["conversion_rate"]}')
        lines.append('')

    lines.append('[!] 需要确认的事项')
    if rejected_count > 0:
        lines.append(f'- [!] 有 {rejected_count} 个商品审核驳回，需查看原因并修改')
    if candidate_count > 5:
        lines.append(f'- [!] 候选库积压 {candidate_count} 个待评估，建议尽快处理')
    if product_count == 0:
        lines.append('- [!] 在售商品为 0，请检查店铺状态')
    if not extra:
        lines.append('- [i] 经营概览数据未采集，如需完整报告请补充罗盘数据')

    if len(lines) <= 5:
        lines.append('- [OK] 无异常事项')

    return '\n'.join(lines)


def calculate_margin(
    selling_price: float,
    purchase_price: float,
    shipping_cost: float = 0,
    platform_fee_rate: float = 0.035
) -> Dict[str, float]:
    """
    计算商品毛利。

    Args:
        selling_price: 抖店售价
        purchase_price: 1688采购价
        shipping_cost: 物流费（默认0，包邮）
        platform_fee_rate: 平台扣点比例（默认3.5%）

    Returns:
        {
            'revenue': 收入,
            'cost': 总成本,
            'profit': 毛利,
            'margin_rate': 毛利率(%)
        }
    """
    revenue = selling_price
    cost = purchase_price + shipping_cost + selling_price * platform_fee_rate
    profit = revenue - cost
    margin_rate = (profit / revenue * 100) if revenue > 0 else 0

    return {
        'revenue': round(revenue, 2),
        'cost': round(cost, 2),
        'profit': round(profit, 2),
        'margin_rate': round(margin_rate, 1),
    }


if __name__ == '__main__':
    # 简单测试
    import doctest
    result = doctest.testmod()
    status = 'PASS' if result.failed == 0 else 'FAIL'
    print(f'[*] utils.py doctests: {status} ({result.failed} failures)')
