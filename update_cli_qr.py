#!/usr/bin/env python3
"""Update cli.py to extract QR code directly instead of screenshot."""
import sys, py_compile

CLI_PATH = "/home/ubuntu/clawshop/scraper/cli.py"

with open(CLI_PATH, "r", encoding="utf-8") as f:
    code = f.read()

old_block = """        time.sleep(3)
        page.screenshot(path=qr_path, clip={"x": 830, "y": 150, "width": 300, "height": 380})
        size = os.path.getsize(qr_path)
        print(f"[OK] 二维码截图已保存 ({size} bytes): {qr_path}")

        with open(ready_flag, "w") as f:
            f.write("1")"""

new_block = """        time.sleep(3)
        # 直接提取二维码图片（background-image CSS data:image）
        import base64 as _b64
        _qr_data = page.evaluate(
            "() => {"
            + 'const el = document.querySelector(".account-center-image-content");'
            + "if (!el) return null;"
            + 'const bg = window.getComputedStyle(el).backgroundImage;'
            + "const m = bg.match(/data:[^;]+;base64,([^\"'\\s]+)/);"
            + "return m ? m[0] : null;"
            + "}"
        )
        if _qr_data and len(str(_qr_data)) > 100:
            _raw = _qr_data.split(",", 1)[1]
            with open(qr_path, "wb") as _f:
                _f.write(_b64.b64decode(_raw))
            _sz = os.path.getsize(qr_path)
            print(f"[OK] 二维码已提取 ({_sz} bytes)")
        else:
            # 截图兜底
            page.screenshot(path=qr_path, clip={"x": 830, "y": 150, "width": 300, "height": 380})
            _sz = os.path.getsize(qr_path)
            print(f"[OK] 二维码截图已保存 ({_sz} bytes)")

        with open(ready_flag, "w") as f:
            f.write("1")"""

if old_block not in code:
    print("ERROR: old_block not found in cli.py")
    print("Looking for alternative patterns...")
    # Try to find the section
    if "clip={" in code:
        print("Found 'clip={' in code")
        idx = code.find("clip={\"x\": 830")
        if idx >= 0:
            print(f"  at position {idx}")
            print("  Context:", code[idx-50:idx+200])
    sys.exit(1)

code = code.replace(old_block, new_block)
with open(CLI_PATH, "w", encoding="utf-8") as f:
    f.write(code)

# Verify syntax
py_compile.compile(CLI_PATH, doraise=True)
print("OK: cli.py updated and syntax verified")
