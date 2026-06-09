import type { IOSSConfig } from '@/pages/StorageSettingsPage/StorageSettingsPage';
import { STORAGE_KEY_OSS_CONFIG } from '@/pages/StorageSettingsPage/StorageSettingsPage';
import type { FileAttachment } from '@shared/api.interface';

export interface UploadResult {
  bucket_id: string;
  file_path: string;
  download_url: string;
}

export function getOSSConfig(): IOSSConfig | null {
  const stored = localStorage.getItem(STORAGE_KEY_OSS_CONFIG);
  if (!stored) return null;
  try {
    const config = JSON.parse(stored);
    // 自动清理首尾空格
    return {
      enabled: config.enabled,
      endpoint: (config.endpoint || '').trim(),
      accessKeyId: (config.accessKeyId || '').trim(),
      accessKeySecret: (config.accessKeySecret || '').trim(),
      bucketName: (config.bucketName || '').trim(),
      region: (config.region || '').trim(),
      customDomain: (config.customDomain || '').trim(),
    };
  } catch {
    return null;
  }
}

export function isOSSEnabled(): boolean {
  const config = getOSSConfig();
  return config?.enabled === true;
}

export function buildOSSEndpoint(config: IOSSConfig): string {
  let endpoint = config.endpoint.trim();
  
  // 如果用户输入的 endpoint 不包含协议，添加 https://
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = 'https://' + endpoint;
  }
  
  // 移除末尾的斜杠
  endpoint = endpoint.replace(/\/$/, '');
  
  // 如果 endpoint 不包含 bucket 名称，构建完整的 endpoint
  // 阿里云OSS标准格式: https://bucketName.endpoint
  if (!endpoint.includes(config.bucketName)) {
    // 提取域名部分
    const url = new URL(endpoint);
    const hostname = url.hostname;
    
    // 如果 hostname 是 oss-cn-xx.aliyuncs.com 格式，需要加上 bucket
    if (hostname.includes('aliyuncs.com') && !hostname.startsWith(config.bucketName)) {
      endpoint = `${url.protocol}//${config.bucketName}.${hostname}`;
    }
  }
  
  return endpoint;
}

export function generateOSSUrl(config: IOSSConfig, filePath: string): string {
  if (config.customDomain) {
    return `${config.customDomain.replace(/\/$/, '')}/${filePath}`;
  }
  
  const endpoint = buildOSSEndpoint(config);
  return `${endpoint}/${filePath}`;
}

export async function uploadToOSS(
  config: IOSSConfig,
  file: File
): Promise<UploadResult> {
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `uploads/${date}/${fileName}`;

  const policyText = {
    expiration: new Date(Date.now() + 3600 * 1000).toISOString(),
    conditions: [
      { bucket: config.bucketName },
      ['content-length-range', 0, 104857600],
      ['eq', '$key', filePath],
    ],
  };

  const policy = btoa(JSON.stringify(policyText));
  const signature = await generateSignature(policy, config.accessKeySecret);

  const formData = new FormData();
  formData.append('key', filePath);
  formData.append('OSSAccessKeyId', config.accessKeyId);
  formData.append('policy', policy);
  formData.append('signature', signature);
  formData.append('Content-Type', file.type);
  formData.append('file', file);

  const endpoint = buildOSSEndpoint(config);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      mode: 'cors',
    });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text().catch(() => '未知错误');
      throw new Error(`上传失败 (${response.status}): ${errorText || response.statusText}`);
    }

    const downloadUrl = generateOSSUrl(config, filePath);

    return {
      bucket_id: config.bucketName,
      file_path: filePath,
      download_url: downloadUrl,
    };
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error(
        '网络请求失败，可能原因：\n' +
        '1. OSS Endpoint 配置错误\n' +
        '2. Bucket 跨域配置未开启\n' +
        '3. 网络连接问题\n' +
        '请检查OSS配置并确保Bucket已配置CORS。'
      );
    }
    throw error;
  }
}

async function generateSignature(policy: string, accessKeySecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(accessKeySecret);
  const messageData = encoder.encode(policy);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const config = getOSSConfig();

  if (config?.enabled) {
    if (!config.endpoint || !config.accessKeyId || !config.accessKeySecret || !config.bucketName) {
      throw new Error('OSS配置不完整，请检查配置');
    }
    return uploadToOSS(config, file);
  }

  throw new Error('未配置存储方式');
}

/**
 * 获取附件的访问URL（同步版本）
 * 注意：对于私有OSS Bucket，返回的URL可能无法直接访问
 * 建议在前端使用 useSignedUrl hook 获取带签名的URL
 */
export function getAttachmentUrl(attachment: FileAttachment | null): string | null {
  if (!attachment) return null;
  if (attachment.download_url) return attachment.download_url;

  const config = getOSSConfig();
  if (config?.enabled && config.bucketName === attachment.bucket_id) {
    return generateOSSUrl(config, attachment.file_path);
  }

  return `/api/file/download?bucket=${attachment.bucket_id}&path=${encodeURIComponent(attachment.file_path)}`;
}
