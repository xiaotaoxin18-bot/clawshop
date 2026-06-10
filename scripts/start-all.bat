@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo ========================================
echo  clawshop - 一键启动（生产模式）
echo ========================================
echo.

:: 1. 启动 PostgreSQL
echo [1/3] 启动 PostgreSQL...
set PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql
set PATH=%PGHOME%\bin;%PATH%
"%PGHOME%\bin\pg_ctl" -D "%PROJECT_ROOT%\data\pgdata" -l "%PROJECT_ROOT%\data\pgdata\logfile" start 2>nul
echo   ✓ PostgreSQL 已启动 (端口 5432)
echo.

:: 2. 启动后端（生产模式，内置前端页面）
echo [2/3] 启动后端...
start "clawshop-backend" cmd /c "cd /d \"%PROJECT_ROOT%\backend\" && set SUDA_DATABASE_URL=postgresql://appuser:app123456@localhost:5432/inventory_db?schema=workspace_aadkeahc42wbs && set FORCE_AUTHN_INNERAPI_DOMAIN=localhost:3000 && set NODE_ENV=production && node dist/server/main.js"
echo   ✓ 后端已启动 (http://localhost:3000)
echo.

:: 3. 启动 ngrok 公网隧道
echo [3/3] 启动 ngrok 公网隧道...
if not "%NGROK_PATH%"=="" (
    start "clawshop-ngrok" cmd /c ""%NGROK_PATH%" http 3000"
) else (
    start "clawshop-ngrok" cmd /c "ngrok http 3000"
)
echo   ✓ ngrok 已启动 (查看地址: http://127.0.0.1:4040)
echo.

echo ========================================
echo  全部启动完成！
echo  本地访问: http://localhost:3000
echo  ngrok 面板: http://127.0.0.1:4040
echo ========================================
echo.
echo  按任意键关闭本窗口（服务将在后台继续运行）...
pause >nul
