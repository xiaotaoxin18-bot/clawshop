import { useState, useEffect, useCallback } from 'react';
import type { FileAttachment } from '@shared/api.interface';
import { getSignedUrl } from '@/api';
import { getOSSConfig, generateOSSUrl } from '@/utils/storage';

interface UseSignedUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * 获取附件签名URL的Hook
 * @param attachment 附件信息
 * @param expires 签名URL过期时间（秒），默认3600
 * @returns 签名URL及状态
 */
export function useSignedUrl(
  attachment: FileAttachment | null,
  expires?: number
): UseSignedUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!attachment) {
      setUrl(null);
      return;
    }

    // 如果已有直接的下载URL且不是阿里云OSS，直接使用
    if (attachment.download_url && !attachment.download_url.includes('aliyuncs.com')) {
      setUrl(attachment.download_url);
      return;
    }

    // 获取当前OSS配置
    const config = getOSSConfig();
    const isCurrentOSS = config?.enabled && config.bucketName === attachment.bucket_id;

    // 如果不是当前OSS且没有download_url，使用本地下载链接
    if (!isCurrentOSS && !attachment.download_url) {
      setUrl(`/api/file/download?bucket=${attachment.bucket_id}&path=${encodeURIComponent(attachment.file_path)}`);
      return;
    }

    // 如果没有配置，无法生成签名URL
    if (!config || !config.accessKeyId || !config.accessKeySecret) {
      setUrl(attachment.download_url || generateOSSUrl(config!, attachment.file_path));
      return;
    }

    // 获取签名URL
    setLoading(true);
    setError(null);

    getSignedUrl(
      attachment.bucket_id,
      attachment.file_path
    )
      .then((result) => {
        setUrl(result.url);
      })
      .catch((err) => {
        setError(err);
        // 如果获取签名URL失败，回退到普通URL
        if (attachment.download_url) {
          setUrl(attachment.download_url);
        } else if (config) {
          setUrl(generateOSSUrl(config, attachment.file_path));
        } else {
          setUrl(`/api/file/download?bucket=${attachment.bucket_id}&path=${encodeURIComponent(attachment.file_path)}`);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [attachment, expires, refreshKey]);

  return { url, loading, error, refresh };
}

/**
 * 同步获取附件URL（用于非异步场景）
 * 返回一个可能不是签名URL的链接，但立即可用
 */
export function getAttachmentUrlSync(attachment: FileAttachment | null): string | null {
  if (!attachment) return null;

  if (attachment.download_url) {
    return attachment.download_url;
  }

  const config = getOSSConfig();
  if (config?.enabled && config.bucketName === attachment.bucket_id) {
    return generateOSSUrl(config, attachment.file_path);
  }

  return `/api/file/download?bucket=${attachment.bucket_id}&path=${encodeURIComponent(attachment.file_path)}`;
}
