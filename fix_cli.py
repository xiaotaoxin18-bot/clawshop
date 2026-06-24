#!/usr/bin/env python3
"""Add login command to cli.py"""
with open('/home/ubuntu/clawshop/scraper/cli.py', 'r') as f:
    c = f.read()

# Add login command to the cmds dict
old = '        "daily-push": lambda: cmd_daily_push(flags),'
new = '        "daily-push": lambda: cmd_daily_push(flags),\n        "login": lambda: cmd_login_qr(flags),'
c = c.replace(old, new)

# Update help text
old_help = '    python cli.py daily-push --api-url <URL>    采集+巡检+推送后端'
new_help = '    python cli.py daily-push --api-url <URL>    采集+巡检+推送后端\n    python cli.py login                       截图二维码并等待扫码登录'
c = c.replace(old_help, new_help)

with open('/home/ubuntu/clawshop/scraper/cli.py', 'w') as f:
    f.write(c)
print('OK')
