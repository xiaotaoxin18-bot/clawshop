# clawshop-douyin-operator 🛒

**抖音小店（抖店）后台运营自动化** — 通过 Playwright 浏览器自动化操作抖店后台。

## 功能

- 🔍 **全量商品采集**：虚拟滚动分页采集在售商品（已验证79件/4页精确）
- 📦 **批量下架/上架**：搜索 + 全选 + 弹窗确认全流程自动化
- 📊 **每日巡检**：订单数、审核驳回、商品数汇总日报
- 💾 **飞书 Bitable 同步**：商品状态写入飞书多维表格

## 快速开始

```bash
pip install -r requirements.txt
python -m playwright install chromium

# 全量采集商品
python cli.py collect

# 每日巡检
python cli.py inspect

# 批量下架
python cli.py delist "商品ID1,商品ID2"
```

## 文件结构

```
clawshop-douyin-operator/
├── cli.py                           # CLI 统一入口
├── requirements.txt                 # Python 依赖
├── douyin_operator/                 # Python 包
│   ├── __init__.py
│   ├── browser.py                   # Playwright 浏览器管理
│   ├── collector.py                 # 全量商品采集
│   ├── batch_ops.py                 # 批量上下架
│   ├── inspector.py                 # 每日巡检
│   ├── feishu_client.py             # 飞书 API 客户端
│   └── utils.py                     # 工具函数
├── scripts/
│   ├── collect_products.js          # JS 采集脚本（参考）
│   ├── batch_operations.js          # JS 批量操作（参考）
│   ├── daily_inspection.js          # JS 巡检脚本（参考）
│   └── utils.py                     # Python 工具（旧版）
└── references/
    ├── browser-automation.md        # 浏览器自动化踩坑录
    ├── strategy.md                  # 抖店运营策略手册
    ├── capabilities/                # 能力参考文档
    ├── faq/                         # FAQ 知识库
    └── errors/                      # 常见错误处理
```

## License

MIT
