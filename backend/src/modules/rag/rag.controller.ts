import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RAGService } from './rag.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RAGController {
  constructor(private readonly ragService: RAGService) {}

  /**
   * 处理文档（添加到知识库）
   */
  @Post('process/:fileId')
  async processDocument(
    @Param('fileId') fileId: string,
    @Body('roomId') roomId: string,
  ) {
    const result = await this.ragService.processDocument(fileId, roomId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 搜索知识库
   */
  @Get('search')
  async searchKnowledge(
    @Query('q') query: string,
    @Query('roomId') roomId: string,
    @Query('topK') topK?: string,
  ) {
    if (!query || !roomId) {
      return {
        success: false,
        error: '缺少查询参数',
      };
    }

    const results = await this.ragService.searchKnowledge(
      query,
      roomId,
      topK ? parseInt(topK, 10) : 5,
    );

    return {
      success: true,
      data: results,
    };
  }
}
