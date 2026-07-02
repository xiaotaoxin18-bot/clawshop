#!/usr/bin/env python3
"""Simple fix for broken page.evaluate line in cli.py"""
CLI_PATH = "/home/ubuntu/clawshop/scraper/cli.py"

with open(CLI_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the broken line and replace it
for i, line in enumerate(lines):
    if "page.evaluate" in line and "account-center-image-content" in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + 'import json as _json\n'
        lines[i] += indent + '_qr_data = None\n'
        lines[i] += indent + (
            'for _qr_el in page.query_selector_all(".account-center-image-content"):\n'
        )
        lines[i] += indent + '    _bg = page.evaluate("(el) => window.getComputedStyle(el).backgroundImage", _qr_el)\n'
        lines[i] += indent + '    import re as _re\n'
        lines[i] += indent + '    _m = _re.search(r\'data:image/[^;]+;base64,([^"\'\\\\s]+)\', _bg)\n'
        lines[i] += indent + '    if _m:\n'
        lines[i] += indent + '        _qr_data = _m.group(0)\n'
        lines[i] += indent + '        break\n'
        print(f"Fixed line {i+1}")
        break
else:
    print("Line not found!")
    # Debug: find lines with evaluate
    for i, line in enumerate(lines):
        if "evaluate" in line:
            print(f"  Line {i+1}: {line.strip()[:80]}")

with open(CLI_PATH, "w", encoding="utf-8") as f:
    f.writelines(lines)

# Verify
import py_compile
try:
    py_compile.compile(CLI_PATH, doraise=True)
    print("Syntax OK")
except py_compile.PyCompileError as e:
    print(f"Syntax error: {e}")
