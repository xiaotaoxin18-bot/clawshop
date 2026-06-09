"""工具函数 — 价格解析、日期处理、Bitable 对比、日报生成"""

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
    """将日期字符串转为毫秒时间戳"""
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
    """从文本中提取商品ID（15位以上数字）"""
    m = re.search(r'(\d{15,})', text)
    return m.group(1) if m else None


def compare_with_bitable(
    collected: List[Dict[str, str]],
    bitable_records: List[Dict[str, str]]
) -> Dict[str, List]:
    """
    对比全量采集结果与 Bitable 商品库，找出差异。

    Returns:
        {newly_listed, newly_delisted, date_mismatch, in_sync}
    """
    collected_ids = {p['id']: p for p in collected}
    bitable_by_id = {r.get('抖音商品ID', ''): r for r in bitable_records if r.get('抖音商品ID')}

    result = {
        'newly_listed': [],
        'newly_delisted': [],
        'date_mismatch': [],
        'in_sync': [],
    }

    for pid, info in collected_ids.items():
        if pid in bitable_by_id:
            record = bitable_by_id[pid]
            if record.get('候选状态') in ('已下架', '❌不符合标准', '❌铺货失败'):
                result['newly_listed'].append(info)
            else:
                result['in_sync'].append(info)
        else:
            result['newly_listed'].append(info)

    for pid, record in bitable_by_id.items():
        if pid not in collected_ids and record.get('候选状态') in ('已上架', '已出单'):
            result['newly_delisted'].append(record)

    return result


def format_daily_report(
    product_count: int,
    order_count: int,
    rejected_count: int,
    candidate_count: int = 0,
    extra: Optional[Dict] = None
) -> str:
    """格式化每日巡检日报"""
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
        for k, v in extra.items():
            if v:
                labels = {'views': '浏览量', 'visitors': '访客数', 'revenue': '成交金额', 'conversion_rate': '转化率'}
                lines.append(f'- {labels.get(k, k)}: {v}')
        lines.append('')

    lines.append('[!] 需要确认的事项')
    has_issues = False
    if rejected_count > 0:
        lines.append(f'- [!] 有 {rejected_count} 个商品审核驳回，需查看原因并修改')
        has_issues = True
    if candidate_count > 5:
        lines.append(f'- [!] 候选库积压 {candidate_count} 个待评估')
        has_issues = True
    if product_count == 0:
        lines.append('- [!] 在售商品为 0，请检查店铺状态')
        has_issues = True
    if not has_issues:
        lines.append('- [OK] 无异常事项')

    return '\n'.join(lines)


def calculate_margin(
    selling_price: float,
    purchase_price: float,
    shipping_cost: float = 0,
    platform_fee_rate: float = 0.035
) -> Dict[str, float]:
    """计算商品毛利"""
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
