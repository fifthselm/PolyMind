import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'fs/promises';
import * as path from 'path';

// 文档解析器
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private embeddings: OpenAIEmbeddings;
  private vectorStore: Chroma | null = null;

  constructor(private readonly prisma: PrismaService) {
    // 初始化OpenAI Embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });
  }

  /**
   * 处理文档并添加到知识库
   */
  async processDocument(
    fileId: string,
    roomId: string,
  ): Promise<{ chunks: number; tokens: number }> {
    // 获取文件信息
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('文件不存在');
    }

    this.logger.log(`处理文档: ${file.filename}`);

    // 解析文档内容
    const content = await this.parseDocument(file.url, file.mimeType);
    
    if (!content || content.trim().length === 0) {
      throw new Error('文档内容为空或无法解析');
    }

    // 文本分块
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments([content]);
    this.logger.log(`文档分块完成: ${chunks.length} 个块`);

    // 初始化向量存储
    await this.initializeVectorStore(roomId);

    if (!this.vectorStore) {
      throw new Error('向量存储初始化失败');
    }

    // 添加文档到向量存储
    const docsWithMetadata = chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        fileId,
        roomId,
        chunkIndex: index,
        filename: file.filename,
      },
    }));

    await this.vectorStore.addDocuments(docsWithMetadata);

    // 估算token数量（粗略估计）
    const tokens = content.length / 4;

    this.logger.log(`文档处理完成: ${chunks.length} 块, 约 ${Math.round(tokens)} tokens`);

    return {
      chunks: chunks.length,
      tokens: Math.round(tokens),
    };
  }

  /**
   * 搜索相关知识
   */
  async searchKnowledge(
    query: string,
    roomId: string,
    topK: number = 5,
  ): Promise<Array<{ content: string; score: number; source: string }>> {
    await this.initializeVectorStore(roomId);

    if (!this.vectorStore) {
      return [];
    }

    const results = await this.vectorStore.similaritySearchWithScore(query, topK, {
      roomId,
    });

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      score,
      source: doc.metadata.filename || '未知来源',
    }));
  }

  /**
   * 删除文档的知识
   */
  async deleteDocumentKnowledge(fileId: string): Promise<void> {
    // TODO: 实现从向量存储删除特定文档
    this.logger.log(`删除文档知识: ${fileId}`);
  }

  /**
   * 解析文档内容
   */
  private async parseDocument(fileUrl: string, mimeType: string): Promise<string> {
    const filePath = path.join(process.cwd(), fileUrl.replace('/uploads/', 'uploads/'));

    try {
      // PDF
      if (mimeType === 'application/pdf') {
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);
        return data.text;
      }

      // Word
      if (mimeType.includes('word') || mimeType.includes('officedocument')) {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }

      // 文本文件
      if (mimeType.startsWith('text/') || 
          mimeType.includes('javascript') || 
          mimeType.includes('json') ||
          mimeType.includes('markdown')) {
        return await fs.readFile(filePath, 'utf-8');
      }

      throw new Error(`不支持的文档类型: ${mimeType}`);
    } catch (error) {
      this.logger.error(`文档解析失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 初始化向量存储
   */
  private async initializeVectorStore(roomId: string): Promise<void> {
    if (this.vectorStore) {
      return;
    }

    try {
      this.vectorStore = await Chroma.fromExistingCollection(
        this.embeddings,
        {
          collectionName: `room_${roomId}`,
          url: process.env.CHROMA_URL || 'http://localhost:8000',
        }
      );
    } catch (error) {
      // 如果集合不存在，创建新的
      this.vectorStore = await Chroma.fromDocuments(
        [],
        this.embeddings,
        {
          collectionName: `room_${roomId}`,
          url: process.env.CHROMA_URL || 'http://localhost:8000',
        }
      );
    }
  }

  /**
   * 构建RAG提示词
   */
  buildRAGPrompt(query: string, contexts: Array<{ content: string; source: string }>): string {
    const contextText = contexts
      .map((ctx, index) => `[${index + 1}] ${ctx.content}\n来源: ${ctx.source}`)
      .join('\n\n');

    return `基于以下参考资料回答问题：

${contextText}

---

问题: ${query}

请根据上述参考资料回答问题。如果参考资料中没有相关信息，请明确说明。`;
  }
}
