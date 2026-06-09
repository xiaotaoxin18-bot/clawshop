# 库存管理系统数据清理方案

## 概述

本方案用于清理库存管理系统中的业务数据，恢复系统到初始状态（保留表结构和基础配置）。

**数据库类型**: PostgreSQL 14+  
**涉及表**: product, inbound_record, outbound_record, order_number

---

## 文件说明

| 文件名 | 用途 |
|--------|------|
| `backup_data.sql` | 数据备份脚本，生成 INSERT 语句格式的备份 |
| `cleanup_data.sql` | 数据清理脚本（基础版） |
| `cleanup_safe.sql` | 安全清理脚本（带确认码验证） |
| `restore_data.sql` | 数据恢复脚本模板 |

---

## 执行步骤

### 第一步：数据备份（必须）

在执行清理前，必须先备份数据：

```bash
# 方式 1: 使用 psql 执行并保存输出
psql -h <host> -U <user> -d <database> -f backup_data.sql > backup_$(date +%Y%m%d_%H%M%S).sql

# 方式 2: 在 psql 交互模式下执行
\i server/modules/maintenance/backup_data.sql
```

备份文件将包含：
- 所有业务数据的 INSERT 语句
- 备份统计信息（各表数据条数）

---

### 第二步：执行数据清理

#### 方式 A: 使用安全清理脚本（推荐）

```bash
# 1. 先创建清理函数
psql -h <host> -U <user> -d <database> -f cleanup_safe.sql

# 2. 在 psql 中执行清理（需要输入确认码）
psql -h <host> -U <user> -d <database>

# 执行以下命令
SELECT * FROM cleanup_inventory_data('CLEAR_DATA');

# 3. 清理完成后删除函数
DROP FUNCTION IF EXISTS cleanup_inventory_data(TEXT);
```

#### 方式 B: 使用基础清理脚本

```bash
psql -h <host> -U <user> -d <database> -f cleanup_data.sql
```

**注意**: 此脚本会显示清理前的数据统计信息，但不会自动备份。

---

### 第三步：验证清理结果

清理完成后，执行以下 SQL 验证：

```sql
-- 验证各表是否已清空
SELECT 
    'product' AS table_name, COUNT(*) AS count FROM product
UNION ALL
SELECT 'order_number', COUNT(*) FROM order_number
UNION ALL
SELECT 'inbound_record', COUNT(*) FROM inbound_record
UNION ALL
SELECT 'outbound_record', COUNT(*) FROM outbound_record;
```

预期结果：所有表的 count 都应为 0

---

## 数据恢复方案

如果清理后需要恢复数据，使用备份文件：

```bash
# 执行备份文件恢复数据
psql -h <host> -U <user> -d <database> -f backup_20240101_120000.sql
```

或者手动复制备份文件中的 INSERT 语句到 `restore_data.sql` 中执行。

---

## 安全要求

1. **备份优先**: 清理前必须执行备份脚本
2. **确认机制**: 生产环境必须使用 `cleanup_safe.sql`，需要输入确认码 `CLEAR_DATA`
3. **事务保护**: 所有操作在事务中执行，失败可回滚
4. **删除顺序**: 按 "子表 → 主表" 顺序删除，避免逻辑错误

---

## 注意事项

1. **UUID 主键**: 本系统使用 UUID 作为主键，清理后重新插入数据会生成新的 UUID
2. **系统字段**: `_created_at`, `_created_by`, `_updated_at`, `_updated_by` 为系统自动填充字段
3. **无物理外键**: 表之间没有定义外键约束，但按业务逻辑顺序删除更安全
4. **保留表结构**: 清理仅删除数据，不会删除表结构、索引、约束

---

## 常见问题

### Q: 是否可以重置自增 ID？
A: 本系统使用 UUID 作为主键，没有自增 ID 概念。如需重置序列（sequence），执行：
```sql
ALTER SEQUENCE IF EXISTS product_id_seq RESTART WITH 1;
```

### Q: 清理后页面显示异常？
A: 清理后需要刷新前端页面，清除浏览器缓存。

### Q: 是否可以部分清理？
A: 可以，修改 SQL 语句添加 WHERE 条件即可，例如：
```sql
DELETE FROM product WHERE created_at < '2024-01-01';
```
