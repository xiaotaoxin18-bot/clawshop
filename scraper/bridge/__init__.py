"""
1688 选品铺货桥接模块

通过 subprocess 调用 1688-shopkeeper CLI，将结果同步到 clawshop 后端。

前置条件:
    1. git clone https://github.com/next-1688/1688-shopkeeper.git
    2. 配置环境变量 ALI_1688_AK（从 1688 AI 版 APP 获取）
    3. 可选：设置 ALI_1688_PATH 指向 1688-shopkeeper 目录

用法:
    python -m bridge.cli search --query "夏季连衣裙" --channel douyin
    python -m bridge.cli publish --shop-code CODE --data-id ID --sync
"""

__version__ = "0.1.0"
