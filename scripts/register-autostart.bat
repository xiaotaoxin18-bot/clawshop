@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

echo ========================================
echo  clawshop - 注册开机自启
echo ========================================
echo.

:: 1. 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 请以管理员身份运行本脚本！
    echo 右键点击本文件 -> "以管理员身份运行"
    pause
    exit /b 1
)

echo [✓] 管理员权限已确认
echo.

:: 2. 构建前端（确保 dist/client 是最新版本）
echo [1/3] 构建前端...
cd /d "%PROJECT_ROOT%\backend"
call npx rspack build --config rspack.config.js --env mode=production
echo   ✓ 前端构建完成
echo.

:: 3. 删除旧的任务（如果存在）
echo [2/3] 注册开机自启任务...
schtasks /delete /tn "clawshop-startup" /f 2>nul

:: 4. 创建新的开机自启任务（用户登录时触发，延迟 30 秒启动）
schtasks /create /tn "clawshop-startup" /tr "cmd.exe /c \"%PROJECT_ROOT%\scripts\startup.bat\"" /sc onlogon /delay 0000:30 /rl highest /f

if %errorLevel% equ 0 (
    echo   ✓ 开机自启任务注册成功！
) else (
    echo   ✗ 注册失败，请检查权限
    pause
    exit /b 1
)
echo.

:: 5. 可选：同时注册到启动文件夹（备用）
echo [3/3] 添加启动文件夹快捷方式...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP_DIR%\clawshop-startup.bat" (
    copy /Y "%PROJECT_ROOT%\scripts\startup.bat" "%STARTUP_DIR%\clawshop-startup.bat" >nul
    echo   ✓ 启动文件夹快捷方式已添加
) else (
    echo   - 启动文件夹快捷方式已存在
)

echo.
echo ========================================
echo  配置完成！
echo  下次开机登录后 30 秒自动启动：
echo    □ PostgreSQL (端口 5432)
echo    □ 后端 + 前端 (端口 3000)
echo    □ ngrok 公网隧道
echo.
echo  手动启动:    scripts\start-all.bat
echo  手动停止:    scripts\stop-all.bat
echo ========================================
pause
