# 🦀 clawshop — 抖店运营自动化平台

> 浏览器直采抖店数据 → 后端存储 → 前端看板 + 飞书自动同步

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](https://www.python.org/)
[![Rspack](https://img.shields.io/badge/Rspack-1.0-1B87E9)](https://www.rspack.dev/)

## 📋 功能概览

| 模块 | 功能 |
|------|------|
| 📊 **抖店看板** | 全局 KPI 总览，实时展示销售额、订单量、商品数等核心指标 |
| 📦 **商品管理** | 同步抖店在售商品，查看售价 / 销量 / 库存 / 体验分，支持删除 |
| ⬇ **入库管理** | 新增商品自动生成入库记录，库存变化一目了然 |
| ⬆ **出库管理** | 销量变化自动生成出库记录，追踪商品流转 |
| 📈 **经营数据** | 销量趋势分析，可视化展示销售走势 |
| 🛍 **每日快照** | 采集详情 / 商品评价 / 订单状态 / 审核信息 |
| 🔔 **预警中心** | 库存为 0 自动预警，阈值可配置 |
| 📱 **飞书同步** | 多维表格自动同步商品、入库、出库、每日汇总数据 |
| 🤖 **定时采集** | 每天 09:00 / 21:00 自动采集抖店数据 |

## 🏗 技术栈

| 层 | 技术 |
|------|------|
| **采集** | Python + Playwright（浏览器自动化） |
| **后端** | NestJS 10 + TypeScript + Drizzle ORM |
| **前端** | React 19 + Rspack + ECharts + Ant Design |
| **数据库** | PostgreSQL 16 |
| **同步** | 飞书 Bitable API |
| **公网** | ngrok（开发时映射本地服务到公网） |

## 📁 目录结构

```
D:\clawshop\
├── backend\               # 后端 + 前端
│   ├── server\            # NestJS 服务端
│   │   ├── main.ts        # 入口 + Express 配置
│   │   ├── modules\       # 业务模块（商品/入库/出库/预警/抖店/系统配置）
│   │   └── database\       # Drizzle ORM schema + 迁移
│   ├── client\            # React 前端
│   │   ├── src\           # 组件/页面/API 调用
│   │   └── index.html     # HTML 入口
│   ├── rspack.config.js   # Rspack 构建配置
│   └── package.json
│
├── scraper\               # Python 浏览器采集
│   ├── cli.py             # CLI 入口
│   ├── douyin_operator\   # 采集逻辑（商品/订单/评价/快照）
│   └── requirements.txt
│
├── scripts\               # 启动/管理脚本
│   ├── start-all.bat      # 一键启动（数据库 + 后端 + ngrok）
│   ├── stop-all.bat       # 停止所有服务
│   ├── start-db.bat       # 启动 PostgreSQL
│   ├── start-backend.bat  # 启动后端
│   ├── start-ngrok.bat    # 启动 ngrok
│   └── register-task.bat  # 注册 Windows 开机自启
│
├── data\                  # 数据库文件（本地，不提交）
│   ├── pgdata\            # PostgreSQL 数据目录
│   └── pgsql\             # PostgreSQL 程序
│
├── .env                   # 环境变量（本地配置，不提交）
├── CLAUDE.md              # 项目开发文档
└── README.md
```

## 🚀 本地启动

### 前置条件

- Node.js 20+
- Python 3.12+
- PostgreSQL 16（或使用 `data/pgsql/` 自带）

### 1. 数据库

```bash
export PGHOME=/d/clawshop/data/pgsql/pgsql
"$PGHOME/bin/pg_ctl" -D /d/clawshop/data/pgdata -l /d/clawshop/data/pgdata/logfile start
```

或双击 `scripts\start-db.bat`

### 2. 后端 + 前端

```bash
cd backend
npm install
npm run build:server      # 编译后端 TypeScript
npm run build:client      # 构建前端
node dist/server/main.js  # 启动（端口 3000）
```

开发模式：
```bash
npx nest start --watch    # 后端热重载
npx rspack serve          # 前端开发服务器
```

### 3. 数据采集

```bash
cd scraper
pip install -r requirements.txt
python cli.py collect --edge    # 采集抖店数据
python cli.py daily-push        # 采集 + 推送数据库 + 飞书
```

## 🔄 数据流

```
浏览器采集（每天自动）
  → scraper/cli.py daily-push
  → POST /api/douyin/scrape/push-daily
  → backend 写入 PostgreSQL
       ├── product          商品表（实时售价/销量/库存）
       ├── inbound_record   新商品 → 自动入库
       ├── outbound_record  销量变化 → 自动出库
       ├── alert_record     库存为0 → 自动预警
       └── douyin_daily_snapshot  每日快照
  → 飞书 Bitable（自动同步 4 张子表）

前端看板 / 飞书多维表格 ← 查看数据
```

## ⏰ 定时任务

| 任务 | 触发 | 动作 |
|------|------|------|
| 服务自启 | 用户登录后 30s | PostgreSQL + 后端 + ngrok |
| 早间采集 | 每天 09:00 | 采集抖店 → 推后端 → 飞书 |
| 晚间采集 | 每天 21:00 | 同上 |

## 📱 飞书集成

- 配置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 到 `.env`
- 首次运行自动创建多维表格
- 同步 4 张子表：商品明细 / 每日汇总 / 入库记录 / 出库记录
- 可通过 ngrok + 飞书网页应用在外网访问

## 🔧 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://postgres:postgres@localhost:5432/clawshop` |
| `FEISHU_APP_ID` | 飞书应用 ID | — |
| `FEISHU_APP_SECRET` | 飞书应用 Secret | — |
| `ADMIN_CLEAR_PASSWORD` | 一键清除数据密码 | `admin123` |

## 📄 许可证

MIT
