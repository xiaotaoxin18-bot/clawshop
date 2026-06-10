@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo ========================================
echo  clawshop - 首次初始化
echo ========================================
echo.

:: ---- 1. 检查依赖 ----
echo [1/6] 检查环境依赖...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo   ✗ 未找到 Node.js，请先安装 Node.js ^>= 22
    echo     下载: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1-3 delims=." %%a in ('node -v') do set "NODE_VER=%%a.%%b.%%c"
echo   ✓ Node.js %NODE_VER%
echo.

:: ---- 2. 安装 npm 依赖 ----
echo [2/6] 安装 npm 依赖...
cd /d "%PROJECT_ROOT%\backend"
call npm install
if %errorLevel% neq 0 (
    echo   ✗ npm install 失败，请检查网络
    pause
    exit /b 1
)
echo   ✓ 依赖安装完成
echo.

:: ---- 3. 构建前端与后端 ----
echo [3/6] 构建项目...
call npm run build:client
if %errorLevel% neq 0 (
    echo   ⚠ 前端构建有警告，继续...
)
call npm run build:server
if %errorLevel% neq 0 (
    echo   ✗ 后端构建失败
    pause
    exit /b 1
)
echo   ✓ 构建完成
echo.

:: ---- 4. 配置环境变量 ----
echo [4/6] 配置环境变量...
if not exist "%PROJECT_ROOT%\backend\.env" (
    if exist "%PROJECT_ROOT%\backend\.env.example" (
        copy "%PROJECT_ROOT%\backend\.env.example" "%PROJECT_ROOT%\backend\.env" >nul
        echo   ✓ 已从 .env.example 创建 .env
    ) else (
        echo   - 未找到 .env.example，请手动创建 backend\.env
    )
) else (
    echo   - .env 已存在，跳过
)
echo.

:: ---- 5. 采集器 Python 依赖（可选） ----
echo [5/6] 采集器 Python 依赖（可选，仅抖店采集需要）...
where python >nul 2>&1
if %errorLevel% equ 0 (
    if exist "%PROJECT_ROOT%\scraper\requirements.txt" (
        echo   - 发现 Python，安装 scraper 依赖...
        cd /d "%PROJECT_ROOT%\scraper"
        pip install -r requirements.txt >nul 2>&1
        if %errorLevel% equ 0 (
            echo   ✓ Python 依赖已安装
        ) else (
            echo   ⚠ pip install 有问题，可稍后手动运行:
            echo      cd scraper ^&^& pip install -r requirements.txt
        )
    ) else (
        echo   - 未找到 requirements.txt，跳过
    )
) else (
    echo   - 未安装 Python，跳过（抖店采集需要 Python 3.10+）
)
cd /d "%PROJECT_ROOT%"
echo.

:: ---- 6. 初始化 PostgreSQL ----
echo [6/6] 初始化 PostgreSQL...
set PGHOME=%PROJECT_ROOT%\data\pgsql\pgsql

if not exist "%PGHOME%\bin\pg_ctl.exe" (
    echo   ⚠ PostgreSQL 未下载，请手动安装 PostgreSQL 16 或下载便携版
    echo     下载后解压到: %PGHOME%
    echo.
    echo   ✓ 基础设置已完成！
    echo.
    echo  下一步：
    echo     1. 双击 scripts\start-all.bat  启动项目
    echo     2. 访问 http://localhost:3000
    echo.
    pause
    exit /b 0
)

set PATH=%PGHOME%\bin;%PATH%

:: 初始化数据库集群（如果未初始化）
if not exist "%PROJECT_ROOT%\data\pgdata\pg_hba.conf" (
    echo   - 初始化数据库集群...
    "%PGHOME%\bin\initdb" -D "%PROJECT_ROOT%\data\pgdata" --auth=md5 --encoding=UTF8
    echo   ✓ 数据库集群已初始化
) else (
    echo   - 数据库集群已存在
)

:: 启动 PostgreSQL
"%PGHOME%\bin\pg_ctl" -D "%PROJECT_ROOT%\data\pgdata" -l "%PROJECT_ROOT%\data\pgdata\logfile" start 2>nul

:: 创建用户和数据库
"%PGHOME%\bin\createuser" -s appuser 2>nul
echo   ✓ 数据库用户 appuser 已就绪
"%PGHOME%\bin\createdb" -O appuser inventory_db 2>nul
echo   ✓ 数据库 inventory_db 已就绪

:: 执行角色修复脚本
"%PGHOME%\bin\psql" -d inventory_db -f "%PROJECT_ROOT%\backend\fix_roles.sql" 2>nul
echo   ✓ 数据库角色已配置

:: 执行种子数据（可选）
echo   是否导入演示数据？(seed.sql)
echo   按 Y 导入演示数据，按 N 跳过（默认 N）
choice /c YN /n /t 5 /d N >nul
if %errorlevel% equ 1 (
    "%PGHOME%\bin\psql" -d inventory_db -f "%PROJECT_ROOT%\backend\seed.sql" 2>nul
    echo   ✓ 演示数据已导入
)

echo.
echo ========================================
echo  初始化完成！
echo.
echo  启动项目:   双击 scripts\start-all.bat
echo  注册自启:   右键 scripts\register-task.bat ^> 以管理员身份运行
echo  访问地址:   http://localhost:3000
echo.
echo  采集器（需 Python）:
echo     cd scraper ^&^& python cli.py daily-push --api-url http://localhost:3000
echo ========================================
echo.
pause
