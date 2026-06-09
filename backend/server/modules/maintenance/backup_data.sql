-- ============================================================
-- 库存管理系统数据备份脚本
-- 数据库类型: PostgreSQL 14+
-- 说明: 备份 product、inbound_record、outbound_record、order_number 表数据
-- ============================================================

-- 开启事务
BEGIN;

-- 创建临时表存储备份元信息
CREATE TEMP TABLE IF NOT EXISTS backup_metadata (
    table_name VARCHAR(100),
    record_count INTEGER,
    backup_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 清理已存在的备份数据（如果重复执行）
DELETE FROM backup_metadata;

-- ============================================================
-- 1. 备份 product 表数据
-- ============================================================
INSERT INTO backup_metadata (table_name, record_count)
SELECT 'product', COUNT(*) FROM product;

-- 生成 product 表的 INSERT 语句
SELECT '-- product 表数据备份' AS comment;
SELECT 
    'INSERT INTO product (id, name, code, cost_price, current_stock, safety_stock, image_attachment, category, safety_days, _created_at, _created_by, _updated_at, _updated_by) VALUES (' ||
    '''' || id || ''',' ||
    '''' || REPLACE(name, '''', '''''') || ''',' ||
    '''' || code || ''',' ||
    COALESCE(cost_price::text, '0') || ',' ||
    COALESCE(current_stock::text, '0') || ',' ||
    COALESCE(safety_stock::text, '0') || ',' ||
    CASE WHEN image_attachment IS NOT NULL 
         THEN '''' || image_attachment || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN category IS NOT NULL 
         THEN '''' || category || '''' 
         ELSE 'NULL' END || ',' ||
    COALESCE(safety_days::text, '7') || ',' ||
    '''' || _created_at || ''',' ||
    CASE WHEN _created_by IS NOT NULL 
         THEN '''' || _created_by || '''' 
         ELSE 'NULL' END || ',' ||
    '''' || _updated_at || ''',' ||
    CASE WHEN _updated_by IS NOT NULL 
         THEN '''' || _updated_by || '''' 
         ELSE 'NULL' END ||
    ');' AS insert_statement
FROM product
ORDER BY _created_at;

-- ============================================================
-- 2. 备份 order_number 表数据
-- ============================================================
INSERT INTO backup_metadata (table_name, record_count)
SELECT 'order_number', COUNT(*) FROM order_number;

SELECT '-- order_number 表数据备份' AS comment;
SELECT 
    'INSERT INTO order_number (id, order_no, order_type, reference_id, created_at, _created_by, _updated_at, _updated_by) VALUES (' ||
    '''' || id || ''',' ||
    '''' || order_no || ''',' ||
    '''' || order_type || ''',' ||
    CASE WHEN reference_id IS NOT NULL 
         THEN '''' || reference_id || '''' 
         ELSE 'NULL' END || ',' ||
    '''' || created_at || ''',' ||
    CASE WHEN _created_by IS NOT NULL 
         THEN '''' || _created_by || '''' 
         ELSE 'NULL' END || ',' ||
    '''' || _updated_at || ''',' ||
    CASE WHEN _updated_by IS NOT NULL 
         THEN '''' || _updated_by || '''' 
         ELSE 'NULL' END ||
    ');' AS insert_statement
FROM order_number
ORDER BY created_at;

-- ============================================================
-- 3. 备份 inbound_record 表数据
-- ============================================================
INSERT INTO backup_metadata (table_name, record_count)
SELECT 'inbound_record', COUNT(*) FROM inbound_record;

SELECT '-- inbound_record 表数据备份' AS comment;
SELECT 
    'INSERT INTO inbound_record (id, product_id, quantity, operator, attachments, _created_at, _created_by, _updated_at, _updated_by, warehouse, remark, order_no, items) VALUES (' ||
    '''' || id || ''',' ||
    '''' || product_id || ''',' ||
    quantity || ',' ||
    '''' || REPLACE(operator, '''', '''''') || ''',' ||
    CASE WHEN attachments IS NOT NULL AND array_length(attachments, 1) > 0
         THEN '''' || attachments::text || '''::file_attachment[]'
         ELSE 'NULL' END || ',' ||
    '''' || _created_at || ''',' ||
    CASE WHEN _created_by IS NOT NULL 
         THEN '''' || _created_by || '''' 
         ELSE 'NULL' END || ',' ||
    '''' || _updated_at || ''',' ||
    CASE WHEN _updated_by IS NOT NULL 
         THEN '''' || _updated_by || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN warehouse IS NOT NULL 
         THEN '''' || warehouse || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN remark IS NOT NULL 
         THEN '''' || REPLACE(remark, '''', '''''') || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN order_no IS NOT NULL 
         THEN '''' || order_no || '''' 
         ELSE 'NULL' END || ',' ||
    COALESCE('''' || items::text || '''::jsonb', '''[]''::jsonb') ||
    ');' AS insert_statement
FROM inbound_record
ORDER BY _created_at;

-- ============================================================
-- 4. 备份 outbound_record 表数据
-- ============================================================
INSERT INTO backup_metadata (table_name, record_count)
SELECT 'outbound_record', COUNT(*) FROM outbound_record;

SELECT '-- outbound_record 表数据备份' AS comment;
SELECT 
    'INSERT INTO outbound_record (id, product_id, quantity, operator, attachments, _created_at, _created_by, _updated_at, _updated_by, warehouse, remark, order_no, items, outbound_type) VALUES (' ||
    '''' || id || ''',' ||
    '''' || product_id || ''',' ||
    quantity || ',' ||
    '''' || REPLACE(operator, '''', '''''') || ''',' ||
    CASE WHEN attachments IS NOT NULL AND array_length(attachments, 1) > 0
         THEN '''' || attachments::text || '''::file_attachment[]'
         ELSE 'NULL' END || ',' ||
    '''' || _created_at || ''',' ||
    CASE WHEN _created_by IS NOT NULL 
         THEN '''' || _created_by || '''' 
         ELSE 'NULL' END || ',' ||
    '''' || _updated_at || ''',' ||
    CASE WHEN _updated_by IS NOT NULL 
         THEN '''' || _updated_by || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN warehouse IS NOT NULL 
         THEN '''' || warehouse || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN remark IS NOT NULL 
         THEN '''' || REPLACE(remark, '''', '''''') || '''' 
         ELSE 'NULL' END || ',' ||
    CASE WHEN order_no IS NOT NULL 
         THEN '''' || order_no || '''' 
         ELSE 'NULL' END || ',' ||
    COALESCE('''' || items::text || '''::jsonb', '''[]''::jsonb') || ',' ||
    '''' || COALESCE(outbound_type, 'sale') || '''' ||
    ');' AS insert_statement
FROM outbound_record
ORDER BY _created_at;

-- ============================================================
-- 输出备份统计信息
-- ============================================================
SELECT '-- ============================================================' AS separator;
SELECT '-- 备份统计信息' AS comment;
SELECT '-- ============================================================' AS separator;
SELECT 
    '商品信息(product): ' || 
    (SELECT record_count FROM backup_metadata WHERE table_name = 'product') || ' 条' AS backup_info
UNION ALL
SELECT 
    '订单编号(order_number): ' || 
    (SELECT record_count FROM backup_metadata WHERE table_name = 'order_number') || ' 条'
UNION ALL
SELECT 
    '入库记录(inbound_record): ' || 
    (SELECT record_count FROM backup_metadata WHERE table_name = 'inbound_record') || ' 条'
UNION ALL
SELECT 
    '出库记录(outbound_record): ' || 
    (SELECT record_count FROM backup_metadata WHERE table_name = 'outbound_record') || ' 条';

-- 清理临时表
DROP TABLE IF EXISTS backup_metadata;

-- 提交事务
COMMIT;
