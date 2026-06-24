@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo 启动 PostgreSQL...
set PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql
set PATH=%PGHOME%\bin;%PATH%

rem 先清理残留锁文件
if exist "%PROJECT_ROOT%\data\pgdata\postmaster.pid" (
    del /f "%PROJECT_ROOT%\data\pgdata\postmaster.pid" >nul 2>&1
)

rem 通过 start-hidden.vbs 启动，脱离控制台窗口（防止关窗被杀）
wscript.exe //nologo "%PROJECT_ROOT%\scripts\start-hidden.vbs" "%PGHOME%\bin\pg_ctl -D %PROJECT_ROOT%\data\pgdata -l %PROJECT_ROOT%\data\pgdata\logfile start"
echo 完成 (后台运行)
pause
