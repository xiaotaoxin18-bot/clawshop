@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

rem ============================================
rem  clawshop 一键启动脚本（静默模式）
rem  开机自启时由 Task Scheduler 调用
rem ============================================

rem ---- 清理残留的 PostgreSQL 锁文件和进程（非正常关机导致） ----
if exist "%PROJECT_ROOT%\data\pgdata\postmaster.pid" (
    del /f "%PROJECT_ROOT%\data\pgdata\postmaster.pid"
)
%SystemRoot%\System32\tasklist.exe /FI "IMAGENAME eq postgres.exe" 2>nul | %SystemRoot%\System32\find.exe /I "postgres.exe" >nul
if not errorlevel 1 (
    wmic process where name='postgres.exe' delete >nul 2>&1
    ping -n 4 127.0.0.1 >nul
)

rem ---- 1. 启动 PostgreSQL ----
set "PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql"
set "PATH=%PGHOME%\bin;%PATH%"
"%PGHOME%\bin\pg_ctl" -D "%PROJECT_ROOT%\data\pgdata" -l "%PROJECT_ROOT%\data\pgdata\logfile" start

rem ---- 等待 PostgreSQL 真正就绪（轮询 pg_isready，最多 60 秒） ----
set "PG_READY="
for /l %%i in (1,1,60) do (
    "%PGHOME%\bin\pg_isready" -q >nul 2>&1
    if not errorlevel 1 set "PG_READY=1" & goto DB_READY
    ping -n 2 127.0.0.1 >nul
)
:DB_READY
if not defined PG_READY (
    echo [WARN] PostgreSQL 未在 60 秒内就绪，仍尝试启动后端...
)

rem ---- 2. 启动后端（生产模式，serve 前端+API） ----
start "" "%PROJECT_ROOT%\scripts\start-backend.bat"

rem ---- 等待后端启动（轮询进程，最多等20秒） ----
set "NODE_STARTED="
for /l %%i in (1,1,20) do (
    ping -n 2 127.0.0.1 >nul
    %SystemRoot%\System32\tasklist.exe /FI "IMAGENAME eq node.exe" 2>nul | %SystemRoot%\System32\find.exe /I "node.exe" >nul
    if not errorlevel 1 set "NODE_STARTED=1" & goto NODE_OK
)
:NODE_OK
if not defined NODE_STARTED (
    echo [WARN] 后端可能未正常启动，查看日志: %PROJECT_ROOT%\backend\node_err.log
)

rem ---- 3. 启动 ngrok 隧道（指向后端 3000 端口） ----
if not "%NGROK_PATH%"=="" (
    start "" cmd /c "%NGROK_PATH% http 3000"
) else if exist "D:\ngrok\ngrok.exe" (
    start "" cmd /c "D:\ngrok\ngrok.exe http 3000"
) else (
    start "" cmd /c "ngrok http 3000"
)
