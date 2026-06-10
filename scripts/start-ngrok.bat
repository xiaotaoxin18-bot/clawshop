@echo off
chcp 65001 >nul

if not "%NGROK_PATH%"=="" (
    start "ngrok" "%NGROK_PATH%" http 3000
) else (
    start "ngrok" "ngrok" http 3000
)
