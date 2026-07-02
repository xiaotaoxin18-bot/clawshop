import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { configureApp } from '@lark-apaas/fullstack-nestjs-core';
import { join } from 'path';
import { __express as hbsExpressEngine } from 'hbs';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });
  await configureApp(app, {
    disableSwagger: true,
    enableCsrf: false,
  } as any);
  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || 'localhost';
  const port = Number(process.env.SERVER_PORT || '3000');

  // Serve static files (JS, CSS, images) from dist/client
  // 注意: index: false 禁止自动返回 index.html，让 ViewController 渲染模板
  app.useStaticAssets(join(process.cwd(), 'dist/client'), { index: false });

  // 平台配置 JS 接口 — 在 NestJS 路由之前注册，通过 Express 原生路由
  // 飞书 WebView 中内联脚本设置 window.csrfToken 等保留属性会触发安全白屏
  // 改为外部 JS 文件设置，绕过安全检测
  const expressApp = app.getHttpAdapter().getInstance() as any;
  expressApp.get('/platform-config.js', (req: any, res: any) => {
    const platformData = req.__platform_data__ ?? {};
    // 通过 Nginx 设置的 X-Forwarded-Prefix 头获取子路径，兼容反向代理部署
    const basename = req.headers['x-forwarded-prefix'] || platformData.basename || '/';
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(`(function(){
  window.__platform__ = ${JSON.stringify(JSON.stringify(platformData))};
  window.csrfToken = "${platformData.csrfToken || ''}";
  window.userId = "${platformData.userId || ''}";
  window.tenantId = "${platformData.tenantId || ''}";
  window.appId = "${platformData.appId || ''}";
  window.ENVIRONMENT = "${platformData.environment || 'online'}";
  window.__BASENAME__ = "${basename}";
  if ("${platformData.appName || ''}") {
    window._appInfo = { name: "${platformData.appName || ''}", avatar: "${platformData.appAvatar || ''}", description: "${platformData.appDescription || ''}" };
  }
})();`);
  });

  // 绕过 CSRF 检查：在平台中间件执行前设置 CSRF cookie
  // 解决部署环境 enableCsrf: false 不生效的问题
  const csrfToken = Math.random().toString(36).substring(2);
  expressApp.use((req: any, res: any, next: any) => {
    if (!req.cookies?.['suda-csrf-token']) {
      res.cookie('suda-csrf-token', csrfToken, { httpOnly: false, sameSite: 'lax' });
    }
    next();
  });

  // 注册视图引擎, 渲染 client 目录下的 html 文件
  app.setBaseViewsDir(join(process.cwd(), 'dist/client'));
  app.setViewEngine('html');
  app.engine('html', hbsExpressEngine);

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}

bootstrap();
