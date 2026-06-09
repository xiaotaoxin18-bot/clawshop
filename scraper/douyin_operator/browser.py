"""Playwright 浏览器管理与页面操作封装"""

import os
import time
from typing import Optional
from dataclasses import dataclass


@dataclass
class PageInfo:
    """打开的页面信息"""
    url: str
    title: str


class BrowserManager:
    """封装 Playwright 浏览器实例管理"""

    def __init__(self, headless: bool = False, user_data_dir: Optional[str] = None,
                 channel: Optional[str] = None):
        """
        Args:
            headless: 是否无头模式
            user_data_dir: 浏览器用户数据目录（用于保持登录态）
            channel: 浏览器渠道，如 "chrome" 使用系统 Chrome，"msedge" 使用 Edge
                     默认 None 使用 Playwright 内置 Chromium
        """
        self.headless = headless
        self.user_data_dir = user_data_dir
        self.channel = channel or os.environ.get("BROWSER_CHANNEL")
        self.browser = None
        self.context = None
        self.page = None

    def start(self) -> None:
        """启动浏览器"""
        from playwright.sync_api import sync_playwright

        self._pw = sync_playwright().start()

        launch_kwargs = {
            "headless": self.headless,
        }
        context_kwargs = {
            "viewport": {"width": 1280, "height": 800},
            "locale": "zh-CN",
        }
        if self.channel:
            launch_kwargs["channel"] = self.channel

        if self.user_data_dir:
            self.context = self._pw.chromium.launch_persistent_context(
                user_data_dir=self.user_data_dir,
                **launch_kwargs,
                **context_kwargs,
            )
            self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
        else:
            self.browser = self._pw.chromium.launch(**launch_kwargs)
            self.context = self.browser.new_context(**context_kwargs)
            self.page = self.context.new_page()

    def navigate(self, url: str, wait_seconds: float = 2.0) -> PageInfo:
        """打开页面并等待加载"""
        if not self.page:
            raise RuntimeError("浏览器未启动，请先调用 start()")
        self.page.goto(url, wait_until="domcontentloaded")
        time.sleep(wait_seconds)
        return PageInfo(url=self.page.url, title=self.page.title)

    def evaluate(self, js_code: str):
        """执行 JS（有返回值的表达式）"""
        return self.page.evaluate(js_code)

    def screenshot(self, path: str = "screenshot.png") -> str:
        """截图"""
        self.page.screenshot(path=path, full_page=True)
        return path

    def get_text(self) -> str:
        """获取页面文本内容"""
        return self.page.evaluate("document.body.innerText")

    def click_by_text(self, text: str, exact: bool = False) -> bool:
        """按文本点击按钮"""
        try:
            if exact:
                self.page.get_by_text(text, exact=True).click()
            else:
                self.page.get_by_role("button", name=text).click()
            return True
        except Exception:
            try:
                self.page.get_by_text(text).first.click()
                return True
            except Exception:
                return False

    def fill_input(self, selector: str, value: str) -> bool:
        """填充输入框"""
        try:
            self.page.fill(selector, value)
            return True
        except Exception:
            return False

    def scroll(self, delta_x: int = 0, delta_y: int = 500):
        """滚动页面"""
        self.page.evaluate(f"window.scrollBy({delta_x}, {delta_y})")

    def wait(self, seconds: float):
        """等待"""
        time.sleep(seconds)

    def close(self):
        """关闭浏览器"""
        try:
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if hasattr(self, '_pw') and self._pw:
                self._pw.stop()
        except Exception:
            pass

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *args):
        self.close()
