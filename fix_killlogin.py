#!/usr/bin/env python3
"""Fix killLogin to reset scrapeRunning flag."""
PATH = "/home/ubuntu/clawshop/backend/server/modules/douyin/douyin.service.ts"

with open(PATH, "r", encoding="utf-8") as f:
    code = f.read()

old = "  private killLogin(): void {\n    if (this.loginChild) {\n      try { this.loginChild.kill(\"SIGKILL\"); } catch {}\n      this.loginChild = null;\n    }\n    try { require(\"fs\").unlinkSync(\"/tmp/douyin_login_ready\"); } catch {}\n    try { require(\"fs\").unlinkSync(\"/tmp/douyin_login_done\"); } catch {}\n  }"

new = "  private killLogin(): void {\n    if (this.loginChild) {\n      try { this.loginChild.kill(\"SIGKILL\"); } catch {}\n      this.loginChild = null;\n    }\n    this.scrapeRunning = false;\n    this.scrapeRunningLabel = null;\n    try { require(\"fs\").unlinkSync(\"/tmp/douyin_login_ready\"); } catch {}\n    try { require(\"fs\").unlinkSync(\"/tmp/douyin_login_done\"); } catch {}\n  }"

if old in code:
    code = code.replace(old, new)
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(code)
    print("OK - killLogin fixed with scrapeRunning reset")
else:
    print("NOT FOUND")
    idx = code.find("killLogin")
    if idx >= 0:
        print(code[idx:idx+400])
