-- ============================================================
-- 库存管理系统 - 重置为 Mock 数据脚本
-- 说明: 清空所有真实业务数据并插入模板测试数据
-- 执行方式: 在数据库客户端执行此脚本
-- 警告: 此操作会永久删除现有数据，请确保已备份！
-- ============================================================

-- 开启事务
BEGIN;

-- ============================================================
-- 步骤1: 清空现有数据（按依赖顺序，先删子表）
-- ============================================================

DELETE FROM alert_record;
DELETE FROM issue_record;
DELETE FROM outbound_record;
DELETE FROM inbound_record;
DELETE FROM order_number;
DELETE FROM daily_inventory_stats;
DELETE FROM issue_field_config;
DELETE FROM issue_type_config;
DELETE FROM system_config;
DELETE FROM warehouse;
DELETE FROM product;

-- ============================================================
-- 步骤2: 插入仓库数据 (Mock)
-- ============================================================

INSERT INTO warehouse (id, name, code, address, manager, phone, remark, is_default, _created_at, _updated_at, _created_by, _updated_by) VALUES
('wh-001', '北京主仓库', 'BJ-MAIN', '北京市朝阳区物流园1号', '张经理', '13800138001', '主要存储高价值电子产品', true, '2024-01-01T08:00:00Z'::timestamptz, '2024-02-20T10:00:00Z'::timestamptz, NULL, NULL),
('wh-002', '上海分仓', 'SH-SUB', '上海市浦东新区物流园2号', '李经理', '13800138002', '华东地区配送中心', false, '2024-01-05T09:00:00Z'::timestamptz, '2024-02-18T14:00:00Z'::timestamptz, NULL, NULL),
('wh-003', '深圳保税仓', 'SZ-BOND', '深圳市南山区保税港区', '王经理', '13800138003', '进口商品保税存储', false, '2024-01-10T10:00:00Z'::timestamptz, '2024-02-15T11:30:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 步骤3: 插入货品数据 (Mock)
-- ============================================================

INSERT INTO product (id, name, code, cost_price, current_stock, safety_stock, image_attachment, category, sellable_days, sellable_status, _created_at, _updated_at, _created_by, _updated_by) VALUES
('prod-001', 'iPhone 15 Pro', 'PHONE-001', 6999, 150, 50, NULL, '手机数码', 30, 'normal', '2024-01-15T08:00:00Z'::timestamptz, '2024-02-20T10:30:00Z'::timestamptz, NULL, NULL),
('prod-002', 'MacBook Air M3', 'LAPTOP-001', 8999, 80, 30, NULL, '电脑办公', 25, 'normal', '2024-01-20T09:00:00Z'::timestamptz, '2024-02-18T14:20:00Z'::timestamptz, NULL, NULL),
('prod-003', 'AirPods Pro 2', 'AUDIO-001', 1899, 25, 40, NULL, '手机数码', 8, 'emergency', '2024-01-25T10:00:00Z'::timestamptz, '2024-02-22T16:45:00Z'::timestamptz, NULL, NULL),
('prod-004', 'iPad Air 5', 'TABLET-001', 4799, 120, 40, NULL, '平板电脑', 45, 'normal', '2024-02-01T11:00:00Z'::timestamptz, '2024-02-19T09:15:00Z'::timestamptz, NULL, NULL),
('prod-005', 'Apple Watch S9', 'WATCH-001', 2999, 8, 25, NULL, '智能穿戴', 5, 'emergency', '2024-02-05T13:30:00Z'::timestamptz, '2024-02-23T11:00:00Z'::timestamptz, NULL, NULL),
('prod-006', '无线机械键盘', 'KEYBOARD-001', 599, 200, 60, NULL, '电脑办公', 60, 'overstock', '2024-02-10T14:00:00Z'::timestamptz, '2024-02-21T15:30:00Z'::timestamptz, NULL, NULL),
('prod-007', '4K显示器', 'MONITOR-001', 2499, 45, 20, NULL, '电脑办公', 20, 'safe', '2024-02-12T10:00:00Z'::timestamptz, '2024-02-20T14:00:00Z'::timestamptz, NULL, NULL),
('prod-008', '蓝牙音箱', 'SPEAKER-001', 399, 300, 80, NULL, '手机数码', 90, 'overstock', '2024-02-15T09:00:00Z'::timestamptz, '2024-02-22T10:00:00Z'::timestamptz, NULL, NULL),
('prod-009', '游戏鼠标', 'MOUSE-001', 299, 15, 30, NULL, '电脑办公', 7, 'emergency', '2024-02-18T11:30:00Z'::timestamptz, '2024-02-23T09:00:00Z'::timestamptz, NULL, NULL),
('prod-010', 'Type-C扩展坞', 'DOCK-001', 199, 100, 35, NULL, '电脑办公', 35, 'normal', '2024-02-20T13:00:00Z'::timestamptz, '2024-02-22T16:00:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 步骤4: 插入系统配置 (可售天数阈值)
-- ============================================================

INSERT INTO system_config (id, config_key, config_value, description, _created_at, _updated_at, _created_by, _updated_by) VALUES
(gen_random_uuid(), 'emergency_days', '10', '紧急预警天数阈值', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
(gen_random_uuid(), 'safe_days', '15', '安全预警天数阈值', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
(gen_random_uuid(), 'overstock_days', '90', '滞销预警天数阈值', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL);

-- ============================================================
-- 步骤5: 插入异常类型配置
-- ============================================================

INSERT INTO issue_type_config (id, name, code, description, is_enabled, sort_order, _created_at, _updated_at, _created_by, _updated_by) VALUES
('itype-001', '货品破损', 'DAMAGED', '货品在运输或存储过程中发生破损', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('itype-002', '数量短缺', 'SHORTAGE', '实际数量少于订单/入库数量', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('itype-003', '错发错配', 'MISMATCH', '发错货品或配货错误', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('itype-004', '质量问题', 'QUALITY', '货品存在质量缺陷', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('itype-005', '系统异常', 'SYSTEM', '系统操作或数据异常', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL);

-- ============================================================
-- 步骤6: 插入字段配置
-- ============================================================

INSERT INTO issue_field_config (id, name, field_key, field_type, is_required, is_enabled, sort_order, options, _created_at, _updated_at, _created_by, _updated_by) VALUES
('ifield-001', '责任方', 'responsible_party', 'select', false, true, 1, '[{"label": "供应商", "value": "supplier"}, {"label": "仓库", "value": "warehouse"}, {"label": "物流", "value": "logistics"}]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('ifield-002', '损失金额', 'loss_amount', 'number', false, true, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('ifield-003', '处理建议', 'suggestion', 'textarea', false, true, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('ifield-004', '涉及货品数量', 'affected_quantity', 'number', true, true, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL),
('ifield-005', '客户反馈', 'customer_feedback', 'textarea', false, true, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL);

-- ============================================================
-- 步骤7: 插入入库记录 (Mock)
-- ============================================================

INSERT INTO inbound_record (id, product_id, quantity, operator, warehouse, remark, order_no, in_type, attachments, items, _created_at, _updated_at, _created_by, _updated_by) VALUES
('in-001', 'prod-001', 100, '张三', '北京主仓库', '常规采购入库', 'IN20240220001', 'purchase', ARRAY[]::file_attachment[], '[{"productId": "prod-001", "productName": "iPhone 15 Pro", "quantity": 100}]'::jsonb, '2024-02-20T09:00:00Z'::timestamptz, '2024-02-20T09:00:00Z'::timestamptz, NULL, NULL),
('in-002', 'prod-002', 50, '李四', '北京主仓库', '新品上架', 'IN20240219002', 'purchase', ARRAY[]::file_attachment[], '[{"productId": "prod-002", "productName": "MacBook Air M3", "quantity": 50}]'::jsonb, '2024-02-19T10:30:00Z'::timestamptz, '2024-02-19T10:30:00Z'::timestamptz, NULL, NULL),
('in-003', 'prod-003', 80, '张三', '上海分仓', '调拨入库', 'IN20240218003', 'inventory_check', ARRAY[]::file_attachment[], '[{"productId": "prod-003", "productName": "AirPods Pro 2", "quantity": 80}]'::jsonb, '2024-02-18T14:00:00Z'::timestamptz, '2024-02-18T14:00:00Z'::timestamptz, NULL, NULL),
('in-004', 'prod-004', 120, '王五', '深圳保税仓', '海外采购', 'IN20240215004', 'purchase', ARRAY[]::file_attachment[], '[{"productId": "prod-004", "productName": "iPad Air 5", "quantity": 120}]'::jsonb, '2024-02-15T11:00:00Z'::timestamptz, '2024-02-15T11:00:00Z'::timestamptz, NULL, NULL),
('in-005', 'prod-006', 200, '赵六', '北京主仓库', '大批量采购', 'IN20240210005', 'purchase', ARRAY[]::file_attachment[], '[{"productId": "prod-006", "productName": "无线机械键盘", "quantity": 200}]'::jsonb, '2024-02-10T09:30:00Z'::timestamptz, '2024-02-10T09:30:00Z'::timestamptz, NULL, NULL),
('in-006', 'prod-001', 50, '张三', '上海分仓', '补货入库', 'IN20240208006', 'purchase', ARRAY[]::file_attachment[], '[{"productId": "prod-001", "productName": "iPhone 15 Pro", "quantity": 30}, {"productId": "prod-002", "productName": "MacBook Air M3", "quantity": 20}]'::jsonb, '2024-02-08T13:00:00Z'::timestamptz, '2024-02-08T13:00:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 步骤8: 插入出库记录 (Mock)
-- ============================================================

INSERT INTO outbound_record (id, product_id, quantity, operator, warehouse, remark, order_no, outbound_type, out_type, source_warehouse, attachments, items, _created_at, _updated_at, _created_by, _updated_by) VALUES
('out-001', 'prod-001', 50, '张三', '北京主仓库', '客户订单', 'OUT20240223001', 'sale', 'sales', NULL, ARRAY[]::file_attachment[], '[{"productId": "prod-001", "productName": "iPhone 15 Pro", "quantity": 50}]'::jsonb, '2024-02-23T10:00:00Z'::timestamptz, '2024-02-23T10:00:00Z'::timestamptz, NULL, NULL),
('out-002', 'prod-002', 30, '李四', '北京主仓库', '企业采购', 'OUT20240222002', 'sale', 'sales', NULL, ARRAY[]::file_attachment[], '[{"productId": "prod-002", "productName": "MacBook Air M3", "quantity": 30}]'::jsonb, '2024-02-22T14:30:00Z'::timestamptz, '2024-02-22T14:30:00Z'::timestamptz, NULL, NULL),
('out-003', 'prod-003', 60, '王五', '上海分仓', '调拨出库至北京', 'OUT20240221003', 'transfer', 'transfer', '上海分仓', ARRAY[]::file_attachment[], '[{"productId": "prod-003", "productName": "AirPods Pro 2", "quantity": 60}]'::jsonb, '2024-02-21T09:00:00Z'::timestamptz, '2024-02-21T09:00:00Z'::timestamptz, NULL, NULL),
('out-004', 'prod-005', 25, '赵六', '深圳保税仓', '线上订单发货', 'OUT20240220004', 'sale', 'sales', NULL, ARRAY[]::file_attachment[], '[{"productId": "prod-005", "productName": "Apple Watch S9", "quantity": 25}]'::jsonb, '2024-02-20T16:00:00Z'::timestamptz, '2024-02-20T16:00:00Z'::timestamptz, NULL, NULL),
('out-005', 'prod-006', 20, '张三', '北京主仓库', '批量销售', 'OUT20240218005', 'sale', 'sales', NULL, ARRAY[]::file_attachment[], '[{"productId": "prod-006", "productName": "无线机械键盘", "quantity": 15}, {"productId": "prod-007", "productName": "4K显示器", "quantity": 5}]'::jsonb, '2024-02-18T11:00:00Z'::timestamptz, '2024-02-18T11:00:00Z'::timestamptz, NULL, NULL),
('out-006', 'prod-009', 40, '李四', '北京主仓库', '促销出货', 'OUT20240215006', 'sale', 'sales', NULL, ARRAY[]::file_attachment[], '[{"productId": "prod-009", "productName": "游戏鼠标", "quantity": 40}]'::jsonb, '2024-02-15T15:00:00Z'::timestamptz, '2024-02-15T15:00:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 步骤9: 插入异常问题记录 (Mock)
-- ============================================================

INSERT INTO issue_record (id, issue_type_id, tracking_no, order_no, product_name, description, status, priority, custom_fields, attachments, handler, warehouse, resolved_at, resolution_note, _created_at, _updated_at, _created_by, _updated_by) VALUES
('issue-001', 'itype-001', 'SF1234567890', 'OUT20240223001', 'iPhone 15 Pro', '客户反馈收到的货品外包装破损，内部屏幕有裂痕', 'pending', 'high', '{"responsible_party": "logistics", "loss_amount": 6999}'::jsonb, ARRAY[]::file_attachment[], NULL, '北京主仓库', NULL, NULL, '2024-02-23T11:00:00Z'::timestamptz, '2024-02-23T11:00:00Z'::timestamptz, NULL, NULL),
('issue-002', 'itype-002', NULL, 'IN20240220001', 'MacBook Air M3', '入库盘点发现实际数量比订单少5台', 'processing', 'medium', '{"affected_quantity": 5}'::jsonb, ARRAY[]::file_attachment[], '张经理', '北京主仓库', NULL, NULL, '2024-02-20T16:00:00Z'::timestamptz, '2024-02-21T09:00:00Z'::timestamptz, NULL, NULL),
('issue-003', 'itype-003', 'JD9876543210', 'OUT20240222002', '无线机械键盘', '客户收到的货品型号与订单不符', 'resolved', 'medium', '{"customer_feedback": "希望尽快更换正确型号"}'::jsonb, ARRAY[]::file_attachment[], '李四', '北京主仓库', '2024-02-23T14:00:00Z'::timestamptz, '已为客户更换正确货品，运费由仓库承担', '2024-02-22T10:00:00Z'::timestamptz, '2024-02-23T14:00:00Z'::timestamptz, NULL, NULL),
('issue-004', 'itype-004', NULL, 'IN20240215004', 'iPad Air 5', '质检发现部分货品电池鼓包', 'pending', 'high', '{"affected_quantity": 3}'::jsonb, ARRAY[]::file_attachment[], NULL, '深圳保税仓', NULL, NULL, '2024-02-16T09:00:00Z'::timestamptz, '2024-02-16T09:00:00Z'::timestamptz, NULL, NULL),
('issue-005', 'itype-005', NULL, NULL, NULL, '系统统计库存与实际盘点不符，差异较大', 'processing', 'low', '{"suggestion": "建议进行全仓盘点"}'::jsonb, ARRAY[]::file_attachment[], '王经理', '上海分仓', NULL, NULL, '2024-02-19T13:00:00Z'::timestamptz, '2024-02-20T10:00:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 步骤10: 插入预警记录 (Mock)
-- ============================================================

INSERT INTO alert_record (id, product_id, product_name, alert_type, current_stock, safety_stock, short_amount, is_read, is_handled, handled_at, sellable_days, sellable_status, _created_at, _updated_at, _created_by, _updated_by) VALUES
('alert-001', 'prod-003', 'AirPods Pro 2', 'emergency', 25, 40, 15, false, false, NULL, 8, 'emergency', '2024-02-22T10:00:00Z'::timestamptz, '2024-02-22T10:00:00Z'::timestamptz, NULL, NULL),
('alert-002', 'prod-005', 'Apple Watch S9', 'emergency', 8, 25, 17, true, false, NULL, 5, 'emergency', '2024-02-21T14:30:00Z'::timestamptz, '2024-02-22T09:00:00Z'::timestamptz, NULL, NULL),
('alert-003', 'prod-009', '游戏鼠标', 'emergency', 15, 30, 15, false, true, '2024-02-23T16:00:00Z'::timestamptz, 7, 'emergency', '2024-02-20T11:00:00Z'::timestamptz, '2024-02-23T16:00:00Z'::timestamptz, NULL, NULL),
('alert-004', 'prod-006', '无线机械键盘', 'overstock', 200, 60, 0, false, false, NULL, 60, 'overstock', '2024-02-19T09:00:00Z'::timestamptz, '2024-02-19T09:00:00Z'::timestamptz, NULL, NULL),
('alert-005', 'prod-008', '蓝牙音箱', 'overstock', 300, 80, 0, true, false, NULL, 90, 'overstock', '2024-02-18T13:00:00Z'::timestamptz, '2024-02-20T10:00:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 步骤11: 插入订单号记录
-- ============================================================

INSERT INTO order_number (id, order_no, order_type, reference_id, created_at, _created_at, _updated_at, _created_by, _updated_by) VALUES
('on-001', 'IN20240220001', 'inbound', 'in-001', '2024-02-20T09:00:00Z'::timestamptz, '2024-02-20T09:00:00Z'::timestamptz, '2024-02-20T09:00:00Z'::timestamptz, NULL, NULL),
('on-002', 'IN20240219002', 'inbound', 'in-002', '2024-02-19T10:30:00Z'::timestamptz, '2024-02-19T10:30:00Z'::timestamptz, '2024-02-19T10:30:00Z'::timestamptz, NULL, NULL),
('on-003', 'IN20240218003', 'inbound', 'in-003', '2024-02-18T14:00:00Z'::timestamptz, '2024-02-18T14:00:00Z'::timestamptz, '2024-02-18T14:00:00Z'::timestamptz, NULL, NULL),
('on-004', 'IN20240215004', 'inbound', 'in-004', '2024-02-15T11:00:00Z'::timestamptz, '2024-02-15T11:00:00Z'::timestamptz, '2024-02-15T11:00:00Z'::timestamptz, NULL, NULL),
('on-005', 'IN20240210005', 'inbound', 'in-005', '2024-02-10T09:30:00Z'::timestamptz, '2024-02-10T09:30:00Z'::timestamptz, '2024-02-10T09:30:00Z'::timestamptz, NULL, NULL),
('on-006', 'IN20240208006', 'inbound', 'in-006', '2024-02-08T13:00:00Z'::timestamptz, '2024-02-08T13:00:00Z'::timestamptz, '2024-02-08T13:00:00Z'::timestamptz, NULL, NULL),
('on-007', 'OUT20240223001', 'outbound', 'out-001', '2024-02-23T10:00:00Z'::timestamptz, '2024-02-23T10:00:00Z'::timestamptz, '2024-02-23T10:00:00Z'::timestamptz, NULL, NULL),
('on-008', 'OUT20240222002', 'outbound', 'out-002', '2024-02-22T14:30:00Z'::timestamptz, '2024-02-22T14:30:00Z'::timestamptz, '2024-02-22T14:30:00Z'::timestamptz, NULL, NULL),
('on-009', 'OUT20240221003', 'outbound', 'out-003', '2024-02-21T09:00:00Z'::timestamptz, '2024-02-21T09:00:00Z'::timestamptz, '2024-02-21T09:00:00Z'::timestamptz, NULL, NULL),
('on-010', 'OUT20240220004', 'outbound', 'out-004', '2024-02-20T16:00:00Z'::timestamptz, '2024-02-20T16:00:00Z'::timestamptz, '2024-02-20T16:00:00Z'::timestamptz, NULL, NULL),
('on-011', 'OUT20240218005', 'outbound', 'out-005', '2024-02-18T11:00:00Z'::timestamptz, '2024-02-18T11:00:00Z'::timestamptz, '2024-02-18T11:00:00Z'::timestamptz, NULL, NULL),
('on-012', 'OUT20240215006', 'outbound', 'out-006', '2024-02-15T15:00:00Z'::timestamptz, '2024-02-15T15:00:00Z'::timestamptz, '2024-02-15T15:00:00Z'::timestamptz, NULL, NULL);

-- ============================================================
-- 验证数据
-- ============================================================

SELECT 
    'product' as table_name, 
    COUNT(*) as record_count,
    '已初始化' as status
FROM product
UNION ALL
SELECT 'warehouse', COUNT(*), '已初始化' FROM warehouse
UNION ALL
SELECT 'inbound_record', COUNT(*), '已初始化' FROM inbound_record
UNION ALL
SELECT 'outbound_record', COUNT(*), '已初始化' FROM outbound_record
UNION ALL
SELECT 'alert_record', COUNT(*), '已初始化' FROM alert_record
UNION ALL
SELECT 'issue_record', COUNT(*), '已初始化' FROM issue_record
UNION ALL
SELECT 'issue_type_config', COUNT(*), '已初始化' FROM issue_type_config
UNION ALL
SELECT 'issue_field_config', COUNT(*), '已初始化' FROM issue_field_config
UNION ALL
SELECT 'system_config', COUNT(*), '已初始化' FROM system_config
UNION ALL
SELECT 'order_number', COUNT(*), '已初始化' FROM order_number
ORDER BY table_name;

-- 提交事务
COMMIT;

-- ============================================================
-- Mock数据初始化完成
-- 说明: 已将真实数据替换为模板测试数据
-- ============================================================
