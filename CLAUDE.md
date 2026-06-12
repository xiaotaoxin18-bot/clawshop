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
set NGROK_PATH=D:\ngrok\ngrok.exe
```

> 如果 `NGROK_PATH` 未设置且 ngrok 不在 PATH 中，启动脚本会自动尝试 `D:\ngrok\ngrok.exe` 作为备用路径。

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
2. PostgreSQL（端口 5432）— 用 `pg_isready` 轮询等待真正就绪（最长 60 秒）
3. 后端（生产模式，`node dist/server/main.js`，端口 3000，含前端页面和 API）— 等待 8 秒
4. ngrok（公网隧道 → 端口 3000）

> ⚠️ **已知问题**：电脑非正常关机（强制关机/断电）会导致 `data/pgdata/postmaster.pid` 锁文件残留，下次开机 PostgreSQL 无法启动，连锁导致后端也起不来。`startup.bat` 已内置自动清理逻辑，启动数据库前会检查并删除残留的 `postmaster.pid`。
>
> 另外，PostgreSQL 异常崩溃后恢复可能耗时较长（30 秒以上）。2026-06-11 修复：启动脚本已从固定等待 5 秒改为 `pg_isready` 轮询，最多等 60 秒，确保 PostgreSQL 完全就绪后才启动后端。
>
> 2026-06-12 增强：`start-all.bat` 和 `startup.bat` 增加 PostgreSQL 崩溃自动恢复能力。当 `pg_isready` 检测失败时，自动检测并用 `wmic` 强杀残留 `postgres.exe` 进程，清理共享内存段，然后重新启动 PostgreSQL。

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

> ⚠️ **Windows 兼容**：`package.json` 中的脚本已移除 `NODE_ENV=production` 前缀（Unix 语法，Windows 不兼容），`rspack build --env mode=production` 已足够设置生产模式。如果在 cmd.exe 下直接运行，用 `set NODE_ENV=production && command` 语法。

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

> ⚠️ **clean-html.js 注意事项**：只能移除 Feishu SDK 注入脚本（Slardar/Tea/Performance）和内联配置脚本（`__platform__`/`csrfToken`），**不能**移除 rspack 的 CSS 浏览器检测脚本（`isModernBrowser`）和 polyfill 检测脚本（`needsPolyfill`），否则页面无法加载 CSS，布局会完全错乱。

## 采集流程

### 数据流向

```
scraper cli.py daily-push [--shop-id <店铺ID>]
  → 采集抖店在售商品（名称/ID/售价/库存/销量/体验分）
  → 巡检订单数/驳回数/订单状态
  → 采集商品评价（总数/好评率）
  → 对比上次数据找出新增/下架/销量变化
  → POST /api/douyin/scrape/push-daily  （携带 shop_id）
  → backend 写入 PostgreSQL（按 shop_id 隔离）
       ├── product（商品表，同步实时数据，含售价/销量/库存）
       ├── inbound_record（新商品 → 自动入库）
       ├── outbound_record（销量变化 → 自动出库）
       ├── alert_record（库存为0 → 自动预警）
       └── douyin_daily_snapshot（每日快照）
```

### 列映射

抖店商品管理页的列顺序为：**售价 → 库存 → 销量 → 体验分**

采集器 `collector.py` 的 JS 提取逻辑：

```javascript
const cells = r.querySelectorAll('td');
const priceText   = cells[2].innerText;  // 售价
const stockText   = cells[3].innerText;  // 库存（第4列）
const saleText    = cells[4].innerText;  // 销量（第5列）
const categoryText = cells[5].innerText; // 体验分
```

> **注意**：2026-06-11 之前采集的销量和库存数据是反的（第4列误读为销量，第5列误读为库存）。已修复 `collector.py`，下次采集后数据恢复正常。历史数据需重新采集或手动修复数据库。

## 导航结构

```
📊 抖店看板      ← 全局 KPI 总览（含商品名称分布、店铺分布图表）
📦 商品管理       ← 抖店真实商品（售价/销量/库存，可删除）
⬇ 入库管理       ← 新商品自动生成入库记录
⬆ 出库管理       ← 销量变化自动生成出库记录
📈 经营数据       ← 销量趋势分析
🛍 抖店概览       ← 采集详情/评价/订单状态 + 手动采集 + 店铺管理
🔔 预警中心       ← 库存预警

系统设置
  ⚙ 预警阈值
  👤 个人管理     ← 一键清除数据（需密码）
```

## Windows 定时任务

| 任务名 | 触发 | 动作 |
|--------|------|------|
| `clawshop-startup` | 用户登录（延迟30秒） | 启动 DB + 后端 + ngrok |
| `clawshop-daily-push-am` | 每天 09:00 | 采集抖店 → 推后端 |
| `clawshop-daily-push-pm` | 每天 21:00 | 同上（第二次） |
| 启动文件夹 ngrok.bat | 用户登录 | 后台启动 ngrok 隧道 |

> 多店铺场景：定时任务需要为每个店铺分别注册，或手动触发采集。

## 登录态

- `scraper/edge_profile/` — 浏览器完整 profile
- `scraper/cookies.json` — 默认店铺 cookie（自动保存/恢复）
- `scraper/cookies_{shop_id}.json` — 多店铺时每个店铺独立的 cookie
- 首次运行需要扫码登录一次，后续自动恢复

## 手动触发采集

前端「抖店概览」页有 **手动采集** 按钮，点击后后端通过 `child_process` 调用 Python 采集器：

```
前端按钮 → POST /api/douyin/scrape/trigger { shop_id }
         → 后端 spawn python cli.py daily-push --api-url ...
         → 浏览器自动打开执行采集
         → 采集完成后数据自动推送到后端
         → 前端 10 秒后自动刷新
```

## 店铺管理

在「抖店概览」页点击齿轮图标打开店铺管理弹窗：

- **添加店铺** — 输入店铺 ID 和名称，创建独立采集配置
- **删除店铺** — 级联删除该店铺的所有商品、入库/出库/预警记录和快照
- **选择店铺** — 下拉框选择目标店铺后点击"手动采集"

每个店铺的数据完全隔离：

| 维度 | 隔离方式 |
|------|---------|
| 采集器 | 独立 `cookies_{shop_id}.json` + `products_{shop_id}.json` |
| 快照 | `(shop_id, date)` 唯一键，同一天不同店铺各自一条记录 |
| 商品 | 按 `(shop_id, douyin_product_id)` 匹配，不同店铺同 ID 不冲突 |
| 入库/出库/预警 | 都带 `shop_id` 字段 |

## 一键清除数据

在「个人管理」页底部，密码验证后清除所有数据（商品/入库/出库/预警/快照）。
默认密码 `admin123`，可在 `.env` 中修改 `ADMIN_CLEAR_PASSWORD`。

## 1688 选品铺货整合（规划中）

### 背景

[1688-shopkeeper](https://github.com/next-1688/1688-shopkeeper) 是 1688 官方开源的 Claw Skill，提供 1688 选品 + 一键铺货（抖店/拼多多/小红书/淘宝）能力。将其与 clawshop 整合可形成完整电商自动化链路：

```
1688 货源（1688-shopkeeper） → 铺到抖店 → clawshop 运营管理
```

### 架构方案

推荐 **CLI 桥接 + API 网关** 组合方案，分三阶段实施：

#### Phase 1：CLI 桥接（scraper/bridge/）✅ 已完成

在 `scraper/` 下新增 `bridge/` 目录，通过 subprocess 调用 1688-shopkeeper CLI：

```
scraper/bridge/
├── __init__.py
├── alibaba.py          # 封装 subprocess 调用 1688-shopkeeper 的命令
├── sync.py             # 将铺货结果 POST 到 backend API（写入 product/inbound 表）
└── cli.py              # 统一桥接入口
```

```bash
# 示例用法（从 scraper/ 目录运行）
python -m bridge.cli search --query "夏季连衣裙" --channel douyin
python -m bridge.cli publish --shop-code CODE --data-id ID --sync
```

**前置条件：** 本地安装 1688-shopkeeper，配置 `ALI_1688_AK` 环境变量。

#### Phase 2：API 网关（backend alibaba 模块）

backend 新增 `alibaba` 模块，将 1688 CLI 封装为 REST API：

```
backend/server/modules/alibaba/
├── alibaba.module.ts        # NestJS 模块声明
├── alibaba.controller.ts    # REST API 路由
├── alibaba.service.ts       # 调用 Python CLI（child_process）
└── schemas/                 # 请求/响应 DTO
```

前端新增页面：

```
backend/client/src/pages/AlibabaPage/
├── index.tsx                # 1688 选品页主入口
├── SearchPanel.tsx          # 搜索 + 结果列表
├── ProductDetail.tsx        # 商品详情
├── PublishDialog.tsx        # 铺货弹窗（选择目标店铺）
└── TrendPanel.tsx           # 商机趋势
```

**铺货成功后的自动流程：**
```
publish → 成功 → POST /api/alibaba/publish-callback
  → 自动 INSERT product (name, douyin_product_id, sale_price, status='active')
  → 自动 INSERT inbound_record（入库记录）
  → 自动 INSERT douyin_daily_snapshot（快照）
  → 下次 scraper 采集时已知该商品，直接追踪销量变化
```

#### Phase 3：事件驱动（可选增强）

引入简单事件机制，消除数据空窗期：

```
publish 成功 → EventEmitter
  ├─→ 入库（即时写入 product/inbound 表）
  ├─→ 通知 scraper 立即采集该商品（建立销量基线）
  └─→ Push 通知（看板提示有新商品）
```

### 整合数据流

```
1688-shopkeeper CLI             clawshop
═══════════════════             ═══════════
search ──────────→ bridge/alibaba.py ─→ 返回搜索结果
publish ─────────→ bridge/alibaba.py ─→ POST /api/alibaba/publish
                                              │
               bridge/sync.py ←───────────────┘
                      │
                      ├── product 表（新增商品）
                      ├── inbound_record（入库）
                      └── douyin_daily_snapshot（快照）
                            
定时采集（daily-push）  →  发现已有该商品 → 追踪销量/库存变化
                      →  自动出库/预警
```

### 定时任务扩展

| 任务 | 触发 | 说明 |
|------|------|------|
| clawshop-daily-push-am | 09:00 | 采集抖店（含 1688 铺货商品） |
| clawshop-daily-push-pm | 21:00 | 同上 |
| clawshop-1688-search   | 08:00（可选） | 自动选品策略 |
| clawshop-1688-publish  | 08:30（可选） | 自动铺货 |

### 依赖关系

- 需安装 1688-shopkeeper（`git clone` + 配置 `ALI_1688_AK`）
- 需 1688 AI 版 APP 获取 AK
- bridge 模块依赖 Python 3 + requests 库
- backend alibaba 模块通过 `child_process.exec` 调用 Python CLI

## 注意事项

- 服务均为后台运行，关终端不影响，重启电脑后自动拉起
- 数据库文件在 `data/` 下，不要手动删除
- CSRF 已禁用（框架代码 patch），仅用于内部/ngrok 环境
- ngrok 免费版每次启动地址会变，飞书网页应用需更新 H5 可信域名并重新发布
- 采集器运行时会打开浏览器（`--edge`），首次需扫码登录
- 本机运行，关电脑后飞书网页应用无法访问。如需 24 小时在线需部署到云服务器
- **非正常关机（强制关机/断电）** 会导致 PostgreSQL 的 `data/pgdata/postmaster.pid` 锁文件残留，下次开机三个服务中可能只有 ngrok 起来。表现为飞书 ERR_FAILED（-2 502）。`startup.bat` 已内置自动清理逻辑，如遇此情况可手动运行一次 `start-all.bat` 或重启电脑
- **ERR_NGROK_3200**：通过 ngrok 域名访问时如果看到这个错误，说明后端没启动（ngrok 隧道活着但代理不到 localhost:3000）。先检查 `localhost:3000` 能否打开，若不能则运行 `scripts\start-all.bat` 启动后端
- **首次部署需要运行数据库迁移**：`drizzle/0001_douyin_tables.sql` 创建抖店相关表（`douyin_config`、`douyin_order_sync`、`douyin_sync_log`），创建后需关闭 RLS：`ALTER TABLE douyin_config DISABLE ROW LEVEL SECURITY;`（以及另外两张表）
- **已有商品无 shop_id**：2026-06-11 之前采集的商品没有 `shop_id` 字段，不会出现在按店铺分布图表中。重新采集一次即可
- **销量/库存采反**：2026-06-11 修复了 `collector.py` 中抖店页面的列读取顺序（售价→库存→销量→体验分），历史已采集的数据中 `sales_count` 和 `current_stock` 相反。已执行 SQL 修复，后续采集数据正常
- **批处理文件换行符**：`scripts/*.bat` 文件必须使用 **CRLF**（Windows 换行符），如果使用 LF（Unix 换行符）双击会闪退。修改后用 `sed -i 's/$/\r/' file.bat` 或 VSCode 切换换行符。`start ""` 启动批处理文件时用 `start "" "path\to\file.bat"`，不要用 `start "title" cmd /c "..."` 嵌套 `cmd /c`
- **启动脚本使用 Windows 原生命令**：`start-all.bat` 和 `startup.bat` 中使用的 `find`、`tasklist` 等命令需使用 `%SystemRoot%\System32\find.exe` 等全路径，避免被 Git Bash 的 Unix `find` 截获
