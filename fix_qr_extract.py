#!/usr/bin/env python3
"""Replace the broken single-line page.evaluate with proper multi-line version."""
CLI_PATH = "/home/ubuntu/clawshop/scraper/cli.py"

with open(CLI_PATH, "r", encoding="utf-8") as f:
    code = f.read()

old = """        _qr_data = page.evaluate('() => {            const el = document.querySelector(".account-center-image-content");            if (!el) return null;            const bg = window.getComputedStyle(el).backgroundImage;            const m = bg.match(/data:[^;]+;base64,([^"'\\s]+)/);            return m ? m[0] : null;        }')"""

new = """        _qr_data = page.evaluate("() => {\" + "
            const el = document.querySelector('.account-center-image-content');\" + "
            if (!el) return null;\" + "
            const bg = window.getComputedStyle(el).backgroundImage;\" + "
            const m = bg.match(/data:[^;]+;base64,([^\"'\\\\s]+)/);\" + "
            return m ? m[0] : null;\" + "
        }")"""

if old in code:
    code = code.replace(old, new)
    with open(CLI_PATH, "w", encoding="utf-8") as f:
        f.write(code)
    import py_compile
    py_compile.compile(CLI_PATH, doraise=True)
    print("OK")
else:
    print("Not found - checking exact content...")
    # Search for the line
    for i, line in enumerate(code.split("\n")):
        if "page.evaluate" in line and "account-center-image-content" in line:
            print(f"Line {i+1}: {line[:100]}...")
            print(f"Full: {line}")
