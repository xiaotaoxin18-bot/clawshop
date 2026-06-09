import { 
  Controller, 
  Post, 
  Get,
  Query,
  Param, 
  Res,
  Body,
  Req,
  UploadedFile, 
  UploadedFiles,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { FileService, IFileUpload } from './file.service';
import type { Response } from 'express';
import type { GetSignedUrlRequest, GetSignedUrlResponse, UpdateOSSConfigRequest, MigrateOSSConfigRequest } from '@shared/api.interface';

@Controller('api/file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * 单文件上传
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: IFileUpload) {
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }
    
    const url = await this.fileService.saveFile(file);
    return {
      success: true,
      url,
      filename: file.originalname,
    };
  }

  /**
   * 多文件上传
   */
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(@UploadedFiles() files: IFileUpload[]) {
    if (!files || files.length === 0) {
      return { success: false, message: 'No files uploaded' };
    }

    const urls = await this.fileService.saveFiles(files);
    return {
      success: true,
      urls,
      count: urls.length,
    };
  }

  /**
   * 获取OSS签名URL
   * 使用POST方法，因为需要传递敏感的配置信息
   */
  @Post('signed-url')
  async getSignedUrl(
    @Body() body: GetSignedUrlRequest,
  ): Promise<GetSignedUrlResponse> {
    const { bucket, path, expires = 3600, config } = body;
    const url = await this.fileService.generateSignedUrl(bucket, path, expires, config);
    return {
      url,
      downloadUrl: url,
      expiresIn: expires,
      expires,
    };
  }

  /**
   * 获取文件（用于展示/下载）
   */
  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const filepath = await this.fileService.getFilePath(filename);
    
    if (!filepath) {
      throw new NotFoundException('File not found');
    }

    const fileStream = createReadStream(filepath);
    fileStream.pipe(res);
  }

  // ==================== OSS 配置 API ====================

  /**
   * 获取 OSS 配置
   */
  @Get('config/oss')
  async getOSSConfig(@Req() req: Request) {
    const userId: string = (req as any).userContext?.userId;
    return this.fileService.getOSSConfig(userId);
  }

  /**
   * 保存 OSS 配置
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('config/oss')
  async saveOSSConfig(
    @Req() req: Request,
    @Body() data: UpdateOSSConfigRequest,
  ) {
    const userId: string = (req as any).userContext?.userId;
    return this.fileService.saveOSSConfig(userId, data);
  }

  /**
   * 从 localStorage 迁移 OSS 配置到数据库
   */
  @CanRole(['role_admin'])
  @NeedLogin()
  @Post('config/oss/migrate')
  async migrateOSSConfig(
    @Req() req: Request,
    @Body() data: MigrateOSSConfigRequest,
  ) {
    const userId: string = (req as any).userContext?.userId;
    return this.fileService.migrateOSSConfig(userId, data);
  }
}
