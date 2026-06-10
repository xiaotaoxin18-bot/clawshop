# clawshop 项目文档

## 快速开始（给新人）

### 前置依赖
- **Node.js** >= 22（[下载](https://nodejs.org/)）
- **npm** >= 10（安装 Node.js 自带）
- **PostgreSQL** 16（已内置在 `data/pgsql/`，或[官网下载](https://www.postgresql.org/download/)）
- **ngrok**（可选，外网访问需要）

### 首次初始化
```bash
# 1. 克隆项目到任意目录
git clone <仓库地址>
cd clawshop

# 2. 运行初始化脚本（自动安装依赖 + 构建 + 初始化数据库）
scripts\setup.bat

# 3. 启动项目
scripts\start-all.bat

# 4. 访问
#    本地: http://localhost:3000
```

> `setup.bat` 会引导你完成全部设置，包括创建数据库和导入演示数据。

### 日常启动
| 场景 | 操作 |
|------|------|
| 手动启动 | `scripts\start-all.bat` |
| 开机自启 | 右键 `scripts\register-task.bat` → 以管理员身份运行 |
| 停止服务 | `scripts\stop-all.bat` |

### ngrok 配置（外网访问）
设置环境变量 `NGROK_PATH` 指向 ngrok 可执行文件，或确保 ngrok 在 PATH 中：
```bash
set NGROK_PATH=D:\tools\ngrok.exe
```

## 目录结构

```
D:\clawshop\
├── backend\            # NestJS 后端 + React 前端
│   ├── .env.example    # 环境变量模板（复制为 .env）
│   ├── fix_roles.sql   # 数据库角色初始化
│   ├── seed.sql        # 演示数据
│   └── scripts\
│       └── dev.sh      # 开发模式（npm run dev）
├── scraper\            # Python 浏览器采集工具
├── data\               # 数据库文件
│   ├── pgdata\         # PostgreSQL 数据目录（.gitignore 忽略）
│   └── pgsql\          # PostgreSQL 程序（.gitignore 忽略）
└── scripts\            # 启动/管理脚本（所有脚本已用相对路径，可放任意目录）
    ├── start-all.bat   # 一键启动
    ├── stop-all.bat    # 停止所有
    ├── startup.bat     # 开机自启（Task Scheduler 调用）
    ├── setup.bat       # 首次初始化
    ├── register-task.bat     # 注册开机自启
    ├── register-autostart.bat # 高级自启注册（含构建）
    ├── start-db.bat         # 仅启动数据库
    ├── start-backend.bat    # 仅启动后端
    └── start-ngrok.bat      # 仅启动 ngrok
```

## 工作关系

| 项目 | 职责 | 启动方式 |
|------|------|---------|
| `backend` | 数据存储 + API + Web UI | `node dist/server/main.js` |
| `scraper` | 浏览器自动化采集抖店数据 | `python cli.py <命令>` |
| `data` | PostgreSQL 数据库实例 | `pg_ctl -D data/pgdata start` |

## 启动与停止

```bash
# 一键启动（数据库 + 后端 + ngrok）
scripts\start-all.bat

# 分开启动
scripts\start-db.bat                          # 1. 数据库
scripts\start-backend.bat                     # 2. 后端 (生产模式, port 3000)
scripts\start-ngrok.bat                       # 3. ngrok 公网隧道 (指向 port 3000)

# 一键停止
scripts\stop-all.bat
```

> **服务均为后台运行**，关掉终端 / VS Code 不影响。重启电脑后开机自启 30 秒自动拉起。

## 开机自启

| 方式 | 触发 | 启动内容 |
|------|------|---------|
| `scripts\register-task.bat` | 登录后 30 秒（需管理员权限） | `startup.bat` → DB + 后端 + ngrok |
| `scripts\startup.bat` | 由 Task Scheduler 调用 | 启动全部 3 个服务 |
| 启动文件夹 `ngrok.bat` | 登录时 | 仅启动 ngrok（冗余备份） |

开机自启的自动启动顺序（由 `startup.bat` 执行）：
1. 清理残留的 PostgreSQL 锁文件（防止非正常关机导致启动失败）
2. PostgreSQL（端口 5432）— 等待 5 秒
3. 后端（生产模式，`node dist/server/main.js`，端口 3000，含前端页面和 API）— 等待 8 秒
4. ngrok（公网隧道 → 端口 3000）

> ⚠️ **已知问题**：电脑非正常关机（强制关机/断电）会导致 `data/pgdata/postmaster.pid` 锁文件残留，下次开机 PostgreSQL 无法启动，连锁导致后端也起不来。`startup.bat` 已内置自动清理逻辑，启动数据库前会检查并删除残留的 `postmaster.pid`。

## 管理脚本

| 脚本 | 功能 |
|------|------|
| `scripts\setup.bat` | 首次初始化（安装依赖 + 构建 + 初始化数据库） |
| `scripts\start-all.bat` | 一键启动所有服务 |
| `scripts\stop-all.bat` | 停止所有服务 |
| `scripts\startup.bat` | 开机自启（由 Task Scheduler 调用） |
| `scripts\register-task.bat` | 注册开机自启（需管理员权限） |
| `scripts\start-db.bat` | 仅启动 PostgreSQL |
| `scripts\start-backend.bat` | 仅启动后端 |
| `scripts\start-ngrok.bat` | 仅启动 ngrok |

## 开发模式

修改前端/后端代码后实时生效（无需重复构建）：

```bash
cd backend
npm run dev
# 前端 http://localhost:8080（热更新）
# 后端 http://localhost:3000（热重载）
```

> `npm run dev` 由 `scripts/dev.sh` 驱动，自动检查 PostgreSQL、同时启动前后端开发服务器。

## 生产构建

```bash
cd backend
npm run build:client     # rspack build + clean-html.js（构建前端 + 自动清理）
npm run build:server     # npx nest build（编译后端 TypeScript）
```

修改代码后的完整重启流程：
```bash
cd backend
npm run build:client     # 如果改了前端代码
npm run build:server     # 如果改了后端代码
# 重建后用 start-all.bat 重启，或 kill node 进程后重新运行 node dist/server/main.js
```

## 飞书网页应用

### 外网访问

通过 ngrok 将本地 3000 端口映射到公网（需先安装 ngrok 并配置 `NGROK_PATH` 环境变量，或确保在 PATH 中）：

```bash
scripts\start-ngrok.bat
# → https://xxx.ngrok-free.dev
```

ngrok 免费版每次重启地址会变，需要在飞书开放平台更新：
1. 安全设置 → H5 可信域名 → 更新新地址
2. 版本管理与发布 → 创建版本 → 重新发布

### 多人访问

- 飞书应用需**创建版本并发布**，设置可用范围
- 服务跑在本机，**关电脑后就无法访问**
- 需 24 小时在线 → 部署到云服务器

### 白屏排查（已修复）

**问题**：飞书内嵌 WebView 显示"第三方模块干扰"白屏
**根因**：内联 `<script>` 设置 `window.csrfToken`、`window.appId` 等飞书保留属性触发安全检测
**修复方案**：
1. `server/main.ts` — Express 路由 `/platform-config.js` 用外部 JS 设置平台配置
2. `scripts/clean-html.js` — 构建后清除内联脚本和注入的 SDK 脚本
3. `rspack.config.js` — `resolve.alias` 替换 `@lark-apaas/*` 为本地桩模块
4. `client/src/stubs/` — 8 个桩模块 + runtime + observable-web 包屏蔽

## 采集流程

```
scraper cli.py daily-push
  → 采集抖店在售商品（名称/ID/售价/库存/销量/体验分）
  → 巡检订单数/驳回数/订单状态
  → 采集商品评价（总数/好评率）
  → 对比上次数据找出新增/下架/销量变化
  → POST /api/douyin/scrape/push-daily
  → backend 写入 PostgreSQL
       ├── product（商品表，同步实时数据，含售价/销量/库存）
       ├── inbound_record（新商品 → 自动入库）
       ├── outbound_record（销量变化 → 自动出库）
       ├── alert_record（库存为0 → 自动预警）
       └── douyin_daily_snapshot（每日快照）
  → 飞书 Bitable（自动同步 4 张子表）
```

## 导航结构

```
📊 抖店看板      ← 全局 KPI 总览（实时数据）
📦 商品管理       ← 抖店真实商品（售价/销量/库存，可删除）
⬇ 入库管理       ← 新商品自动生成入库记录
⬆ 出库管理       ← 销量变化自动生成出库记录
📈 经营数据       ← 销量趋势分析
🛍 每日快照       ← 采集详情/评价/订单状态
🔔 预警中心       ← 库存预警

系统设置
  ⚙ 预警阈值
  👤 个人管理     ← 一键清除数据（需密码）
```

## 飞书集成

| 表名 | 字段 | 同步时机 |
|------|------|---------|
| 商品明细 | 商品名称/ID/售价/库存/累计销量/上架日期/体验分/状态 | 每次采集 |
| 每日汇总 | 采集日期/在售商品/今日订单/审核驳回/新增/下架 | 每天一条 |
| 入库记录 | 商品名称/数量/入库时间 | 新商品自动 |
| 出库记录 | 商品名称/销量变化/累计销量/出库时间 | 销量变化自动 |

配置方式：在 `.env` 中设置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。
飞书配置保存在 `scraper/feishu_config.json`，首次运行自动创建多维表格。

## Windows 定时任务

| 任务名 | 触发 | 动作 |
|--------|------|------|
| `clawshop-startup` | 用户登录（延迟30秒） | 启动 DB + 后端 + ngrok |
| `clawshop-daily-push-am` | 每天 09:00 | 采集抖店 → 推后端 → 写飞书 |
| `clawshop-daily-push-pm` | 每天 21:00 | 同上（第二次） |
| 启动文件夹 ngrok.bat | 用户登录 | 后台启动 ngrok 隧道 |

## 登录态

- `scraper/edge_profile/` — 浏览器完整 profile
- `scraper/cookies.json` — 45 个抖店 cookie（自动保存/恢复）
- 首次运行需要扫码登录一次，后续自动恢复

## 一键清除数据

在「个人管理」页底部，密码验证后清除所有数据（商品/入库/出库/预警/快照）。
默认密码 `admin123`，可在 `.env` 中修改 `ADMIN_CLEAR_PASSWORD`。

## 注意事项

- 服务均为后台运行，关终端不影响，重启电脑后自动拉起
- 数据库文件在 `data/` 下，不要手动删除
- CSRF 已禁用（框架代码 patch），仅用于内部/ngrok 环境
- ngrok 免费版每次启动地址会变，飞书网页应用需更新 H5 可信域名并重新发布
- 采集器运行时会打开浏览器（`--edge`），首次需扫码登录
- 本机运行，关电脑后飞书网页应用无法访问。如需 24 小时在线需部署到云服务器
- **非正常关机（强制关机/断电）** 会导致 PostgreSQL 的 `data/pgdata/postmaster.pid` 锁文件残留，下次开机三个服务中可能只有 ngrok 起来。表现为飞书 ERR_FAILED（-2 502）。- `startup.bat` 已内置自动清理逻辑，如遇此情况可手动运行一次 `start-all.bat` 或重启电脑
