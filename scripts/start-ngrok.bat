@echo off
chcp 65001 >nul

if not "%NGROK_PATH%"=="" (
    start /MIN "" "%NGROK_PATH%" http 3000
) else if exist "D:\ngrok\ngrok.exe" (
    start /MIN "" "D:\ngrok\ngrok.exe" http 3000
) else (
    start /MIN "" "ngrok" http 3000
)
