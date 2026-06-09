@echo off
chcp 65001 >nul
cd /d %~dp0

echo ========================================
echo  抖店运营工具 - 采集在售商品
echo ========================================
echo.
echo 即将打开浏览器，请扫码登录抖店
echo 登录后关闭浏览器窗口即可完成采集
echo.

python -c "
from douyin_operator.browser import BrowserManager
from douyin_operator.collector import ProductCollector
import json

browser = BrowserManager(headless=False, channel='msedge')
browser.start()
browser.page.goto('https://fxg.jinritemai.com/ffa/g/list?status=2', wait_until='domcontentloaded')

print('请在浏览器中登录抖店...')

# 等登录（检测页面不再包含登录关键词）
browser.page.wait_for_function(
    '() => !document.body.innerText.includes(\"发送验证码\") && document.body.innerText.length > 500',
    timeout=300000
)
import time
time.sleep(3)

collector = ProductCollector(browser)
total = collector.get_total_count()
print(f'\n在售商品: {total}')

if total > 0:
    print('开始采集...')
    products = collector.collect_all()
    with open('products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f'采集完成: {len(products)} 件，已保存 products.json')

input('\n按 Enter 关闭浏览器...')
browser.close()
"
pause
