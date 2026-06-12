@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "SCRIPT_DIR=%CD%"

if not "%NGROK_PATH%"=="" goto NG_PATH
if exist "D:\ngrok\ngrok.exe" goto NG_DEFAULT
wscript.exe //nologo "%SCRIPT_DIR%\start-hidden.vbs" "ngrok http 3000"
goto NG_DONE
:NG_PATH
wscript.exe //nologo "%SCRIPT_DIR%\start-hidden.vbs" "%NGROK_PATH% http 3000"
goto NG_DONE
:NG_DEFAULT
wscript.exe //nologo "%SCRIPT_DIR%\start-hidden.vbs" "D:\ngrok\ngrok.exe http 3000"
:NG_DONE
echo ngrok 已后台启动，面板: http://127.0.0.1:4040
