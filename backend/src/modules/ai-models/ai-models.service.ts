import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { CreateAIModelDto, UpdateAIModelDto, AIModelResponse, GetAvailableModelsDto, TestAndSaveModelDto } from './dto/ai-model.dto';

@Injectable()
export class AIModelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
  ) {}

  /**
   * 验证模型配置
   */
  private validateModelConfig(dto: CreateAIModelDto | UpdateAIModelDto, provider: string): void {
    // 验证API Key
    if (dto.apiKey !== undefined) {
      if (!dto.apiKey || dto.apiKey.trim() === '') {
        throw new Error('API Key不能为空');
      }
      // 检查是否包含Bearer前缀（应该只存储密钥本身）
      if (dto.apiKey.toLowerCase().startsWith('bearer ')) {
        throw new Error('API Key不应包含"Bearer "前缀，请只输入密钥本身');
      }
    }

    // 验证模型名称
    if (dto.modelName !== undefined) {
      if (!dto.modelName || dto.modelName.trim() === '') {
        throw new Error('模型名称不能为空');
      }
      // 检查模型名称格式（通常为小写、短横线分隔）
      const normalizedName = dto.modelName.trim().toLowerCase();
      if (normalizedName !== dto.modelName.trim()) {
        throw new Error(`模型名称应为小写格式，建议: "${normalizedName}"`);
      }
    }

    // 验证API Endpoint
    if (dto.apiEndpoint !== undefined && dto.apiEndpoint) {
      try {
        new URL(dto.apiEndpoint);
      } catch {
        throw new Error(`API Endpoint格式不正确: ${dto.apiEndpoint}`);
      }

      // OpenAI端点应该以/v1结尾
      if (provider.toLowerCase() === 'openai' && !dto.apiEndpoint.endsWith('/v1')) {
        throw new Error(`OpenAI API Endpoint应以/v1结尾，例如: https://api.openai.com/v1`);
      }
    }
  }

  /**
   * 创建AI模型配置
   */
  async create(dto: CreateAIModelDto, userId: string): Promise<AIModelResponse> {
    // 验证配置
    this.validateModelConfig(dto, dto.provider);

    const model = await this.prisma.aIModel.create({
      data: {
        provider: dto.provider,
        modelName: dto.modelName.trim(),
        displayName: dto.displayName.trim(),
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

    return models.map((m: any) => this.formatModelResponse(m));
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

    // 验证配置（使用原模型的provider）
    this.validateModelConfig(dto, model.provider);

    const updateData: Record<string, any> = {};
    if (dto.modelName !== undefined) updateData.modelName = dto.modelName.trim();
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName.trim();
    if (dto.apiEndpoint !== undefined) updateData.apiEndpoint = dto.apiEndpoint;
    if (dto.apiKey !== undefined) updateData.apiKeyEncrypted = dto.apiKey;
    if (dto.systemPrompt !== undefined) updateData.systemPrompt = dto.systemPrompt;
    if (dto.temperature !== undefined) updateData.temperature = dto.temperature;
    if (dto.maxTokens !== undefined) updateData.maxTokens = dto.maxTokens;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.aIModel.update({
      where: { id },
      data: updateData,
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

    // 验证API Key是否为空
    if (!model.apiKeyEncrypted || model.apiKeyEncrypted.trim() === '') {
      return {
        success: false,
        message: 'API Key不能为空',
      };
    }

    // 验证API Endpoint格式
    if (model.apiEndpoint) {
      try {
        new URL(model.apiEndpoint);
      } catch {
        return {
          success: false,
          message: `API Endpoint格式不正确: ${model.apiEndpoint}`,
        };
      }

      // 确保端点以/v1结尾（OpenAI标准）
      if (model.provider.toLowerCase() === 'openai' && !model.apiEndpoint.endsWith('/v1')) {
        return {
          success: false,
          message: `OpenAI API Endpoint应以/v1结尾，当前为: ${model.apiEndpoint}`,
        };
      }
    }

    // 验证模型名称是否为空
    if (!model.modelName || model.modelName.trim() === '') {
      return {
        success: false,
        message: '模型名称不能为空',
      };
    }

    // 实际测试API连接
    try {
      const isValid = await this.llmService.validateApiKey(model.provider, {
        apiKey: model.apiKeyEncrypted,
        apiEndpoint: model.apiEndpoint || undefined,
      });

      if (!isValid) {
        return {
          success: false,
          message: 'API Key无效或无法连接到API服务',
        };
      }

      // 测试模型是否可用（可选）
      try {
        const availableModels = await this.llmService.getModelListWithConfig(
          model.provider,
          {
            apiKey: model.apiKeyEncrypted,
            apiEndpoint: model.apiEndpoint || undefined,
          }
        );

        if (availableModels.length > 0 && !availableModels.includes(model.modelName)) {
          // 模型不在可用列表中，给出警告但不失败
          return {
            success: true,
            message: `连接成功，但模型"${model.modelName}"不在可用模型列表中。可用模型: ${availableModels.slice(0, 5).join(', ')}${availableModels.length > 5 ? '...' : ''}`,
          };
        }
      } catch {
        // 获取模型列表失败但不影响主测试结果
      }

      return {
        success: true,
        message: '模型配置有效，API连接正常',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        message: `测试失败: ${errorMessage}`,
      };
    }
  }

  /**
   * 测试并保存模型配置
   * 先测试配置是否有效，测试通过后才保存
   */
  async testAndSave(
    dto: TestAndSaveModelDto,
    userId: string
  ): Promise<{ success: boolean; message: string; model?: AIModelResponse }> {
    // 1. 先验证配置格式
    try {
      this.validateModelConfig(dto, dto.provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '配置验证失败';
      return {
        success: false,
        message: errorMessage,
      };
    }

    // 2. 测试API连接
    try {
      const isValid = await this.llmService.validateApiKey(dto.provider, {
        apiKey: dto.apiKey || '',
        apiEndpoint: dto.apiEndpoint || undefined,
      });

      if (!isValid) {
        return {
          success: false,
          message: 'API Key无效或无法连接到API服务，请检查配置',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试连接失败';
      return {
        success: false,
        message: `测试失败: ${errorMessage}`,
      };
    }

    // 3. 测试通过，保存配置
    try {
      let model: AIModelResponse;

      if (dto.id) {
        // 更新现有模型
        model = await this.update(dto.id, dto, userId);
      } else {
        // 创建新模型
        model = await this.create(dto, userId);
      }

      return {
        success: true,
        message: dto.id ? '测试通过，模型配置已更新' : '测试通过，模型配置已保存',
        model,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      return {
        success: false,
        message: `测试通过但保存失败: ${errorMessage}`,
      };
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(dto: GetAvailableModelsDto): Promise<{ models: string[] }> {
    const models = await this.llmService.getModelListWithConfig(dto.provider, {
      apiKey: dto.apiKey,
      apiEndpoint: dto.apiEndpoint,
    });
    return { models };
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
