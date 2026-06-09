#!/bin/bash
# =====================================================
# 开发环境启动脚本
# 确保环境变量正确设置，避免常见问题
# =====================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# 加载 .env 文件
export $(grep -v '^#' .env | xargs)

# 关键环境变量（确保有兜底值）
export SUDA_DATABASE_URL="${SUDA_DATABASE_URL:-postgresql://appuser:changeme@localhost:5432/inventory_db?schema=workspace_aadkeahc42wbs}"
export FORCE_AUTHN_INNERAPI_DOMAIN="${FORCE_AUTHN_INNERAPI_DOMAIN:-localhost:3000}"
export NODE_ENV="${NODE_ENV:-development}"

# PostgreSQL 路径
export PGHOME=/d/code/pgsql/pgsql
export PATH=$PGHOME/bin:$PATH

echo "========================================"
echo "  库存管理系统 - 开发环境启动"
echo "========================================"
echo "SUDA_DATABASE_URL: $SUDA_DATABASE_URL"
echo "FORCE_AUTHN_INNERAPI_DOMAIN: $FORCE_AUTHN_INNERAPI_DOMAIN"
echo "SERVER_PORT: $SERVER_PORT"
echo "CLIENT_DEV_PORT: $CLIENT_DEV_PORT"
echo "========================================"
echo ""

# 确保 PostgreSQL 在运行
echo "[1/3] 检查 PostgreSQL..."
if pg_isready -q 2>/dev/null; then
  echo "  ✅ PostgreSQL 已运行"
else
  echo "  ⚠️  PostgreSQL 未运行，正在启动..."
  pg_ctl -D /d/code/pgdata -l /d/code/pgdata/logfile start
  sleep 3
  if pg_isready -q 2>/dev/null; then
    echo "  ✅ PostgreSQL 启动成功"
  else
    echo "  ❌ PostgreSQL 启动失败，请检查 /d/code/pgdata/logfile"
    exit 1
  fi
fi

# 启动前端
echo "[2/3] 启动前端 (Rspack)..."
npx rspack serve --config rspack.config.js --env mode=development &
CLIENT_PID=$!
echo "  ✅ 前端启动中（PID: $CLIENT_PID）→ http://localhost:${CLIENT_DEV_PORT:-8080}"

# 等待前端就绪
sleep 5

# 启动后端
echo "[3/3] 启动后端 (NestJS)..."
npx nest start --watch &
SERVER_PID=$!
echo "  ✅ 后端启动中（PID: $SERVER_PID）→ http://localhost:${SERVER_PORT:-3000}"

echo ""
echo "========================================"
echo "  启动完成！"
echo "  前端: http://localhost:${CLIENT_DEV_PORT:-8080}"
echo "  后端: http://localhost:${SERVER_PORT:-3000}"
echo "  按 Ctrl+C 停止所有服务"
echo "========================================"

# 捕获 Ctrl+C 优雅退出
trap "echo '正在停止服务...'; kill $CLIENT_PID $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# 等待子进程
wait
