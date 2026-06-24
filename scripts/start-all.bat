@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo ========================================
echo  clawshop - 一键启动（生产模式）
echo ========================================
echo.

:: 1. 启动 PostgreSQL（通过 start-hidden.vbs 脱离控制台，防止关窗口被杀）
echo [1/3] 启动 PostgreSQL...
set "PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql"
set "PATH=%PGHOME%\bin;%PATH%"

rem ---- 先清理残留锁文件和进程 ----
%SystemRoot%\System32\tasklist.exe /FI "IMAGENAME eq postgres.exe" 2>nul | %SystemRoot%\System32\find.exe /I "postgres.exe" >nul
if not errorlevel 1 (
    echo   * 发现残留 postgres 进程，清理中...
    wmic process where name='postgres.exe' delete >nul 2>&1
    ping -n 4 127.0.0.1 >nul
)
if exist "%PROJECT_ROOT%\data\pgdata\postmaster.pid" (
    del /f "%PROJECT_ROOT%\data\pgdata\postmaster.pid" >nul 2>&1
)

rem ---- 隐藏启动 PostgreSQL（脱离当前控制台窗口） ----
wscript.exe //nologo "%PROJECT_ROOT%\scripts\start-hidden.vbs" "%PGHOME%\bin\pg_ctl -D %PROJECT_ROOT%\data\pgdata -l %PROJECT_ROOT%\data\pgdata\logfile start"

rem ---- 轮询等待 PostgreSQL 真正就绪（最多 30 秒） ----
set "PG_READY="
for /l %%i in (1,1,30) do (
    "%PGHOME%\bin\pg_isready" -q >nul 2>&1
    if not errorlevel 1 set "PG_READY=1" & goto PG_OK
    ping -n 2 127.0.0.1 >nul
)
:PG_OK
if defined PG_READY (
    echo   * PostgreSQL 已启动 (端口 5432)
) else (
    echo   * 无法启动 PostgreSQL，请手动检查:
    echo     type "%PROJECT_ROOT%\data\pgdata\logfile"
)
echo.

:: 2. 启动后端（完全隐藏后台运行）
echo Step 2/3 - 启动后端...
wscript.exe //nologo "%PROJECT_ROOT%\scripts\start-hidden.vbs" "%PROJECT_ROOT%\scripts\start-backend.bat"

rem ---- 等待后端启动（轮询进程，最多等20秒） ----
set "NODE_STARTED="
for /l %%i in (1,1,20) do (
    ping -n 2 127.0.0.1 >nul
    %SystemRoot%\System32\tasklist.exe /FI "IMAGENAME eq node.exe" 2>nul | %SystemRoot%\System32\find.exe /I "node.exe" >nul
    if not errorlevel 1 set "NODE_STARTED=1" & goto NODE_OK
)
:NODE_OK
if defined NODE_STARTED (
    echo   * 后端已启动 (http://localhost:3000)
) else (
    echo   * 后端可能未正常启动，请查看日志:
    echo     type "%PROJECT_ROOT%\backend\node_err.log"
)
echo.

:: 3. 启动 ngrok 公网隧道（完全隐藏后台运行）
echo Step 3/3 - 启动 ngrok 公网隧道...
if not "%NGROK_PATH%"=="" goto NGOK_PATH_SET
if exist "D:\ngrok\ngrok.exe" goto NGOK_DEFAULT
wscript.exe //nologo "%PROJECT_ROOT%\scripts\start-hidden.vbs" "ngrok http 3000"
goto NGOK_DONE
:NGOK_PATH_SET
wscript.exe //nologo "%PROJECT_ROOT%\scripts\start-hidden.vbs" "%NGROK_PATH% http 3000"
goto NGOK_DONE
:NGOK_DEFAULT
wscript.exe //nologo "%PROJECT_ROOT%\scripts\start-hidden.vbs" "D:\ngrok\ngrok.exe http 3000"
:NGOK_DONE
echo   * ngrok 已启动 (查看地址: http://127.0.0.1:4040)
echo.

echo ========================================
echo  全部启动完成！
echo  本地访问: http://localhost:3000
echo  ngrok 面板: http://127.0.0.1:4040
echo ========================================
echo.
echo  按任意键关闭本窗口（服务将在后台继续运行）...
pause >nul
\r