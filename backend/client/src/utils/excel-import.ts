import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getSignedUrl } from '@/api';
import { getOSSConfig, generateOSSUrl } from '@/utils/storage';

// 入库表模板表头
export const INBOUND_TEMPLATE_HEADERS = ['商品编码', '数量', '单价', '备注'];

// 出库表模板表头
export const OUTBOUND_TEMPLATE_HEADERS = ['商品编码', '数量', '备注'];

// 验证表头
export function validateHeaders(
  fileHeaders: string[],
  expectedHeaders: string[],
  type: 'inbound' | 'outbound'
): { valid: boolean; error?: string } {
  const normalizedFileHeaders = fileHeaders.map(h => h.trim());
  const normalizedExpectedHeaders = expectedHeaders.map(h => h.trim());

  // 检查必需字段
  const missingFields = normalizedExpectedHeaders.filter(
    h => !normalizedFileHeaders.includes(h)
  );

  if (missingFields.length > 0) {
    const typeName = type === 'inbound' ? '入库' : '出库';
    const oppositeType = type === 'inbound' ? '出库' : '入库';
    return {
      valid: false,
      error: `Excel表头格式错误，缺少字段：${missingFields.join(', ')}。请确认这是${typeName}表模板，不是${oppositeType}表。`,
    };
  }

  // 检查是否有对方特有的字段（防止上传错误）
  if (type === 'inbound') {
    // 入库表不应该有出库表特有的字段组合
    const hasOutboundOnlyFields = OUTBOUND_TEMPLATE_HEADERS.every(h =>
      normalizedFileHeaders.includes(h)
    ) && !normalizedFileHeaders.includes('单价');

    if (hasOutboundOnlyFields) {
      return {
        valid: false,
        error: '检测到这是出库表格式（缺少"单价"字段），请使用入库表模板上传。',
      };
    }
  } else {
    // 出库表不应该有入库表特有的字段
    const hasInboundOnlyFields = normalizedFileHeaders.includes('单价');

    if (hasInboundOnlyFields) {
      return {
        valid: false,
        error: '检测到这是入库表格式（包含"单价"字段），请使用出库表模板上传。',
      };
    }
  }

  return { valid: true };
}

// 解析Excel文件
export async function parseExcelFile(
  file: File,
  type: 'inbound' | 'outbound'
): Promise<{ data: any[]; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ data: [], error: '文件读取失败' });
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 转换为JSON，第一行作为表头
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          resolve({ data: [], error: 'Excel文件为空或格式不正确' });
          return;
        }

        // 获取表头
        const headers = jsonData[0] as string[];

        // 验证表头
        const expectedHeaders = type === 'inbound'
          ? INBOUND_TEMPLATE_HEADERS
          : OUTBOUND_TEMPLATE_HEADERS;

        const validation = validateHeaders(headers, expectedHeaders, type);
        if (!validation.valid) {
          resolve({ data: [], error: validation.error });
          return;
        }

        // 解析数据行
        const rows: any[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.length === 0 || !row[0]) continue; // 跳过空行

          const rowData: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });

          // 验证必填字段
          const code = rowData['商品编码'];
          const quantity = rowData['数量'];

          if (!code) {
            resolve({ data: [], error: `第${i + 1}行商品编码不能为空` });
            return;
          }

          if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
            resolve({ data: [], error: `第${i + 1}行数量必须是大于0的数字` });
            return;
          }

          rows.push(rowData);
        }

        if (rows.length === 0) {
          resolve({ data: [], error: '没有有效的数据行' });
          return;
        }

        resolve({ data: rows });
      } catch (error) {
        resolve({ data: [], error: 'Excel解析失败，请检查文件格式' });
      }
    };

    reader.onerror = () => {
      resolve({ data: [], error: '文件读取失败' });
    };

    reader.readAsBinaryString(file);
  });
}

// 下载模板
export function downloadTemplate(type: 'inbound' | 'outbound') {
  const headers = type === 'inbound'
    ? INBOUND_TEMPLATE_HEADERS
    : OUTBOUND_TEMPLATE_HEADERS;

  // 创建示例数据
  const sampleData = type === 'inbound'
    ? [
        ['T588A标配款', 100, 50, '示例备注'],
        ['T588A升级款', 200, 60, ''],
        ['T588A豪华款', 150, 80, ''],
      ]
    : [
        ['T588A标配款', 50, '示例备注'],
        ['T588A升级款', 100, ''],
        ['T588A豪华款', 80, ''],
      ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type === 'inbound' ? '入库表' : '出库表');

  const fileName = type === 'inbound' ? '入库表模板.xlsx' : '出库表模板.xlsx';
  XLSX.writeFile(wb, fileName);
}

// 导出表头定义
export const EXPORT_HEADERS = {
  inbound: ['订单号', '货品名称', '数量', '仓库', '入库人', '附件', '时间'],
  outbound: ['订单号', '货品名称', '数量', '仓库', '出库人', '附件', '时间'],
};

// 导出数据项类型
export interface ExportRecord {
  orderNo: string;
  productName: string;
  quantity: number;
  warehouse: string;
  operator: string;
  attachments: { bucket_id?: string; download_url?: string; file_path?: string }[];
  attachmentCount: number;
  createdAt: string;
}

/**
 * 获取附件的签名URL或访问URL
 */
async function getAttachmentSignedUrl(
  attachment: { bucket_id?: string; file_path?: string; download_url?: string }
): Promise<string> {
  // 如果已有直接的下载URL，直接使用
  if (attachment.download_url) {
    return attachment.download_url;
  }

  const config = getOSSConfig();

  // 如果是当前配置的OSS，尝试获取签名URL
  if (config?.enabled && config.bucketName === attachment.bucket_id && attachment.file_path) {
    try {
      const result = await getSignedUrl(
        attachment.bucket_id,
        attachment.file_path
      );
      return result.url;
    } catch (error) {
      // 如果获取签名URL失败，返回普通URL
      return generateOSSUrl(config, attachment.file_path);
    }
  }

  // 其他情况返回文件路径或本地下载链接
  if (attachment.file_path && attachment.bucket_id) {
    return `/api/file/download?bucket=${attachment.bucket_id}&path=${encodeURIComponent(attachment.file_path)}`;
  }

  return '';
}

// 导出数据
export async function exportToExcel(
  data: ExportRecord[],
  type: 'inbound' | 'outbound',
  filename?: string
) {
  const headers = EXPORT_HEADERS[type];

  // 收集所有需要获取签名URL的附件
  const attachmentPromises: Promise<{ index: number; urls: string }>[] = [];

  data.forEach((item, index) => {
    if (item.attachments && item.attachments.length > 0) {
      attachmentPromises.push(
        (async () => {
          const urls = await Promise.all(
            item.attachments.map(att => getAttachmentSignedUrl(att))
          );
          return { index, urls: urls.filter(url => url).join('\n') };
        })()
      );
    }
  });

  // 并行获取所有附件的签名URL
  const attachmentResults = await Promise.all(attachmentPromises);
  const attachmentUrlMap = new Map<number, string>();
  attachmentResults.forEach(result => {
    attachmentUrlMap.set(result.index, result.urls);
  });

  // 转换数据格式 - 每个货品一行
  const rows: (string | number)[][] = [];
  data.forEach((item, index) => {
    // 获取附件URL
    const attachmentUrls = attachmentUrlMap.get(index) || '无';

    rows.push([
      item.orderNo || '',
      item.productName || '',
      item.quantity || 0,
      item.warehouse || '',
      item.operator || '',
      attachmentUrls,
      item.createdAt || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 设置列宽
  ws['!cols'] = [
    { wch: 18 }, // 订单号
    { wch: 30 }, // 货品名称
    { wch: 10 }, // 数量
    { wch: 15 }, // 仓库
    { wch: 12 }, // 入库人/出库人
    { wch: 80 }, // 附件链接（更宽以容纳长URL）
    { wch: 20 }, // 时间
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type === 'inbound' ? '入库记录' : '出库记录');

  const fileName = filename || (type === 'inbound' ? '入库记录导出.xlsx' : '出库记录导出.xlsx');
  XLSX.writeFile(wb, fileName);
  toast.success('导出成功');
}

// ==================== 产品批量导入 ====================

// 产品导入模板表头
export const PRODUCT_TEMPLATE_HEADERS = ['产品名称', '商品编码', '成本价', '产品分类'];

// 产品导入数据项
export interface ProductImportItem {
  name: string;
  code: string;
  costPrice: number;
  category: string;
}

// 下载产品导入模板
export function downloadProductTemplate() {
  const headers = PRODUCT_TEMPLATE_HEADERS;

  // 创建示例数据
  const sampleData = [
    ['T588A标配款', 'SKU-001', 128, '数码配件'],
    ['T588A升级款', 'SKU-002', 199, '数码配件'],
    ['T588A豪华款', 'SKU-003', 299, '数码配件'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '产品导入模板');

  XLSX.writeFile(wb, '产品导入模板.xlsx');
}

// 解析产品导入Excel文件
export async function parseProductExcelFile(
  file: File
): Promise<{ data: ProductImportItem[]; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ data: [], error: '文件读取失败' });
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 转换为JSON，第一行作为表头
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          resolve({ data: [], error: 'Excel文件为空或格式不正确' });
          return;
        }

        // 获取表头
        const headers = jsonData[0] as string[];

        // 验证表头
        const missingFields = PRODUCT_TEMPLATE_HEADERS.filter(
          h => !headers.includes(h)
        );

        if (missingFields.length > 0) {
          resolve({
            data: [],
            error: `Excel表头格式错误，缺少字段：${missingFields.join(', ')}。请使用正确的模板。`,
          });
          return;
        }

        // 解析数据行
        const rows: ProductImportItem[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.length === 0 || !row[0]) continue; // 跳过空行

          const rowData: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });

          // 验证必填字段
          const name = rowData['产品名称'];
          const code = rowData['商品编码'];
          const costPrice = rowData['成本价'];

          if (!name) {
            resolve({ data: [], error: `第${i + 1}行产品名称不能为空` });
            return;
          }

          if (!code) {
            resolve({ data: [], error: `第${i + 1}行商品编码不能为空` });
            return;
          }

          if (!costPrice || isNaN(Number(costPrice)) || Number(costPrice) < 0) {
            resolve({ data: [], error: `第${i + 1}行成本价必须是大于等于0的数字` });
            return;
          }

          rows.push({
            name: String(name).trim(),
            code: String(code).trim(),
            costPrice: Number(costPrice),
            category: String(rowData['产品分类'] || '').trim(),
          });
        }

        if (rows.length === 0) {
          resolve({ data: [], error: '没有有效的数据行' });
          return;
        }

        resolve({ data: rows });
      } catch (error) {
        resolve({ data: [], error: 'Excel解析失败，请检查文件格式' });
      }
    };

    reader.onerror = () => {
      resolve({ data: [], error: '文件读取失败' });
    };

    reader.readAsBinaryString(file);
  });
}
