@echo off
chcp 65001 >nul
cd /d D:\clawshop\backend

echo 启动后端 (生产模式)...
set SUDA_DATABASE_URL=postgresql://appuser:app123456@localhost:5432/inventory_db?schema=workspace_aadkeahc42wbs
set FORCE_AUTHN_INNERAPI_DOMAIN=localhost:3000
set NODE_ENV=production
node dist/server/main.js
