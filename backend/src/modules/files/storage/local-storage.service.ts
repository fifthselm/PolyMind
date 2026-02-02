import { Injectable, Logger } from '@nestjs/common';
import { StorageService, FileMetadata, UploadResult } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 本地存储服务实现
 * 开发环境使用，文件存储在本地文件系统
 */
@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    super();
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.baseUrl = process.env.UPLOAD_BASE_URL || '/uploads';
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`创建上传目录: ${this.uploadDir}`);
    }
  }

  async upload(file: Buffer, key: string, metadata: FileMetadata): Promise<UploadResult> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);

    // 确保目录存在
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    await fs.writeFile(filePath, file);

    this.logger.log(`文件上传成功: ${key} (${metadata.size} bytes)`);

    return {
      url: `${this.baseUrl}/${key}`,
      key,
      metadata,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
      this.logger.log(`文件删除成功: ${key}`);
    } catch (error) {
      this.logger.warn(`文件删除失败: ${key}`, error);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.uploadDir, key));
      return true;
    } catch {
      return false;
    }
  }
}
