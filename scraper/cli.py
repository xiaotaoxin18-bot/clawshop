#!/usr/bin/env python3
"""
抖店运营 CLI — 商品采集、批量操作、每日巡检

Usage:
    python cli.py collect                       全量采集在售商品
    python cli.py delist <商品ID1,商品ID2,...>   批量下架商品
    python cli.py inspect [--with-revenue]      每日巡检
    python cli.py check-rejected                检查审核驳回
    python cli.py daily-push --api-url <URL>    采集+巡检+推送后端

全局选项:
    --headless     无头模式运行
    --chrome       使用系统 Chrome
    --edge         使用系统 Edge（推荐）
    --api-url <URL> 后端 API 地址（daily-push 必需）

环境变量:
    BROWSER_CHANNEL    chrome 或 msedge（默认 msedge）
"""

import sys
import os
import json
import time
import re
from datetime import datetime

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)
PROFILE_DIR = os.path.join(PROJECT_DIR, "edge_profile")
COOKIES_FILE = os.path.join(PROJECT_DIR, "cookies.json")


def _cookie_file(shop_id=None):
    """获取店铺对应的 cookie 文件路径"""
    if shop_id:
        return os.path.join(PROJECT_DIR, f"cookies_{shop_id}.json")
    return COOKIES_FILE


def _products_file(shop_id=None, suffix=""):
    """获取店铺对应的商品数据文件路径"""
    base = f"products{suffix}" if suffix else "products"
    if shop_id:
        return os.path.join(PROJECT_DIR, f"{base}_{shop_id}.json")
    return os.path.join(PROJECT_DIR, f"{base}.json")


def ensure_playwright():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[!] Playwright 未安装，正在安装...")
        os.system(f"{sys.executable} -m pip install playwright -q")
        print("[OK] Playwright 安装完成")


def _load_env():
    """读取 .env 文件中的环境变量（补充到系统环境变量中）"""
    env_file = os.path.join(PROJECT_DIR, "..", "backend", ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, val = line.partition("=")
                    key = key.strip().replace("set ", "", 1)
                    val = val.strip().strip('"').strip("'")
                    if key and val:
                        os.environ.setdefault(key, val)


def _parse_flags(args):
    flags = {
        "headless": "--headless" in args,
        "chrome": "--chrome" in args,
        "edge": "--edge" in args,
        "api_url": None,
        "shop_id": None,
    }
    remaining = []
    i = 0
    while i < len(args):
        if args[i] == "--api-url" and i + 1 < len(args):
            flags["api_url"] = args[i + 1]
            i += 2
        elif args[i] == "--shop-id" and i + 1 < len(args):
            flags["shop_id"] = args[i + 1]
            i += 2
        elif args[i].startswith("--"):
            i += 1
        else:
            remaining.append(args[i])
            i += 1
    return flags, remaining


def _get_channel(flags):
    if flags.get("chrome"):
        return "chrome"
    if flags.get("edge"):
        return "msedge"
    return os.environ.get("BROWSER_CHANNEL") or "msedge"


def _load_cookies(context, shop_id=None):
    """从 cookie 文件恢复登录态"""
    cookie_file = _cookie_file(shop_id)
    if os.path.exists(cookie_file):
        try:
            with open(cookie_file, "r", encoding="utf-8") as f:
                cookies = json.load(f)
            if cookies:
                context.add_cookies(cookies)
                shop_tag = f" [{shop_id}]" if shop_id else ""
                print(f"[cookie]{shop_tag} 已恢复 {len(cookies)} 个 cookie")
        except Exception as e:
            print(f"[cookie] 恢复失败: {e}")
    elif shop_id:
        print(f"[cookie] 店铺 {shop_id} 无 cookie 文件，需要扫码登录")


def _save_cookies(context, shop_id=None):
    """保存登录态到 cookie 文件"""
    try:
        cookies = context.cookies()
        cookie_file = _cookie_file(shop_id)
        with open(cookie_file, "w", encoding="utf-8") as f:
            json.dump(cookies, f, ensure_ascii=False, indent=2)
        shop_tag = f" [{shop_id}]" if shop_id else ""
        print(f"[cookie]{shop_tag} 已保存 {len(cookies)} 个 cookie")
    except Exception as e:
        print(f"[cookie] 保存失败: {e}")


def _run_browser(flags, callback):
    """启动带 profile 的浏览器执行操作，完成后保持打开"""
    from playwright.sync_api import sync_playwright

    channel = _get_channel(flags)
    pw = sync_playwright().start()
    os.makedirs(PROFILE_DIR, exist_ok=True)

    shop_id = flags.get("shop_id")
    context = pw.chromium.launch_persistent_context(
        PROFILE_DIR,
        channel=channel,
        headless=flags.get("headless", False),
        viewport={"width": 1280, "height": 800},
        args=["--no-proxy-server"],  # 禁用系统代理，防止 ERR_PROXY_CONNECTION_FAILED
    )
    _load_cookies(context, shop_id=shop_id)
    page = context.pages[0] if context.pages else context.new_page()
    page.bring_to_front()
    return callback(page, context, pw)


def _ensure_login(page, shop_id=None):
    """检测登录页，等待用户扫码登录"""
    try:
        page.wait_for_load_state('load', timeout=15000)
    except Exception:
        pass
    time.sleep(1)

    try:
        page.wait_for_function(
            "() => document.body && document.body.innerText.length > 100",
            timeout=10000,
        )
    except Exception:
        pass

    try:
        text = page.evaluate("document.body.innerText")
    except Exception:
        time.sleep(2)
        text = page.evaluate("document.body.innerText")
    if "发送验证码" in text[:300]:
        shop_tag = f" [{shop_id}]" if shop_id else ""
        print(f"=== 请扫码登录抖店{shop_tag}（浏览器窗口已打开） ===")
        page.wait_for_function(
            "() => !document.body.innerText.includes('发送验证码') && document.body.innerText.length > 800",
            timeout=600000,
        )
        time.sleep(3)
        print("[OK] 登录成功！")
    _save_cookies(page.context, shop_id=shop_id)


def cmd_collect(flags):
    """全量采集在售商品"""
    from douyin_operator.collector import ProductCollector

    def cb(page, ctx, pw):
        page.goto("https://fxg.jinritemai.com/ffa/g/list?status=2")
        page.wait_for_load_state('load', timeout=15000)
        _ensure_login(page)

        class FakeBM:
            def __init__(self, p):
                self.page = p
            def get_text(self):
                return self.page.evaluate("document.body.innerText")
            def evaluate(self, js, *a):
                return self.page.evaluate(js) if not a else self.page.evaluate(js, a[0])
            def navigate(self, url, wait_seconds=2):
                self.page.goto(url)
                time.sleep(wait_seconds)

        collector = ProductCollector(FakeBM(page))
        m = re.search(r"共\s*(\d+)\s*件商品", page.evaluate("document.body.innerText"))
        total = int(m.group(1)) if m else 0
        print(f"在售商品: {total}")

        if total > 0:
            products = collector.collect_all()
            with open("products.json", "w", encoding="utf-8") as f:
                json.dump(products, f, ensure_ascii=False, indent=2)
            print(f"采集完成: {len(products)} 件 → products.json")
            for p in products[:5]:
                print(f"  {p['id']}  {p['date']}")

        print("\n[OK] 完成！浏览器保持打开，可手动关掉")

    _run_browser(flags, cb)


def cmd_inspect(flags):
    """每日巡检"""
    def cb(page, ctx, pw):
        print("=== 1/3 今日订单 ===")
        page.goto("https://fxg.jinritemai.com/ffa/morder/order/list")
        _ensure_login(page)
        text = page.evaluate("document.body.innerText")
        o = re.search(r"今日订单[：:]\s*(\d+)", text)
        print(f"今日订单: {o.group(1) if o else '?'}")

        print("=== 2/3 在售商品 ===")
        page.goto("https://fxg.jinritemai.com/ffa/g/list?status=2")
        time.sleep(3)
        text = page.evaluate("document.body.innerText")
        p = re.search(r"共\s*(\d+)\s*件商品", text)
        print(f"在售商品: {p.group(1) if p else '?'}")

        print("=== 3/3 审核驳回 ===")
        page.goto("https://fxg.jinritemai.com/ffa/g/list?sov_draft_status=3")
        time.sleep(3)
        text = page.evaluate("document.body.innerText")
        r = re.search(r"共\s*(\d+)\s*件商品", text)
        print(f"审核驳回: {r.group(1) if r else 0}")

        print()
        print("=" * 50)
        print(f"== 每日巡检日报 ==")
        print(f"日期: {datetime.now().strftime('%Y-%m-%d')}")
        print()
        print(f"在售商品：{p.group(1) if p else '?'}个 | 今日订单：{o.group(1) if o else '?'}单 | 审核驳回：{r.group(1) if r else 0}个")
        print("=" * 50)
        print("\n[OK] 巡检完成，浏览器保持打开")

    _run_browser(flags, cb)


def cmd_delist(flags, ids):
    """批量下架"""
    def cb(page, ctx, pw):
        page.goto("https://fxg.jinritemai.com/ffa/g/list?status=2")
        page.wait_for_load_state('load', timeout=15000)
        _ensure_login(page)

        page.evaluate("""(value) => {
            const input = document.querySelector('input[placeholder*="商品名称"]');
            if (!input) return;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, value);
            input.dispatchEvent(new Event('input', {bubbles:true}));
            input.dispatchEvent(new Event('change', {bubbles:true}));
        }""", ids)
        time.sleep(0.3)
        page.get_by_text("查询").first.click()
        time.sleep(2)

        page.evaluate("document.querySelector('thead input[type=checkbox]')?.click()")
        time.sleep(0.5)

        page.get_by_text("批量下架").first.click()
        time.sleep(1)

        page.evaluate("""[...document.querySelectorAll('button')].find(b => b.textContent.trim() === '仍要下架')?.click()""")

        print(f"[OK] 批量下架完成 ({ids})，浏览器保持打开")

    _run_browser(flags, cb)


def cmd_check_rejected(flags):
    """检查审核驳回"""
    def cb(page, ctx, pw):
        page.goto("https://fxg.jinritemai.com/ffa/g/list?sov_draft_status=3")
        _ensure_login(page)
        m = re.search(r"共\s*(\d+)\s*件商品", page.evaluate("document.body.innerText"))
        print(f"审核驳回: {int(m.group(1)) if m else 0} 件")
        print("\n[OK] 检查完成，浏览器保持打开")

    _run_browser(flags, cb)



def cmd_login_qr(flags):
    """打开抖店登录页，截图二维码供前端展示，等待扫码登录"""
    qr_path = "/tmp/douyin_login_qr.png"
    ready_flag = "/tmp/douyin_login_ready"
    done_flag = "/tmp/douyin_login_done"

    # 清除上次标记
    for f in [ready_flag, done_flag, qr_path]:
        try:
            os.remove(f)
        except Exception:
            pass

    from playwright.sync_api import sync_playwright
    import tempfile, shutil, json

    pw = sync_playwright().start()
    tmp_dir = tempfile.mkdtemp(prefix="dy_login_")

    try:
        ctx = pw.chromium.launch_persistent_context(
            tmp_dir,
            channel="chrome",
            headless=flags.get("headless", True),
            viewport={"width": 1280, "height": 800},
            args=["--no-sandbox", "--no-proxy-server"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.bring_to_front()

        page.goto("https://fxg.jinritemai.com/login/common?extra=%7B%22target_url%22%3A%22https%3A%2F%2Ffxg.jinritemai.com%2Fffa%2Fg%2Flist%3Fstatus%3D2%22%7D", wait_until="domcontentloaded")
        time.sleep(5)

        # 尝试切换到扫码登录
        for txt in ["扫码登录", "扫码", "二维码"]:
            try:
                el = page.locator(f"text={txt}").first
                if el:
                    el.click(timeout=3000)
                    time.sleep(2)
                    break
            except:
                continue

        time.sleep(3)
        page.screenshot(path=qr_path, full_page=False)
        size = os.path.getsize(qr_path)
        print(f"[OK] 二维码截图已保存 ({size} bytes): {qr_path}")

        with open(ready_flag, "w") as f:
            f.write("1")

        # 等待登录
        _ensure_login(page, shop_id=flags.get("shop_id"))

        # 保存 cookie
        cookies = ctx.cookies()
        cookie_file = _cookie_file(shop_id=flags.get("shop_id"))
        with open(cookie_file, "w") as f:
            json.dump(cookies, f, indent=2)
        print(f"[OK] 登录成功，已保存 {len(cookies)} 个 cookie")

        with open(done_flag, "w") as f:
            f.write("1")
        if os.path.exists(ready_flag):
            os.remove(ready_flag)

    finally:
        try:
            ctx.close()
            pw.stop()
        except:
            pass
        shutil.rmtree(tmp_dir, ignore_errors=True)


def cmd_daily_push(flags):
    """全量采集 + 巡检 + 推送后端"""
    import requests
    from douyin_operator.collector import ProductCollector

    api_url = flags.get("api_url") or os.environ.get("API_URL")
    if not api_url:
        print("[ERR] 需要 --api-url 参数或 API_URL 环境变量")
        return

    api_url = api_url.rstrip("/")
    shop_id = flags.get("shop_id")

    def cb(page, ctx, pw):
        try:
            # 先去商品页登录
            page.goto("https://fxg.jinritemai.com/ffa/g/list?status=2")
            page.wait_for_load_state('load', timeout=15000)
            _ensure_login(page, shop_id=shop_id)

            # ---- 采集商品 ----
            shop_tag = f" [{shop_id}]" if shop_id else ""
            print(f"\n=== 1/5 采集在售商品{shop_tag} ===")
            class FakeBM:
                def __init__(self, p):
                    self.page = p
                def get_text(self):
                    return self.page.evaluate("document.body.innerText")
                def evaluate(self, js, *a):
                    return self.page.evaluate(js) if not a else self.page.evaluate(js, a[0])
                def navigate(self, url, wait_seconds=2):
                    self.page.goto(url)
                    time.sleep(wait_seconds)

            collector = ProductCollector(FakeBM(page))
            m = re.search(r"共\s*(\d+)\s*件商品", page.evaluate("document.body.innerText"))
            total = int(m.group(1)) if m else 0
            print(f"在售商品总数: {total}")

            products = collector.collect_all() if total > 0 else []
            print(f"采集完成: {len(products)} 件")

            # ---- 巡检 ----
            print("\n=== 2/5 巡检订单 ===")
            page.goto("https://fxg.jinritemai.com/ffa/morder/order/list")
            time.sleep(2)
            text = page.evaluate("document.body.innerText")
            o = re.search(r"今日订单[：:]\s*(\d+)", text)
            order_count = int(o.group(1)) if o else 0
            print(f"今日订单: {order_count}")

            order_statuses = {}
            for status_key, pattern in [("待发货", r"待发货[：:]?\s*(\d+)"), ("待处理", r"待处理[：:]?\s*(\d+)"), ("退款中", r"退款中[：:]?\s*(\d+)")]:
                m = re.search(pattern, text)
                if m:
                    order_statuses[status_key] = int(m.group(1))
            if order_statuses:
                print(f"订单状态: {order_statuses}")

            print("=== 3/5 审核驳回 ===")
            page.goto("https://fxg.jinritemai.com/ffa/g/list?sov_draft_status=3")
            time.sleep(2)
            text = page.evaluate("document.body.innerText")
            r = re.search(r"共\s*(\d+)\s*件商品", text)
            rejected_count = int(r.group(1)) if r else 0
            print(f"审核驳回: {rejected_count}")

            # ---- 经营概览（通过侧边栏点击加载） ----
            print("=== 4/5 经营概览 ===")
            page.goto("https://fxg.jinritemai.com/ffa/g/list?status=2")
            time.sleep(2)
            try:
                page.evaluate("""() => {
                    const items = document.querySelectorAll('span');
                    for (const el of items) {
                        if (el.textContent.includes('经营总览') || el.textContent.includes('经营')) {
                            el.click(); return true;
                        }
                    }
                    return false;
                }""")
                time.sleep(8)
                text = page.evaluate("document.body.innerText")
                revenue_data = {}
                for key, pattern in [
                    ("views", r"浏览量[：:]?\s*([\d,.]+)"),
                    ("visitors", r"访客[数]?[：:]?\s*([\d,.]+)"),
                    ("revenue", r"成交金额[：:]?\s*([\d,.]+)"),
                    ("conversion_rate", r"转化率[：:]?\s*([\d.]+%)"),
                    ("order_count", r"订单数[：:]?\s*([\d,.]+)"),
                ]:
                    m = re.search(pattern, text)
                    if m:
                        revenue_data[key] = m.group(1)
                if revenue_data:
                    print(f"经营数据: {revenue_data.get('views','?')}浏览 / {revenue_data.get('revenue','?')}成交")
                else:
                    print(f"经营概览: 页面字符{len(text)}, 未匹配到指标")
            except Exception as e:
                print(f"经营概览采集失败: {e}")
                revenue_data = {}

            # ---- 商品评价 ----
            print("=== 5/5 商品评价 ===")
            page.goto("https://fxg.jinritemai.com/ffa/g/comment")
            time.sleep(4)
            text = page.evaluate("document.body.innerText")
            review_data = {}
            for key, pattern in [
                ("total_reviews", r"评价[数]?[：:]?\s*([\d,.]+)"),
                ("good_rate", r"好评率[：:]?\s*([\d.]+%)"),
                ("avg_rating", r"评分[：:]?\s*([\d.]+)"),
            ]:
                m = re.search(pattern, text)
                if m:
                    review_data[key] = m.group(1)
            if review_data:
                print(f"评价: {review_data.get('total_reviews','?')}条 / 好评{review_data.get('good_rate','?')}")

            # ---- 对比上次 ----
            print("\n=== 推送到后端 ===")
            today = datetime.now().strftime("%Y-%m-%d")
            last_file = _products_file(shop_id, suffix="last")
            backup_file = _products_file(shop_id, suffix=today) if shop_id else os.path.join(PROJECT_DIR, f"products_{today}.json")

            current_ids = {p["id"] for p in products}
            previous_products = []
            if os.path.exists(last_file):
                with open(last_file, "r", encoding="utf-8") as f:
                    previous_products = json.load(f)
            previous_ids = {p["id"] for p in previous_products}

            new_products_list = [p for p in products if p["id"] not in previous_ids] if previous_ids else []
            delisted_products_list = [p for p in previous_products if p["id"] not in current_ids] if previous_products else []

            print(f"新增商品: {len(new_products_list)}")
            print(f"下架商品: {len(delisted_products_list)}")

            # ---- 保存本地备份 ----
            with open(last_file, "w", encoding="utf-8") as f:
                json.dump(products, f, ensure_ascii=False, indent=2)
            with open(backup_file, "w", encoding="utf-8") as f:
                json.dump(products, f, ensure_ascii=False, indent=2)
            with open(_products_file(shop_id), "w", encoding="utf-8") as f:
                json.dump(products, f, ensure_ascii=False, indent=2)

            # ---- 推送后端 ----
            product_items = [
                {
                    "douyin_product_id": p["id"],
                    "name": p.get("name", ""),
                    "listed_date": p.get("date", ""),
                    "status": "active",
                    "sale_price": p.get("salePrice", 0),
                    "sales_count": p.get("salesCount", 0),
                    "stock": p.get("stock", 0),
                    "category": p.get("category", ""),
                    "image_url": p.get("imageUrl", ""),
                }
                for p in products
            ]

            delisted_items = [
                {
                    "douyin_product_id": p["id"],
                    "name": p.get("name", ""),
                    "listed_date": p.get("date", ""),
                    "status": "delisted",
                }
                for p in delisted_products_list
            ]

            payload = {
                "shop_id": shop_id,
                "shop_name": shop_id,
                "snapshot": {
                    "date": today,
                    "product_count": len(products),
                    "order_count": order_count,
                    "rejected_count": rejected_count,
                    "order_statuses": order_statuses or None,
                    "revenue_data": revenue_data or None,
                    "review_data": review_data or None,
                },
                "products": product_items,
                "changes": {
                    "new_products": [{
                        "douyin_product_id": p["id"],
                        "name": p.get("name", ""),
                        "listed_date": p.get("date", ""),
                    } for p in new_products_list],
                    "delisted_products": delisted_items,
                },
            }

            print(f"推送数据: {today} | {len(products)} 商品 | {order_count} 单")

            get_resp = requests.get(api_url, timeout=10)
            csrf_token = None
            for cookie in get_resp.cookies:
                if cookie.name == "suda-csrf-token":
                    csrf_token = cookie.value
                    break

            headers = {"Content-Type": "application/json"}
            if csrf_token:
                headers["x-suda-csrf-token"] = csrf_token
                headers["Cookie"] = f"suda-csrf-token={csrf_token}"

            resp = requests.post(
                f"{api_url}/api/douyin/scrape/push-daily",
                json=payload,
                headers=headers,
                timeout=30,
            )
            if resp.status_code >= 400:
                print(f"[ERR] 推送 HTTP {resp.status_code}: {resp.text[:200]}")
            else:
                result = resp.json()
                if result.get("success"):
                    print(f"[OK] 推送成功: {result.get('message', '')}")
                else:
                    print(f"[ERR] 推送失败: {result.get('message', '')}")

            # ---- 计算销量变化（用于出库记录） ----
            outbound_list = []
            if previous_products:
                prev_sales = {p["id"]: p.get("salesCount", 0) for p in previous_products}
                for p in products:
                    pid = p["id"]
                    old_sales = prev_sales.get(pid, 0)
                    new_sales = p.get("salesCount", 0)
                    diff = new_sales - old_sales
                    if diff > 0:
                        outbound_list.append({
                            "name": p.get("name", ""),
                            "id": pid,
                            "quantity": diff,
                            "total_sales": new_sales,
                        })

        except Exception as e:
            print(f"[ERR] daily-push 执行失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            try:
                ctx.close()
                pw.stop()
            except Exception:
                pass

    _run_browser(flags, cb)


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return

    _load_env()
    ensure_playwright()
    command = sys.argv[1]
    cmd_args = sys.argv[2:]
    flags, remaining = _parse_flags(cmd_args)

    cmds = {
        "collect": lambda: cmd_collect(flags),
        "inspect": lambda: cmd_inspect(flags),
        "delist": lambda: cmd_delist(flags, remaining[0] if remaining else ""),
        "check-rejected": lambda: cmd_check_rejected(flags),
        "daily-push": lambda: cmd_daily_push(flags),
        "login": lambda: cmd_login_qr(flags),
    }

    if command in cmds:
        cmds[command]()
    else:
        print(f"[ERR] 未知命令: {command}")
        print(__doc__)


if __name__ == "__main__":
    main()
