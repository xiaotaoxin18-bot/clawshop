/**
 * Storage stub - 替代 @lark-apaas/client-toolkit/tools/storage
 * 文件存储功能将不可用，但页面不会白屏
 */

export const getDefaultBucketId = () => {
  console.warn('[stub] getDefaultBucketId is not available in standalone mode');
  return 'stub-bucket';
};
