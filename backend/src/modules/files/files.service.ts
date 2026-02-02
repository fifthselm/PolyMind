import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { LocalStorageService } from './storage/local-storage.service';
import { FileMetadata } from './storage/storage.interface';
import * as path from 'path';
import * as crypto from 'crypto';

// 支持的MIME类型
const ALLOWED_MIME_TYPES = [
  // 图片
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // 文档
  'application/pdf', 'text/plain', 'text/markdown',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 代码文件
  'text/javascript', 'text/typescript', 'text/x-python', 'text/x-java', 'text/x-c', 'text/x-c++',
  'text/html', 'text/css', 'application/json', 'text/xml', 'text/yaml',
  // 压缩文件
  'application/zip', 'application/x-rar-compressed',
];

// 文件大小限制（字节）
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  /**
   * 上传文件
   */
  async uploadFile(
    file: Express.Multer.File,
    uploaderId: string,
    roomId?: string,
  ) {
    // 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`文件大小超过限制: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // 生成文件key
    const ext = path.extname(file.originalname);
    const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
    const timestamp = Date.now();
    const key = `${uploaderId}/${timestamp}_${hash.substring(0, 8)}${ext}`;

    // 准备元数据
    const metadata: FileMetadata = {
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };

    // 上传到存储
    const uploadResult = await this.storage.upload(file.buffer, key, metadata);

    // 保存到数据库
    const fileRecord = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: uploadResult.url,
        storageType: 'local',
        uploaderId,
        roomId,
        metadata: {},
      },
    });

    this.logger.log(`文件上传成功: ${fileRecord.id} - ${file.originalname}`);

    return fileRecord;
  }

  /**
   * 获取文件列表
   */
  async getFiles(roomId?: string, uploaderId?: string) {
    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (uploaderId) where.uploaderId = uploaderId;

    return this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * 获取单个文件
   */
  async getFile(fileId: string) {
    return this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    // 检查权限（只有上传者或房间管理员可以删除）
    if (file.uploaderId !== userId) {
      // TODO: 检查用户是否是房间管理员
      throw new BadRequestException('无权删除此文件');
    }

    // 从存储删除
    const key = this.extractKeyFromUrl(file.url);
    await this.storage.delete(key);

    // 从数据库删除
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    this.logger.log(`文件删除成功: ${fileId}`);

    return { success: true };
  }

  /**
   * 从URL提取key
   */
  private extractKeyFromUrl(url: string): string {
    const baseUrl = process.env.UPLOAD_BASE_URL || '/uploads';
    return url.replace(baseUrl + '/', '');
  }

  /**
   * 检查文件类型
   */
  getFileCategory(mimeType: string): 'image' | 'document' | 'code' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType === 'application/pdf') {
      return 'document';
    }
    if (['text/javascript', 'text/typescript', 'text/x-python', 'text/x-java'].includes(mimeType)) {
      return 'code';
    }
    return 'other';
  }
}