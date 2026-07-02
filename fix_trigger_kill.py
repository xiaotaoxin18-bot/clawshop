#!/usr/bin/env python3
"""Update triggerLogin on server to support kill/refresh."""
import sys

PATH = "/home/ubuntu/clawshop/backend/server/modules/douyin/douyin.service.ts"

with open(PATH, "r", encoding="utf-8") as f:
    code = f.read()

old = """  async triggerLogin(shopId?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.runScraperCommand('login', this.buildLoginArgs(shopId), false);
      return { success: true, message: '登录流程已启动，请稍后查看二维码' };
    } catch (error: any) {
      this.logger.error(`触发登录失败: ${error.message}`);
      return { success: false, message: `触发登录失败: ${error.message}` };
    }
  }

  async uploadCookie"""

new = """  private killLogin(): void {
    if (this.loginChild) {
      try { this.loginChild.kill("SIGKILL"); } catch {}
      this.loginChild = null;
    }
    try { require("fs").unlinkSync("/tmp/douyin_login_ready"); } catch {}
    try { require("fs").unlinkSync("/tmp/douyin_login_done"); } catch {}
  }

  async triggerLogin(shopId?: string): Promise<{ success: boolean; message: string }> {
    this.killLogin();
    try {
      await this.runScraperCommand('login', this.buildLoginArgs(shopId), false);
      return { success: true, message: '登录流程已启动，请稍后查看二维码' };
    } catch (error: any) {
      this.logger.error(`触发登录失败: ${error.message}`);
      return { success: false, message: `触发登录失败: ${error.message}` };
    }
  }

  async uploadCookie"""

if old in code:
    code = code.replace(old, new)
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(code)
    print("OK")
else:
    print("NOT FOUND")
    # Debug
    idx = code.find("async triggerLogin")
    if idx >= 0:
        print("Found at", idx)
        print(repr(code[idx:idx+300]))
