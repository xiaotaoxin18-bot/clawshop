"""
1688-shopkeeper CLI 封装

通过 subprocess 调用 1688-shopkeeper 的 CLI 命令，
解析 JSON 输出，返回结构化数据。
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
from typing import Optional


# ── 路径查找 ──────────────────────────────────────────────

def find_shopkeeper() -> Optional[str]:
    """查找 1688-shopkeeper 的 cli.py 路径"""
    # 1. 环境变量 ALI_1688_PATH
    env_path = os.environ.get("ALI_1688_PATH")
    if env_path:
        candidate = os.path.join(env_path, "cli.py")
        if os.path.isfile(candidate):
            return candidate

    # 2. 同级目录 ../1688-shopkeeper/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # scraper/
    candidate = os.path.join(project_root, "..", "1688-shopkeeper", "cli.py")
    if os.path.isfile(candidate):
        return os.path.abspath(candidate)

    # 3. 当前目录下的 1688-shopkeeper/
    candidate = os.path.join(os.getcwd(), "1688-shopkeeper", "cli.py")
    if os.path.isfile(candidate):
        return os.path.abspath(candidate)

    # 4. PATH 中查找
    candidate = shutil.which("1688-shopkeeper")
    if candidate:
        return candidate

    return None


def _ak() -> Optional[str]:
    """获取 1688 AK"""
    return os.environ.get("ALI_1688_AK")


def _run_command(args: list[str], timeout: int = 120) -> dict:
    """运行 1688-shopkeeper CLI 命令，返回解析后的 JSON"""
    cli_path = find_shopkeeper()
    if not cli_path:
        return {
            "success": False,
            "error": "1688-shopkeeper 未安装。请先 git clone https://github.com/next-1688/1688-shopkeeper.git "
                     "并设置 ALI_1688_PATH 环境变量指向其目录。",
        }

    cmd = [sys.executable, cli_path] + args
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if result.returncode != 0:
            return {
                "success": False,
                "error": stderr or f"命令退出码: {result.returncode}",
                "cmd": " ".join(cmd),
            }

        # 尝试解析 JSON
        if stdout:
            try:
                data = json.loads(stdout)
                if isinstance(data, dict):
                    data["success"] = True
                    return data
                else:
                    return {"success": True, "data": data}
            except json.JSONDecodeError:
                return {"success": True, "raw": stdout}
        else:
            return {"success": True, "data": None}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"命令超时 ({timeout}s)"}
    except FileNotFoundError:
        return {"success": False, "error": f"找不到 Python 解释器: {sys.executable}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 公开 API ──────────────────────────────────────────────


def check() -> dict:
    """检查配置是否正常"""
    ak = _ak()
    if not ak:
        return {
            "success": False,
            "error": "ALI_1688_AK 未设置。请从 1688 AI 版 APP 获取 AK 并设置环境变量。",
        }
    return _run_command(["check"])


def configure(ak: str) -> dict:
    """配置 AK"""
    return _run_command(["configure", ak])


def search(query: str, channel: str = "douyin", count: int = 20) -> dict:
    """搜索商品

    Args:
        query: 搜索关键词
        channel: 目标渠道 (douyin/pdd/xhs/taobao)
        count: 返回结果数量
    """
    return _run_command([
        "search",
        "--query", query,
        "--channel", channel,
        "--count", str(count),
    ])


def product_detail(item_ids: str) -> dict:
    """获取商品详情

    Args:
        item_ids: 商品 ID，多个用逗号分隔
    """
    return _run_command(["prod_detail", "--item-ids", item_ids])


def shops() -> dict:
    """查询已绑定的店铺列表"""
    return _run_command(["shops"])


def publish(shop_code: str, data_id: str) -> dict:
    """铺货到指定店铺

    Args:
        shop_code: 店铺编码
        data_id: 商品数据 ID
    """
    return _run_command(["publish", "--shop-code", shop_code, "--data-id", data_id])


def opportunities() -> dict:
    """获取商机热榜"""
    return _run_command(["opportunities"])


def trend(query: str) -> dict:
    """趋势洞察

    Args:
        query: 查询关键词
    """
    return _run_command(["trend", "--query", query])


def shop_daily() -> dict:
    """店铺经营日报"""
    return _run_command(["shop_daily"])


# ── 快捷检查 ──────────────────────────────────────────────

def has_shopkeeper() -> bool:
    """检查 1688-shopkeeper 是否可用"""
    return find_shopkeeper() is not None


def has_ak() -> bool:
    """检查 AK 是否已配置"""
    return bool(_ak())
