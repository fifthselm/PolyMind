import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { CreateAIModelDto, UpdateAIModelDto, AIModelResponse } from './dto/ai-model.dto';

@Injectable()
export class AIModelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建AI模型配置
   */
  async create(dto: CreateAIModelDto, userId: string): Promise<AIModelResponse> {
    const model = await this.prisma.aIModel.create({
      data: {
        provider: dto.provider,
        modelName: dto.modelName,
        displayName: dto.displayName,
        apiEndpoint: dto.apiEndpoint,
        apiKeyEncrypted: dto.apiKey, // 生产环境应该加密
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature || 0.7,
        maxTokens: dto.maxTokens || 2048,
        createdById: userId,
      },
    });

    return this.formatModelResponse(model);
  }

  /**
   * 获取所有模型
   */
  async findAll(): Promise<AIModelResponse[]> {
    const models = await this.prisma.aIModel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return models.map((m) => this.formatModelResponse(m));
  }

  /**
   * 根据ID获取模型
   */
  async findById(id: string): Promise<AIModelResponse> {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    return this.formatModelResponse(model);
  }

  /**
   * 更新模型配置
   */
  async update(id: string, dto: UpdateAIModelDto, userId: string): Promise<AIModelResponse> {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    if (model.createdById !== userId) {
      throw new ForbiddenException('只能修改自己创建的模型配置');
    }

    const updated = await this.prisma.aIModel.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        apiEndpoint: dto.apiEndpoint,
        apiKeyEncrypted: dto.apiKey,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        isActive: dto.isActive,
      },
    });

    return this.formatModelResponse(updated);
  }

  /**
   * 删除模型配置
   */
  async delete(id: string, userId: string): Promise<void> {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    if (model.createdById !== userId) {
      throw new ForbiddenException('只能删除自己创建的模型配置');
    }

    await this.prisma.aIModel.delete({
      where: { id },
    });
  }

  /**
   * 测试模型连接
   */
  async test(id: string): Promise<{ success: boolean; message: string }> {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    // TODO: 实现实际的API测试
    return {
      success: true,
      message: '模型配置有效',
    };
  }

  /**
   * 格式化模型响应
   */
  private formatModelResponse(model: any): AIModelResponse {
    return {
      id: model.id,
      provider: model.provider,
      modelName: model.modelName,
      displayName: model.displayName,
      apiEndpoint: model.apiEndpoint,
      systemPrompt: model.systemPrompt,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      isActive: model.isActive,
      createdById: model.createdById,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      // 不返回加密的API Key
    };
  }
}
