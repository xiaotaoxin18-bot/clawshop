/**
 * Dataloom stub - 替代 @lark-apaas/client-toolkit/dataloom
 * 返回空对象避免 null 引用崩溃
 */

export const getDataloom = async () => {
  return {
    storage: {
      from: () => ({
        uploadFile: async () => ({ data: null, error: { message: 'dataloom not available' } }),
        download: async () => ({ data: null, error: { message: 'dataloom not available' } }),
      }),
    },
  };
};
