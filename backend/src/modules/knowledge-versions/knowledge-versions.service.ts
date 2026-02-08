import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';

@Injectable()
export class KnowledgeVersionsService {
  private readonly logger = new Logger(KnowledgeVersionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createVersion(data: CreateVersionDto) {
    const version = await this.prisma.kbVersion.create({
      data: {
        documentId: data.documentId,
        content: data.content,
        changeDescription: data.changeDescription,
        versionNumber: await this.getNextVersionNumber(data.documentId),
      },
    });

    this.logger.log(`创建版本: ${version.id} - ${version.versionNumber}`);
    return version;
  }

  async getVersionHistory(documentId: string) {
    const versions = await this.prisma.kbVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    return versions;
  }

  async getVersion(versionId: string) {
    const version = await this.prisma.kbVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`版本ID ${versionId} 不存在`);
    }

    return version;
  }

  async rollback(versionId: string) {
    const version = await this.getVersion(versionId);
    
    // 创建新版本，内容回滚到指定版本
    const newVersion = await this.prisma.kbVersion.create({
      data: {
        documentId: version.documentId,
        content: version.content,
        changeDescription: `回滚到版本 ${version.versionNumber}`,
        versionNumber: await this.getNextVersionNumber(version.documentId),
      },
    });

    this.logger.log(`回滚到版本: ${version.versionNumber}，新版本: ${newVersion.versionNumber}`);
    return newVersion;
  }

  async compareVersions(versionIdA: string, versionIdB: string) {
    const [verA, verB] = await Promise.all([
      this.getVersion(versionIdA),
      this.getVersion(versionIdB),
    ]);

    // 简单比较：统计行数、字数差异
    const linesA = (verA.content || '').split('\n');
    const linesB = (verB.content || '').split('\n');

    return {
      versionA: {
        id: verA.id,
        versionNumber: verA.versionNumber,
        lineCount: linesA.length,
        wordCount: (verA.content || '').length,
        createdAt: verA.createdAt,
      },
      versionB: {
        id: verB.id,
        versionNumber: verB.versionNumber,
        lineCount: linesB.length,
        wordCount: (verB.content || '').length,
        createdAt: verB.createdAt,
      },
      diff: {
        lineDiff: linesB.length - linesA.length,
        wordDiff: (verB.content || '').length - (verA.content || '').length,
      },
    };
  }

  private async getNextVersionNumber(documentId: string): Promise<number> {
    const last = await this.prisma.kbVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    return (last?.versionNumber || 0) + 1;
  }
}
