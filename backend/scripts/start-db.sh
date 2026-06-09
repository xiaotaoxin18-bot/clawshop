#!/bin/bash
# =====================================================
# PostgreSQL 启动脚本（供 VS Code tasks 调用）
# =====================================================

export PGHOME=/d/code/pgsql/pgsql
export PATH=$PGHOME/bin:$PATH

if pg_isready -q 2>/dev/null; then
  echo "PostgreSQL 已在运行"
  exit 0
fi

echo "正在启动 PostgreSQL..."
"$PGHOME/bin/pg_ctl" -D /d/code/pgdata -l /d/code/pgdata/logfile start
sleep 2

if pg_isready -q 2>/dev/null; then
  echo "PostgreSQL 启动成功 ✅"
  exit 0
else
  echo "PostgreSQL 启动失败 ❌，请检查日志：/d/code/pgdata/logfile"
  exit 1
fi
