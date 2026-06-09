@echo off
chcp 65001 >nul
cd /d %~dp0

echo ========================================
echo  抖店运营工具 - 首次登录设置
echo ========================================
echo.
echo 即将打开浏览器，请扫码登录抖店
echo 登录后关闭浏览器，后续使用无需再登录
echo.

python -c "
from playwright.sync_api import sync_playwright
import os, json

profile_dir = os.path.join(os.path.dirname(os.path.abspath('.')), 'edge_profile')
os.makedirs(profile_dir, exist_ok=True)

pw = sync_playwright().start()
context = pw.chromium.launch_persistent_context(
    profile_dir,
    channel='msedge',
    headless=False,
    viewport={'width': 1280, 'height': 800}
)
page = context.pages[0] if context.pages else context.new_page()
page.goto('https://fxg.jinritemai.com/ffa/g/list?status=2')

print('请在浏览器中登录抖店，登录后关闭浏览器窗口')

# 等浏览器被用户关闭
try:
    page.wait_for_event('close', timeout=600000)
except:
    pass

context.close()
pw.stop()

# 保存配置
with open(os.path.join(profile_dir, 'setup_done.txt'), 'w') as f:
    f.write('登录完成')
print('登录信息已保存，后续使用无需再次登录')
"

pause
