@echo off
chcp 65001 >nul
schtasks /delete /tn "clawshop-startup" /f 2>nul
schtasks /create /tn "clawshop-startup" /tr "wscript.exe D:\clawshop\scripts\startup.vbs" /sc onlogon /delay 0000:30 /rl highest /f
if %errorLevel% equ 0 (
    echo 开机自启注册成功！
) else (
    echo 注册失败，请以管理员身份运行！
)
pause
