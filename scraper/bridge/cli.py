#!/usr/bin/env python3
"""
1688 选品铺货桥接 CLI

通过 1688-shopkeeper 选品并同步到 clawshop 后端。

Usage:
    # 配置
    python -m bridge.cli configure <AK>
    python -m bridge.cli check

    # 选品
    python -m bridge.cli search --query "夏季连衣裙" [--channel douyin] [--count 20]
    python -m bridge.cli detail --item-ids "991122553819,894138137003"
    python -m bridge.cli opportunities
    python -m bridge.cli trend --query "大码女装"

    # 铺货
    python -m bridge.cli shops
    python -m bridge.cli publish --shop-code CODE --data-id ID [--sync]

    # 日报
    python -m bridge.cli shop-daily

全局选项:
    --api-url <URL>     后端 API 地址（默认 http://localhost:3000）
    --no-local          不同步保存到本地
    --json              以 JSON 格式输出
"""

import sys
import os
import json
import argparse

# 确保能找到 alibaba 和 sync
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from alibaba import (
    check,
    configure,
    search,
    product_detail,
    shops,
    publish,
    opportunities,
    trend,
    shop_daily,
    has_shopkeeper,
    has_ak,
)
from sync import sync_search_results, sync_publish, sync_product_detail


def main():
    parser = argparse.ArgumentParser(
        description="1688 选品铺货桥接 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--api-url", default=None, help="后端 API 地址")
    parser.add_argument("--no-local", action="store_true", help="不同步保存到本地")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")

    sub = parser.add_subparsers(dest="command", required=True)

    # configure
    p = sub.add_parser("configure", help="配置 1688 AK")
    p.add_argument("ak", help="从 1688 AI 版 APP 获取的 AK")

    # check
    sub.add_parser("check", help="检查配置")

    # search
    p = sub.add_parser("search", help="搜索商品")
    p.add_argument("--query", "-q", required=True, help="搜索关键词")
    p.add_argument("--channel", default="douyin", choices=["douyin", "pdd", "xhs", "taobao"],
                   help="目标渠道（默认 douyin）")
    p.add_argument("--count", type=int, default=20, help="返回数量（默认 20）")
    p.add_argument("--sync", action="store_true", help="同步结果到后端")

    # detail
    p = sub.add_parser("detail", help="商品详情")
    p.add_argument("--item-ids", required=True, help="商品 ID，逗号分隔")
    p.add_argument("--sync", action="store_true", help="同步到后端")

    # shops
    sub.add_parser("shops", help="查询已绑定店铺")

    # publish
    p = sub.add_parser("publish", help="铺货")
    p.add_argument("--shop-code", required=True, help="店铺编码")
    p.add_argument("--data-id", required=True, help="商品数据 ID")
    p.add_argument("--sync", action="store_true", help="同步铺货结果到后端")

    # opportunities
    sub.add_parser("opportunities", help="商机热榜")

    # trend
    p = sub.add_parser("trend", help="趋势洞察")
    p.add_argument("--query", "-q", required=True, help="查询关键词")

    # shop-daily
    sub.add_parser("shop-daily", help="店铺经营日报")

    args = parser.parse_args()
    api_url = args.api_url or os.environ.get("API_URL", "http://localhost:3000")
    save_local = not args.no_local

    # ── 检查前置依赖 ──
    if args.command != "configure":
        if not has_shopkeeper():
            _error("1688-shopkeeper 未安装。请先：\n"
                   "  1. git clone https://github.com/next-1688/1688-shopkeeper.git\n"
                   "  2. 设置环境变量 ALI_1688_PATH 指向克隆目录\n"
                   "  3. 从 1688 AI 版 APP 获取 AK 并运行: python -m bridge.cli configure <AK>")
        if not has_ak():
            _error("ALI_1688_AK 未设置。请先运行: python -m bridge.cli configure <AK>")

    # ── 执行命令 ──
    result = None
    sync_result = None

    if args.command == "configure":
        result = configure(args.ak)

    elif args.command == "check":
        result = check()

    elif args.command == "search":
        result = search(args.query, args.channel, args.count)
        if result.get("success") and args.sync:
            items = result.get("data", result.get("items", []))
            sync_result = sync_search_results(items, api_url, save_local)

    elif args.command == "detail":
        result = product_detail(args.item_ids)
        if result.get("success") and args.sync:
            sync_result = sync_product_detail(args.item_ids, result, api_url, save_local)

    elif args.command == "shops":
        result = shops()

    elif args.command == "publish":
        result = publish(args.shop_code, args.data_id)
        if result.get("success") and args.sync:
            product = result.get("data", result.get("product", {}))
            sync_result = sync_publish(args.shop_code, product, api_url, save_local)

    elif args.command == "opportunities":
        result = opportunities()

    elif args.command == "trend":
        result = trend(args.query)

    elif args.command == "shop-daily":
        result = shop_daily()

    # ── 输出 ──
    output = {"command": args.command, "result": result}
    if sync_result:
        output["sync_result"] = sync_result

    if args.json:
        print(json.dumps(output, ensure_ascii=False, indent=2, default=str))
    else:
        _pretty_print(args.command, result, sync_result)


def _pretty_print(command: str, result: dict, sync_result: dict = None):
    """人类可读的输出"""
    if not result:
        print("无返回结果")
        return

    if not result.get("success"):
        print(f"\n❌ 失败: {result.get('error', '未知错误')}")
        return

    print(f"\n✅ {command} 成功")

    # 提取可读字段
    data = result.get("data") or result.get("raw") or result

    if isinstance(data, dict):
        # 搜索结果显示标题和价格
        if command == "search":
            items = data.get("items", data.get("results", []))
            print(f"  共找到 {len(items)} 个商品:\n")
            for i, item in enumerate(items[:10], 1):
                title = item.get("title", item.get("name", "?"))
                price = item.get("price", item.get("minPrice", "?"))
                sales = item.get("sales", item.get("monthSales", "?"))
                print(f"  {i}. {title}")
                print(f"     价格: {price} | 销量: {sales}")
                if item.get("itemId") or item.get("dataId"):
                    print(f"     ID: {item.get('itemId') or item.get('dataId')}")
                print()
            if len(items) > 10:
                print(f"  ... 还有 {len(items) - 10} 个商品\n")

        # 商机热榜
        elif command == "opportunities":
            items = data.get("opportunities", data.get("items", []))
            print(f"  共 {len(items)} 条商机:\n")
            for i, item in enumerate(items[:10], 1):
                print(f"  {i}. {item.get('title', item.get('name', '?'))}")
            print()

        # 铺货结果
        elif command == "publish":
            status = data.get("status", data.get("code", "?"))
            print(f"  铺货状态: {status}")
            if data.get("url"):
                print(f"  商品链接: {data['url']}")
            print()

        else:
            # 通用输出
            print(f"  {json.dumps(data, ensure_ascii=False, indent=2)}")

    elif isinstance(data, list):
        print(f"  共 {len(data)} 条记录:\n")
        for i, item in enumerate(data[:10], 1):
            title = item.get("title", item.get("name", item.get("shopName", f"记录 {i}")))
            print(f"  {i}. {title}")
        print()

    elif isinstance(data, str):
        print(f"  {data}\n")

    # 同步结果
    if sync_result:
        if sync_result.get("success"):
            print(f"  📤 同步到后端: ✅ 成功")
            if sync_result.get("local_backup"):
                print(f"  💾 本地备份: {sync_result['local_backup']}")
        else:
            print(f"  📤 同步到后端: ❌ {sync_result.get('error', '失败')}")
        print()


def _error(msg: str):
    print(f"\n❌ {msg}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
