-- ============================================================
-- 库存管理系统数据清理脚本
-- 数据库类型: PostgreSQL 14+
-- 警告: 此脚本将永久删除业务数据，执行前请确保已备份！
-- ============================================================

-- 请先手动确认是否执行清理操作
-- 在 psql 中执行: \prompt '是否确认清空所有业务数据？输入 YES 确认: ' confirm
-- 然后检查 :confirm 变量是否为 'YES'

-- ============================================================
-- 步骤 1: 统计数据（清理前）
-- ============================================================
DO $$
DECLARE
    v_product_count INTEGER;
    v_order_count INTEGER;
    v_inbound_count INTEGER;
    v_outbound_count INTEGER;
BEGIN
    -- 统计各表数据量
    SELECT COUNT(*) INTO v_product_count FROM product;
    SELECT COUNT(*) INTO v_order_count FROM order_number;
    SELECT COUNT(*) INTO v_inbound_count FROM inbound_record;
    SELECT COUNT(*) INTO v_outbound_count FROM outbound_record;
    
    -- 输出统计信息
    RAISE NOTICE '========================================';
    RAISE NOTICE '数据清理前统计';
    RAISE NOTICE '========================================';
    RAISE NOTICE '商品信息(product): % 条', v_product_count;
    RAISE NOTICE '订单编号(order_number): % 条', v_order_count;
    RAISE NOTICE '入库记录(inbound_record): % 条', v_inbound_count;
    RAISE NOTICE '出库记录(outbound_record): % 条', v_outbound_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- 步骤 2: 执行数据清理
-- 删除顺序: 先删子表(inbound/outbound/order_number)，后删主表(product)
-- 注意: 本系统表之间没有外键约束，但按逻辑依赖关系删除更安全
-- ============================================================

-- 开启事务
BEGIN;

-- 2.1 删除出库记录（子表）
DELETE FROM outbound_record;
GET DIAGNOSTICS v_outbound_deleted = ROW_COUNT;

-- 2.2 删除入库记录（子表）
DELETE FROM inbound_record;
GET DIAGNOSTICS v_inbound_deleted = ROW_COUNT;

-- 2.3 删除订单编号（关联表）
DELETE FROM order_number;
GET DIAGNOSTICS v_order_deleted = ROW_COUNT;

-- 2.4 删除商品信息（主表）
DELETE FROM product;
GET DIAGNOSTICS v_product_deleted = ROW_COUNT;

-- 提交事务
COMMIT;

-- ============================================================
-- 步骤 3: 输出清理结果
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '数据清理完成';
    RAISE NOTICE '========================================';
    RAISE NOTICE '商品信息(product): 已删除';
    RAISE NOTICE '订单编号(order_number): 已删除';
    RAISE NOTICE '入库记录(inbound_record): 已删除';
    RAISE NOTICE '出库记录(outbound_record): 已删除';
    RAISE NOTICE '========================================';
    RAISE NOTICE '所有业务数据已清理完毕，系统已恢复初始状态';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- 步骤 4: 验证清理结果
-- ============================================================
SELECT 
    '商品信息(product)' AS table_name,
    COUNT(*) AS remaining_count,
    CASE WHEN COUNT(*) = 0 THEN '已清空' ELSE '未清空' END AS status
FROM product
UNION ALL
SELECT 
    '订单编号(order_number)',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '已清空' ELSE '未清空' END
FROM order_number
UNION ALL
SELECT 
    '入库记录(inbound_record)',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '已清空' ELSE '未清空' END
FROM inbound_record
UNION ALL
SELECT 
    '出库记录(outbound_record)',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '已清空' ELSE '未清空' END
FROM outbound_record;
