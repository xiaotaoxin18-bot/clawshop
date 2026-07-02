#!/usr/bin/env python3
"""Add QR refresh loop to cli.py on the server"""
PATH = "/home/ubuntu/clawshop/scraper/cli.py"

with open(PATH, "r", encoding="utf-8") as f:
    code = f.read()

old_marker = '        with open(ready_flag, "w") as f:\n            f.write("1")\n\n        # 等待用户扫码（监测 URL 离开登录页）'

new_block = """        with open(ready_flag, "w") as f:
            f.write("1")

        # 每3秒刷新二维码（抖店会定期更换，避免用户扫到过期码）
        import threading as _th
        _stop_refresh = False
        def _refresh_qr():
            while not _stop_refresh:
                time.sleep(3)
                try:
                    _el2 = page.query_selector(".account-center-image-content")
                    if _el2:
                        _bg2 = page.evaluate("(el) => window.getComputedStyle(el).backgroundImage", _el2)
                        _m2 = _re.search("data:image/[^;]+;base64,([^\"'\\s]+)", _bg2)
                        if _m2:
                            with open(qr_path, "wb") as _f:
                                _f.write(_b64.b64decode(_m2.group(1)))
                except:
                    pass
        _th.Thread(target=_refresh_qr, daemon=True).start()

        # 等待用户扫码（监测 URL 离开登录页）"""

if old_marker in code:
    code = code.replace(old_marker, new_block)
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(code)
    import py_compile
    py_compile.compile(PATH, doraise=True)
    print("OK - QR refresh loop added")
else:
    print("NOT FOUND")
    idx = code.find('f.write("1")')
    if idx >= 0:
        print("Context:", code[idx:idx+300])
