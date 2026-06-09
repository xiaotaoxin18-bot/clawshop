@echo off
chcp 65001 >nul
cd /d D:\clawshop

echo 启动 PostgreSQL...
set PGHOME=D:\clawshop\data\pgsql\pgsql
set PATH=%PGHOME%\bin;%PATH%
"%PGHOME%\bin\pg_ctl" -D D:\clawshop\data\pgdata -l D:\clawshop\data\pgdata\logfile start
echo 完成
pause
