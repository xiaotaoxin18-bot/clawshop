#!/usr/bin/env python3
"""Extract QR code image directly from douyin login page."""
import base64, time, os, tempfile, shutil, sys
from playwright.sync_api import sync_playwright

pw = sync_playwright().start()
tmp_dir = tempfile.mkdtemp(prefix="dy_login_")

try:
    ctx = pw.chromium.launch_persistent_context(
        tmp_dir,
        headless=True,
        args=["--no-sandbox", "--no-proxy-server"],
        viewport={"width": 1280, "height": 900}
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto("https://fxg.jinritemai.com/login/common", wait_until="domcontentloaded", timeout=30000)
    time.sleep(5)

    # 点右上角二维码图标
    page.locator(".login-switcher--cell").first.click(timeout=5000)
    time.sleep(4)

    # 提取二维码 base64
    qr_base64 = page.evaluate("""() => {
        const el = document.querySelector('.account-center-image-content');
        if (!el) return null;
        const bg = window.getComputedStyle(el).backgroundImage;
        const m = bg.match(/data:[^;]+;base64,([^"')\\s]+)/);
        return m ? m[0] : null;
    }""")

    if qr_base64 and len(qr_base64) > 100:
        raw_data = qr_base64.split(",", 1)[1]
        img_data = base64.b64decode(raw_data)
        out_path = "/tmp/douyin_login_qr.png"
        with open(out_path, "wb") as f:
            f.write(img_data)
        print("QR_SAVED:{}:{}".format(len(img_data), out_path))
    else:
        print("QR_NOT_FOUND")
        sys.exit(1)

    ctx.close()
except Exception as e:
    print("ERROR:{}".format(e))
    sys.exit(1)
finally:
    pw.stop()
    shutil.rmtree(tmp_dir, ignore_errors=True)
