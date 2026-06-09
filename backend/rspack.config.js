const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  extends: '@lark-apaas/fullstack-rspack-preset/preset.config.js',
  entry: {
    main: './client/src/index.tsx',
  },
  resolve: {
    tsConfig: {
      configFile: path.resolve(__dirname, './tsconfig.app.json'),
    },
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      // 运行时注入插件自动 @lark-apaas/client-toolkit/runtime 到入口
      '@lark-apaas/client-toolkit/runtime$': path.resolve(__dirname, 'client/src/stubs/runtime.ts'),
      // 替换飞书 SDK 为本地桩模块
      '@lark-apaas/client-toolkit/logger$': path.resolve(__dirname, 'client/src/stubs/logger.ts'),
      '@lark-apaas/client-toolkit/components/UniversalLink$': path.resolve(__dirname, 'client/src/stubs/UniversalLink.tsx'),
      '@lark-apaas/client-toolkit/dataloom$': path.resolve(__dirname, 'client/src/stubs/dataloom.ts'),
      '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile$': path.resolve(__dirname, 'client/src/stubs/useCurrentUserProfile.ts'),
      '@lark-apaas/client-toolkit/utils/getEnv$': path.resolve(__dirname, 'client/src/stubs/getEnv.ts'),
      '@lark-apaas/client-toolkit/tools/services$': path.resolve(__dirname, 'client/src/stubs/tools/services.ts'),
      '@lark-apaas/client-toolkit/tools/storage$': path.resolve(__dirname, 'client/src/stubs/tools/storage.ts'),
      '@lark-apaas/client-toolkit/auth$': path.resolve(__dirname, 'client/src/stubs/auth.tsx'),
      // 屏蔽所有 @lark-apaas 子包（透明依赖会被裹挟打包）
      '@lark-apaas/observable-web': path.resolve(__dirname, 'client/src/stubs/observable-web.ts'),
      '@lark-apaas/internal-slardar': path.resolve(__dirname, 'client/src/stubs/observable-web.ts'),
      '@lark-apaas/client-capability': path.resolve(__dirname, 'client/src/stubs/observable-web.ts'),
    },
  },
  devServer: {
    hot: false,
    liveReload: false,
    webSocketServer: false,
  },
  output: {
    filename: '[name].js', // main.js 保持原名
    chunkFilename: 'chunks/[name].[contenthash:8].js', // 动态 chunk 放入 chunks 目录，带 hash
  },
  optimization: isDev
    ? {}
    : {
        splitChunks: {
          chunks: 'async', // 只对动态 import 进行分割
          minSize: 20000, // 最小 20KB 才分割
          cacheGroups: {
            // 将动态 import 的 node_modules 单独打包
            asyncVendors: {
              test: /[\\/]node_modules[\\/]/,
              chunks: 'async',
              name: 'async-vendors',
              priority: 10,
            },
          },
        },
      },
};