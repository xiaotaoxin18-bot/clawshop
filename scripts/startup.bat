@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

rem ============================================
rem  clawshop 一键启动脚本（静默模式）
rem  开机自启时由 Task Scheduler 调用
rem ============================================

rem ---- 清理残留的 PostgreSQL 锁文件（非正常关机导致） ----
if exist "%PROJECT_ROOT%\data\pgdata\postmaster.pid" (
    del /f "%PROJECT_ROOT%\data\pgdata\postmaster.pid"
)

rem ---- 1. 启动 PostgreSQL ----
set PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql
set PATH=%PGHOME%\bin;%PATH%
"%PGHOME%\bin\pg_ctl" -D "%PROJECT_ROOT%\data\pgdata" -l "%PROJECT_ROOT%\data\pgdata\logfile" start

rem ---- 等待 PostgreSQL 真正就绪（轮询 pg_isready，最多 60 秒） ----
setlocal enabledelayedexpansion
set "PG_READY="
for /l %%i in (1,1,60) do (
    "%PGHOME%\bin\pg_isready" -q >nul 2>&1 && set "PG_READY=1" && goto DB_READY
    ping -n 2 127.0.0.1 >nul
)
:DB_READY
if not defined PG_READY (
    echo [WARN] PostgreSQL 未在 60 秒内就绪，仍尝试启动后端...
)
endlocal

rem ---- 2. 启动后端（生产模式，serve 前端+API） ----
start "clawshop-backend" cmd /c "cd /d \"%PROJECT_ROOT%\backend\" && set SUDA_DATABASE_URL=postgresql://appuser:app123456@localhost:5432/inventory_db?schema=workspace_aadkeahc42wbs && set FORCE_AUTHN_INNERAPI_DOMAIN=localhost:3000 && set NODE_ENV=production && node dist/server/main.js"

rem ---- 稍等后端启动 ----
ping -n 9 127.0.0.1 >nul

rem ---- 3. 启动 ngrok 隧道（指向后端 3000 端口） ----
if not "%NGROK_PATH%"=="" (
    start "clawshop-ngrok" cmd /c ""%NGROK_PATH%" http 3000"
) else (
    start "clawshop-ngrok" cmd /c "ngrok http 3000"
)
