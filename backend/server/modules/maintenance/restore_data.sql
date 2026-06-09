-- ============================================================
-- 库存管理系统数据恢复脚本
-- 数据库类型: PostgreSQL 14+
-- 说明: 从 backup_data.sql 生成的备份文件恢复数据
-- ============================================================

-- ============================================================
-- 使用说明:
-- 1. 确保已经执行过 backup_data.sql 并保存了输出
-- 2. 将备份文件中的 INSERT 语句复制到本脚本中
-- 3. 或者直接在 psql 中执行: \i /path/to/backup_file.sql
-- ============================================================

-- 开启事务
BEGIN;

-- ============================================================
-- 数据恢复顺序: 先恢复主表(product)，后恢复子表
-- ============================================================

-- 第 1 步: 恢复商品信息（主表）
-- 请将从 backup_data.sql 中获取的 product 表 INSERT 语句粘贴到此处

-- 示例（请替换为实际的备份数据）:
-- INSERT INTO product (id, name, code, cost_price, current_stock, safety_stock, image_attachment, category, safety_days, _created_at, _created_by, _updated_at, _updated_by) 
-- VALUES ('uuid-xxx', '商品名称', 'CODE001', 100.00, 50, 10, NULL, '分类', 7, '2024-01-01 00:00:00+00', NULL, '2024-01-01 00:00:00+00', NULL);

-- 第 2 步: 恢复订单编号
-- 请将从 backup_data.sql 中获取的 order_number 表 INSERT 语句粘贴到此处

-- 第 3 步: 恢复入库记录
-- 请将从 backup_data.sql 中获取的 inbound_record 表 INSERT 语句粘贴到此处

-- 第 4 步: 恢复出库记录
-- 请将从 backup_data.sql 中获取的 outbound_record 表 INSERT 语句粘贴到此处

-- 提交事务
COMMIT;

-- ============================================================
-- 验证恢复结果
-- ============================================================
SELECT 
    '商品信息(product)' AS table_name,
    COUNT(*) AS record_count,
    '已恢复' AS status
FROM product
UNION ALL
SELECT 
    '订单编号(order_number)',
    COUNT(*),
    '已恢复'
FROM order_number
UNION ALL
SELECT 
    '入库记录(inbound_record)',
    COUNT(*),
    '已恢复'
FROM inbound_record
UNION ALL
SELECT 
    '出库记录(outbound_record)',
    COUNT(*),
    '已恢复'
FROM outbound_record;
