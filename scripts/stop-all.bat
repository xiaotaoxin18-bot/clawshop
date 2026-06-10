@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo ========================================
echo  clawshop - 停止所有服务
echo ========================================
echo.

:: 1. 停止 ngrok
echo [1/3] 停止 ngrok...
taskkill /f /im ngrok.exe 2>nul
echo   ✓ ngrok 已停止
echo.

:: 2. 停止后端
echo [2/3] 停止后端...
taskkill /f /im node.exe 2>nul
echo   ✓ 后端已停止
echo.

:: 3. 停止 PostgreSQL
echo [3/3] 停止 PostgreSQL...
set PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql
set PATH=%PGHOME%\bin;%PATH%
"%PGHOME%\bin\pg_ctl" -D "%PROJECT_ROOT%\data\pgdata" stop 2>nul
echo   ✓ PostgreSQL 已停止
echo.

echo ========================================
echo  所有服务已停止
echo ========================================
pause
