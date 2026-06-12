@echo off
chcp 65001 >nul
cd /d "%~dp0..\backend"

set SUDA_DATABASE_URL=postgresql://appuser:app123456@localhost:5432/inventory_db?schema=workspace_aadkeahc42wbs
set FORCE_AUTHN_INNERAPI_DOMAIN=localhost:3000
set NODE_ENV=production

echo [%date% %time%] Starting backend... >> "%~dp0..\backend\node_out.log"
node dist/server/main.js >> "%~dp0..\backend\node_out.log" 2>> "%~dp0..\backend\node_err.log"
echo [%date% %time%] Backend exited with code %ERRORLEVEL% >> "%~dp0..\backend\node_out.log"
