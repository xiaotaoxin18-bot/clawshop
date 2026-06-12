"""
铺货结果同步到 clawshop 后端

将 1688 选品/铺货结果 POST 到 backend API，
同时支持本地 JSON 文件备份。
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_DIR, "bridge_data")
os.makedirs(DATA_DIR, exist_ok=True)


def _default_api_url() -> str:
    """默认后端 API 地址"""
    return os.environ.get("API_URL", "http://localhost:3000")


def _save_local(filename: str, data: dict):
    """保存数据到本地 JSON 文件（备份）"""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    return filepath


def _post(api_url: str, endpoint: str, data: dict) -> dict:
    """POST 到后端 API"""
    url = f"{api_url.rstrip('/')}/api/alibaba/{endpoint.lstrip('/')}"
    try:
        resp = requests.post(url, json=data, timeout=30)
        resp.raise_for_status()
        return {"success": True, "status_code": resp.status_code, "response": resp.json()}
    except requests.Timeout:
        return {"success": False, "error": f"请求超时: {url}"}
    except requests.ConnectionError:
        return {"success": False, "error": f"无法连接后端: {api_url}"}
    except requests.RequestException as e:
        return {"success": False, "error": str(e)}


# ── 公开 API ──────────────────────────────────────────────


def sync_search_results(
    results: list[dict],
    api_url: Optional[str] = None,
    save_local: bool = True,
) -> dict:
    """同步搜索结果到后端

    Args:
        results: 搜索返回的商品列表
        api_url: 后端 API 地址，默认 http://localhost:3000
        save_local: 是否同时保存到本地 JSON

    Returns:
        dict: 同步结果
    """
    api_url = api_url or _default_api_url()

    payload = {
        "source": "1688",
        "items": results,
        "synced_at": datetime.now().isoformat(),
    }

    if save_local:
        filename = f"search_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        local_path = _save_local(filename, payload)
    else:
        local_path = None

    result = _post(api_url, "search/sync", payload)

    if local_path:
        result["local_backup"] = local_path

    return result


def sync_publish(
    shop_code: str,
    product_data: dict,
    api_url: Optional[str] = None,
    save_local: bool = True,
) -> dict:
    """同步铺货结果到后端（自动入库）

    Args:
        shop_code: 店铺编码
        product_data: 商品数据 (name, douyin_product_id, sale_price, ...)
        api_url: 后端 API 地址
        save_local: 是否同时保存到本地 JSON

    Returns:
        dict: 同步结果
    """
    api_url = api_url or _default_api_url()

    payload = {
        "source": "1688",
        "shop_code": shop_code,
        "product": product_data,
        "synced_at": datetime.now().isoformat(),
    }

    if save_local:
        filename = f"publish_{shop_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        local_path = _save_local(filename, payload)
    else:
        local_path = None

    result = _post(api_url, "publish-callback", payload)

    if local_path:
        result["local_backup"] = local_path

    return result


def sync_product_detail(
    item_ids: str,
    detail_data: dict,
    api_url: Optional[str] = None,
    save_local: bool = True,
) -> dict:
    """同步商品详情到后端

    Args:
        item_ids: 商品 ID
        detail_data: 商品详情数据
        api_url: 后端 API 地址
        save_local: 是否保存到本地
    """
    api_url = api_url or _default_api_url()

    payload = {
        "source": "1688",
        "item_ids": item_ids,
        "detail": detail_data,
        "synced_at": datetime.now().isoformat(),
    }

    if save_local:
        filename = f"detail_{item_ids[:20]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        local_path = _save_local(filename, payload)
    else:
        local_path = None

    result = _post(api_url, "product-detail/sync", payload)

    if local_path:
        result["local_backup"] = local_path

    return result
