@echo off
chcp 65001 >nul

if not "%NGROK_PATH%"=="" (
    start "" "%NGROK_PATH%" http 3000
) else if exist "D:\ngrok\ngrok.exe" (
    start "" "D:\ngrok\ngrok.exe" http 3000
) else (
    start "" "ngrok" http 3000
)
