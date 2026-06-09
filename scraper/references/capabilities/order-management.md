# 订单管理能力

> 对应 SKILL.md 中的「订单管理」和「发货中心」

## 核心 URL

| 功能 | URL |
|------|-----|
| 订单管理 | `https://fxg.jinritemai.com/ffa/morder/order/list` |
| 发货中心 | `https://fxg.jinritemai.com/ffa/morder/logistics/ewaybill-delivery` |
| 售后工作台 | `https://fxg.jinritemai.com/ffa/maftersale/aftersale/list` |

## 订单状态

| 状态 | 说明 | 行动 |
|------|------|------|
| 待付款 | 买家未付款 | 无需操作 |
| 待发货 | 已付款未发货 | 联系1688发货 |
| 已发货 | 已发货运途中 | 等待签收 |
| 已完成 | 交易完成 | 确认订单数统计 |
| 已关闭 | 订单取消 | 忽略 |
| 售后中 | 退款/退货中 | 关注售后工作台 |

## 与 1688-shopkeeper 协同

订单处理流程：
```
抖店新订单 → 1688-shopkeeper 自动搜品匹配 → 铺货提交 → 等待发货
```

## 注意事项

- 订单页数据量大时加载较慢，打开后等 2-3 秒再操作
- 不要批量操作订单，避免出错
- 售后问题引导店主自行处理，AI agent 仅做信息汇总
