@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo 启动 PostgreSQL...
set PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql
set PATH=%PGHOME%\bin;%PATH%
"%PGHOME%\bin\pg_ctl" -D "%PROJECT_ROOT%\data\pgdata" -l "%PROJECT_ROOT%\data\pgdata\logfile" start
echo 完成
pause
