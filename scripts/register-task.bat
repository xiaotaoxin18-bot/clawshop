@echo off
chcp 65001 >nul
schtasks /delete /tn "clawshop-startup" /f 2>nul
schtasks /create /tn "clawshop-startup" /tr "cmd.exe /c \"%~dp0startup.bat\"" /sc onlogon /delay 0000:30 /rl highest /f
if %errorLevel% equ 0 (
    echo SUCCESS: clawshop-startup registered
) else (
    echo FAILED: Need admin rights. Right-click and "Run as administrator"
)
pause
