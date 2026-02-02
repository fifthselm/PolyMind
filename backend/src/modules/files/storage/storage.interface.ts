import { Injectable } from '@nestjs/common';

export interface StorageConfig {
  type: 'local' | 's3' | 'oss' | 'cos';
  baseUrl: string;
  // S3/OSS/COS 配置
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  endpoint?: string;
  // 本地存储配置
  localPath?: string;
}

export interface FileMetadata {
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
}

export interface UploadResult {
  url: string;
  key: string;
  metadata: FileMetadata;
}

/**
 * 存储服务抽象接口
 * 支持本地存储、S3、阿里云OSS、腾讯云COS
 */
@Injectable()
export abstract class StorageService {
  abstract upload(file: Buffer, key: string, metadata: FileMetadata): Promise<UploadResult>;
  abstract delete(key: string): Promise<void>;
  abstract getUrl(key: string): string;
  abstract exists(key: string): Promise<boolean>;
}
