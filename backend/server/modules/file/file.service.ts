import { Injectable, Inject, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID, createHmac } from 'crypto';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { ossConfig } from '@server/database/schema';
import type { OSSConfig, OSSConfigDB, UpdateOSSConfigRequest, MigrateOSSConfigRequest } from '@shared/api.interface';

// 自定义文件类型定义
export interface IFileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly baseUrl = '/api/file';

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create upload directory', error);
    }
  }

  /**
   * 生成OSS签名URL
   * @param bucket Bucket名称
   * @param objectKey 对象路径
   * @param expires 过期时间（秒）
   * @param config OSS配置信息
   * @returns 签名URL
   */
  async generateSignedUrl(
    bucket: string,
    objectKey: string,
    expires: number = 3600,
    config: OSSConfig,
  ): Promise<string> {
    if (!config || !config.accessKeyId || !config.accessKeySecret) {
      throw new Error('OSS配置不完整，缺少AccessKey信息');
    }

    // 构建基础URL
    const protocol = 'https';
    let host: string;
    
    if (config.customDomain) {
      host = config.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } else {
      // 阿里云OSS标准域名格式: bucket.endpoint
      const endpoint = config.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (endpoint.includes(bucket)) {
        host = endpoint;
      } else {
        host = `${bucket}.${endpoint}`;
      }
    }

    // 构建资源路径
    const resource = `/${bucket}/${objectKey}`;
    
    // 计算过期时间戳
    const expireTime = Math.floor(Date.now() / 1000) + expires;
    
    // 构建签名字符串 (阿里云OSS签名V1格式)
    // StringToSign = "GET\n\n\n{Expires}\n{CanonicalizedResource}"
    const stringToSign = `GET\n\n\n${expireTime}\n${resource}`;
    
    // 计算签名
    const signature = createHmac('sha1', config.accessKeySecret)
      .update(stringToSign)
      .digest('base64');
    
    // URL编码签名
    const encodedSignature = encodeURIComponent(signature);
    
    // 构建完整的签名URL
    const signedUrl = `${protocol}://${host}/${objectKey}?OSSAccessKeyId=${encodeURIComponent(config.accessKeyId)}&Expires=${expireTime}&Signature=${encodedSignature}`;
    
    return signedUrl;
  }

  /**
   * 保存上传的文件到本地存储
   * @param file 上传的文件对象
   * @returns 文件的访问URL
   */
  async saveFile(file: IFileUpload): Promise<string> {
    const filename = `${randomUUID()}-${file.originalname}`;
    const filepath = join(this.uploadDir, filename);
    
    await fs.writeFile(filepath, file.buffer);
    
    const fileUrl = `${this.baseUrl}/${filename}`;
    this.logger.log(`File saved: ${filename}`);
    
    return fileUrl;
  }

  /**
   * 批量保存多个文件
   */
  async saveFiles(files: IFileUpload[]): Promise<string[]> {
    return Promise.all(files.map(file => this.saveFile(file)));
  }

  /**
   * 获取文件路径
   */
  async getFilePath(filename: string): Promise<string | null> {
    const filepath = join(this.uploadDir, filename);
    try {
      await fs.access(filepath);
      return filepath;
    } catch {
      return null;
    }
  }

  // ==================== OSS 配置服务方法 ====================

  async getOSSConfig(userId: string): Promise<OSSConfigDB | null> {
    try {
      const [config] = await this.db
        .select()
        .from(ossConfig)
        .where(eq(ossConfig.userId, userId))
        .limit(1);

      if (!config) {
        return null;
      }

      return {
        id: config.id,
        enabled: config.enabled || false,
        endpoint: config.endpoint || '',
        region: config.region || 'oss-cn-hangzhou',
        bucketName: config.bucketName || '',
        customDomain: config.customDomain || '',
        accessKeyId: config.accessKeyId || '',
        accessKeySecret: config.accessKeySecret || '',
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('获取OSS配置失败', error);
      throw error;
    }
  }

  async saveOSSConfig(userId: string, data: UpdateOSSConfigRequest): Promise<OSSConfigDB> {
    try {
      // 先查询是否已存在配置
      const [existing] = await this.db
        .select()
        .from(ossConfig)
        .where(eq(ossConfig.userId, userId))
        .limit(1);

      let record;
      if (existing) {
        // 更新现有配置
        const updateData: { userId: string; [key: string]: any } = {
          userId,
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          ...(data.endpoint !== undefined && { endpoint: data.endpoint }),
          ...(data.region !== undefined && { region: data.region }),
          ...(data.bucketName !== undefined && { bucketName: data.bucketName }),
          ...(data.customDomain !== undefined && { customDomain: data.customDomain }),
          ...(data.accessKeyId !== undefined && { accessKeyId: data.accessKeyId }),
          ...(data.accessKeySecret !== undefined && { accessKeySecret: data.accessKeySecret }),
        };
        [record] = await this.db
          .update(ossConfig)
          .set(updateData)
          .where(eq(ossConfig.id, existing.id))
          .returning();
      } else {
        // 创建新配置
        const insertData: { userId: string; [key: string]: any } = {
          userId,
          enabled: data.enabled || false,
          endpoint: data.endpoint || '',
          region: data.region || 'oss-cn-hangzhou',
          bucketName: data.bucketName || '',
          customDomain: data.customDomain || '',
          accessKeyId: data.accessKeyId || '',
          accessKeySecret: data.accessKeySecret || '',
        };
        [record] = await this.db
          .insert(ossConfig)
          .values(insertData)
          .returning();
      }

      return {
        id: record.id,
        enabled: record.enabled || false,
        endpoint: record.endpoint || '',
        region: record.region || 'oss-cn-hangzhou',
        bucketName: record.bucketName || '',
        customDomain: record.customDomain || '',
        accessKeyId: record.accessKeyId || '',
        accessKeySecret: record.accessKeySecret || '',
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('保存OSS配置失败', error);
      throw error;
    }
  }

  async migrateOSSConfig(userId: string, data: MigrateOSSConfigRequest): Promise<OSSConfigDB> {
    try {
      // 将 localStorage 数据保存到数据库
      return await this.saveOSSConfig(userId, {
        enabled: data.enabled,
        endpoint: data.endpoint,
        region: data.region,
        bucketName: data.bucketName,
        customDomain: data.customDomain,
        accessKeyId: data.accessKeyId,
        accessKeySecret: data.accessKeySecret,
      });
    } catch (error) {
      this.logger.error('迁移OSS配置失败', error);
      throw error;
    }
  }
}
