# 🦀 clawshop — 抖店运营自动化平台

> 浏览器直采抖店数据 → 后端存储 → 前端看板

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
| 🤖 **定时采集** | 每天 09:00 / 21:00 自动采集抖店数据 |

## 🏗 技术栈

| 层 | 技术 |
|------|------|
| **采集** | Python + Playwright（浏览器自动化） |
| **后端** | NestJS 10 + TypeScript + Drizzle ORM |
| **前端** | React 19 + Rspack + ECharts + Ant Design |
| **数据库** | PostgreSQL 16 |
| **公网** | ngrok（映射本地服务到公网） |


## 📁 目录结构

```
clawshop/
├── backend\                    # NestJS 后端 + React 前端
│   ├── .env.example            # 环境变量模板
│   ├── server\                 # 后端源码
│   ├── client\                 # 前端源码
│   ├── scripts\
│   │   └── dev.sh              # 开发模式入口
│   ├── fix_roles.sql           # 数据库角色初始化
│   └── seed.sql                # 演示数据
│
├── scraper\                    # Python 浏览器采集
│   ├── cli.py                  # CLI 入口（collect/inspect/daily-push）
│   ├── douyin_operator\        # 采集逻辑
│   └── requirements.txt
│
├── scripts\                    # 启动/管理脚本（相对路径，可放任意目录）
│   ├── setup.bat               # ★ 首次初始化
│   ├── start-all.bat           # ★ 一键启动
│   ├── stop-all.bat            # ★ 停止服务
│   ├── startup.bat             # 开机自启（Task Scheduler 调用）
│   ├── register-task.bat       # 注册开机自启
│   ├── start-db.bat            # 仅启动数据库
│   ├── start-backend.bat       # 仅启动后端
│   └── start-ngrok.bat         # 仅启动 ngrok
│
├── data\                       # 数据库文件（.gitignore 忽略）
│   ├── pgdata\                 # PostgreSQL 数据目录
│   └── pgsql\                  # PostgreSQL 程序
│
├── CLAUDE.md                   # 项目开发文档
└── README.md
```

> 所有 `.bat` 脚本使用 `%~dp0` 相对路径，项目可以放到任意目录运行。

## 🔄 数据流

```
浏览器采集（每天自动）
  → scraper/cli.py daily-push
  → POST /api/douyin/scrape/push-daily
  → backend 写入 PostgreSQL
       ├── product             商品表（实时售价/销量/库存）
       ├── inbound_record      新商品 → 自动入库
       ├── outbound_record     销量变化 → 自动出库
       ├── alert_record        库存为0 → 自动预警
       └── douyin_daily_snapshot  每日快照

前端看板 ← 查看数据
```

## 🔗 未来规划：与 1688 选品铺货打通

计划将 [1688-shopkeeper](https://github.com/next-1688/1688-shopkeeper)（1688 官方开源的选品铺货 Skill）与 clawshop 整合，形成"1688 选品 → 铺货到抖店 → clawshop 自动运营管理"的完整闭环。

### 整合数据流（规划中）

```
1688 选品（1688-shopkeeper search）
  → 选择货源
  → 一键铺货到抖店（1688-shopkeeper publish）
  → 铺货结果同步到 clawshop bridge
  → 自动写入 product 表 + 生成 inbound_record
  → clawshop 定时采集时发现该商品 → 追踪销量变化
  → 自动出库/预警/快照

Web UI 端：
  📦 商品管理        ← 新增"来自1688"标签
  🆕 1688 选品页     ← 新增页面，嵌入搜索/铺货/趋势功能
```

### 实施路线（三阶段）

| 阶段 | 内容 | 核心价值 |
|:----:|------|---------|
| **Phase 1** | `scraper/bridge/` CLI 桥接，调用 1688 CLI 并同步结果到后端 | 快速打通，手工可操作 |
| **Phase 2** | backend 新增 `alibaba` 模块 + Web UI「1688 选品」页面 | 一站式 UI 操作 |
| **Phase 3** | 事件驱动：铺货成功 → 自动触发采集 → 出入库 | 全自动化闭环 |

### 涉及新增组件

| 组件 | 位置 | 说明 |
|------|------|------|
| `bridge/` | `scraper/bridge/` | Python 桥接模块，封装 1688 CLI 调用 |
| `alibaba/` | `backend/server/modules/alibaba/` | NestJS 模块，封装桥接 API |
| 1688 选品页 | `backend/client/src/pages/AlibabaPage/` | 前端选品/铺货 UI |

## ⏰ 定时任务

## 🔧 环境变量（`backend/.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SUDA_DATABASE_URL` | PostgreSQL 连接串 | `postgresql://appuser:...` |
| `FORCE_AUTHN_INNERAPI_DOMAIN` | 飞书平台基础域名 | `localhost:3000` |
| `ADMIN_CLEAR_PASSWORD` | 一键清除数据密码 |
| `NGROK_PATH` | ngrok 路径（系统环境变量） | `ngrok`（默认 PATH） |

## 📄 许可证

MIT
