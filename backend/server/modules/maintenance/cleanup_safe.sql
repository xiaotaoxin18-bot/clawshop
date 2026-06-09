-- ============================================================
-- 库存管理系统安全数据清理脚本（带交互确认）
-- 数据库类型: PostgreSQL 14+
-- 适用场景: 需要二次确认的生产环境
-- ============================================================

-- ============================================================
-- 第 0 步: 交互确认
-- 在 psql 命令行中执行以下命令进行确认：
-- \prompt '是否确认清空所有业务数据？此操作不可恢复！输入 "CLEAR_DATA" 确认: ' confirm_var
-- \if :confirm_var != 'CLEAR_DATA'
--   \echo '操作已取消'
--   \q
-- \endif
-- ============================================================

-- 创建临时函数用于带确认的清理
CREATE OR REPLACE FUNCTION cleanup_inventory_data(confirm_code TEXT)
RETURNS TABLE (
    table_name TEXT,
    deleted_count BIGINT,
    status TEXT
) AS $$
DECLARE
    v_product_count BIGINT;
    v_order_count BIGINT;
    v_inbound_count BIGINT;
    v_outbound_count BIGINT;
BEGIN
    -- 验证确认码
    IF confirm_code != 'CLEAR_DATA' THEN
        RAISE EXCEPTION '确认码错误，操作已取消。如需清理数据，请使用确认码: CLEAR_DATA';
    END IF;
    
    -- 统计清理前的数据量
    SELECT COUNT(*) INTO v_product_count FROM product;
    SELECT COUNT(*) INTO v_order_count FROM order_number;
    SELECT COUNT(*) INTO v_inbound_count FROM inbound_record;
    SELECT COUNT(*) INTO v_outbound_count FROM outbound_record;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '准备清理以下数据:';
    RAISE NOTICE '  商品信息: % 条', v_product_count;
    RAISE NOTICE '  订单编号: % 条', v_order_count;
    RAISE NOTICE '  入库记录: % 条', v_inbound_count;
    RAISE NOTICE '  出库记录: % 条', v_outbound_count;
    RAISE NOTICE '========================================';
    
    -- 按正确顺序删除数据（先子表后主表）
    -- 1. 删除出库记录
    DELETE FROM outbound_record;
    GET DIAGNOSTICS v_outbound_count = ROW_COUNT;
    
    -- 2. 删除入库记录
    DELETE FROM inbound_record;
    GET DIAGNOSTICS v_inbound_count = ROW_COUNT;
    
    -- 3. 删除订单编号
    DELETE FROM order_number;
    GET DIAGNOSTICS v_order_count = ROW_COUNT;
    
    -- 4. 删除商品信息
    DELETE FROM product;
    GET DIAGNOSTICS v_product_count = ROW_COUNT;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '数据清理完成！';
    RAISE NOTICE '========================================';
    
    -- 返回清理结果
    RETURN QUERY
    SELECT 
        '商品信息(product)'::TEXT,
        v_product_count,
        '已清理'::TEXT
    UNION ALL
    SELECT 
        '订单编号(order_number)'::TEXT,
        v_order_count,
        '已清理'::TEXT
    UNION ALL
    SELECT 
        '入库记录(inbound_record)'::TEXT,
        v_inbound_count,
        '已清理'::TEXT
    UNION ALL
    SELECT 
        '出库记录(outbound_record)'::TEXT,
        v_outbound_count,
        '已清理'::TEXT;
        
END;
$$ LANGUAGE plpgsql;

-- 使用说明:
-- 1. 先执行此脚本创建函数
-- 2. 然后执行: SELECT * FROM cleanup_inventory_data('CLEAR_DATA');
-- 3. 执行完成后，可以删除函数: DROP FUNCTION IF EXISTS cleanup_inventory_data(TEXT);

-- 可选: 直接执行清理（取消下面的注释即可）
-- SELECT * FROM cleanup_inventory_data('CLEAR_DATA');
