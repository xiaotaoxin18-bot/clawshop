#!/usr/bin/env python3
"""Fix QR code extraction in cli.py - crop the QR area properly."""
import sys

SERVER_PATH = "/home/ubuntu/clawshop/scraper/cli.py"

with open(SERVER_PATH, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the QR screenshot section
old = """        time.sleep(3)
        # 提取二维码图片（CSS background-image data:image/gif;base64,xxx）
        qr_base64 = None
        try:
            qr_data = page.evaluate(\"\"\"() => {
                const el = document.querySelector('.account-center-image-content');
                if (!el) return null;
                const bg = window.getComputedStyle(el).backgroundImage;
                const m = bg.match(/data:image\\/[^;]+;base64,([^")\']+)/);
                return m ? m[0] : null;
            }\"\"\")
            if qr_data and len(qr_data) > 100:
                import base64
                from io import BytesIO
                import requests
                with open(qr_path, \"wb\") as f:
                    raw = qr_data.split(\",\", 1)[1]
                    f.write(base64.b64decode(raw))
                size = os.path.getsize(qr_path)
                print(f\"[OK] 二维码已提取 ({size} bytes): {qr_path}\")
                qr_base64 = qr_data
        except Exception as e:
            print(f\"[!] 提取二维码失败，使用截图: {e}\")

        if not qr_base64 or os.path.getsize(qr_path) < 100:
            page.screenshot(path=qr_path, clip={\"x\": 850, \"y\": 180, \"width\": 230, \"height\": 250})
            size = os.path.getsize(qr_path)
            print(f\"[OK] 二维码截图已保存 ({size} bytes): {qr_path}\")

        with open(ready_flag, \"w\") as f:
            f.write(\"1\")"""

new = """        time.sleep(3)
        # 截图二维码区域（右侧扫码登录区域）
        page.screenshot(path=qr_path, clip={"x": 830, "y": 150, "width": 300, "height": 380})
        size = os.path.getsize(qr_path)
        print(f"[OK] 二维码截图已保存 ({size} bytes): {qr_path}")

        with open(ready_flag, "w") as f:
            f.write("1")"""

if old in code:
    code = code.replace(old, new)
    with open(SERVER_PATH, "w", encoding="utf-8") as f:
        f.write(code)
    print("Fixed QR crop")
else:
    print("Old text not found, searching...")
    import re
    idx = code.find("time.sleep(3)")
    if idx >= 0:
        print(f"Found time.sleep(3) at position {idx}")
        print("Context:", code[idx:idx+500])
    else:
        print("time.sleep(3) not found either")
