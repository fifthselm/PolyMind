import { Injectable, Logger } from '@nestjs/common';
import { BaseLLMProvider } from './base/base.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { QwenProvider } from './providers/qwen.provider';
import { WenxinProvider } from './providers/wenxin.provider';
import { GLMProvider } from './providers/glm.provider';
import { KimiProvider } from './providers/kimi.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { LLMMessage, LLMRequestOptions, LLMResponse, StreamingCallbacks, ProviderConfig } from './base/types';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly providers: Map<string, BaseLLMProvider> = new Map();

  constructor(
    private readonly openaiProvider: OpenAIProvider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly qwenProvider: QwenProvider,
    private readonly wenxinProvider: WenxinProvider,
    private readonly glmProvider: GLMProvider,
    private readonly kimiProvider: KimiProvider,
    private readonly deepseekProvider: DeepSeekProvider,
  ) {
    this.registerProviders();
  }

  /**
   * 注册所有Provider
   */
  private registerProviders(): void {
    this.providers.set('openai', this.openaiProvider);
    this.providers.set('claude', this.claudeProvider);
    this.providers.set('gemini', this.geminiProvider);
    this.providers.set('qwen', this.qwenProvider);
    this.providers.set('wenxin', this.wenxinProvider);
    this.providers.set('glm', this.glmProvider);
    this.providers.set('kimi', this.kimiProvider);
    this.providers.set('deepseek', this.deepseekProvider);
  }

  /**
   * 获取Provider
   */
  getProvider(provider: string): BaseLLMProvider {
    const normalizedProvider = this.normalizeProviderName(provider);
    const p = this.providers.get(normalizedProvider);
    if (!p) {
      throw new Error(`不支持的AI提供商: ${provider} (标准化后: ${normalizedProvider})`);
    }
    return p;
  }

  /**
   * 获取所有支持的提供商
   */
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 检查提供商是否支持
   */
  isProviderSupported(provider: string): boolean {
    const normalizedProvider = this.normalizeProviderName(provider);
    return this.providers.has(normalizedProvider);
  }

  /**
   * 发送消息
   */
  async sendMessage(
    provider: string,
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    const normalizedProvider = this.normalizeProviderName(provider);
    const llmProvider = this.getProvider(normalizedProvider);
    return llmProvider.sendMessage(options);
  }

  /**
   * 流式发送消息
   */
  async streamMessage(
    provider: string,
    options: LLMRequestOptions,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const normalizedProvider = this.normalizeProviderName(provider);
    const llmProvider = this.getProvider(normalizedProvider);
    return llmProvider.streamMessage(options, callbacks);
  }

  /**
   * 使用动态配置流式发送消息
   */
  async streamMessageWithConfig(
    provider: string,
    options: LLMRequestOptions,
    callbacks: StreamingCallbacks,
    config?: Partial<ProviderConfig>
  ): Promise<void> {
    const llmProvider = this.getProviderWithConfig(provider, config);
    return llmProvider.streamMessage(options, callbacks);
  }

  /**
   * 验证API Key（使用默认配置）
   */
  async validateApiKey(provider: string): Promise<boolean>;
  /**
   * 验证API Key（使用自定义配置）
   */
  async validateApiKey(provider: string, config: Partial<ProviderConfig>): Promise<boolean>;
  /**
   * 验证API Key实现
   */
  async validateApiKey(provider: string, config?: Partial<ProviderConfig>): Promise<boolean> {
    if (config) {
      const llmProvider = this.getProviderWithConfig(provider, config);
      return llmProvider.validateApiKey();
    }
    const llmProvider = this.getProvider(provider);
    return llmProvider.validateApiKey();
  }

  async getModelListWithConfig(
    provider: string,
    config?: Partial<ProviderConfig>
  ): Promise<string[]> {
    const llmProvider = this.getProviderWithConfig(provider, config);
    return llmProvider.getModelList();
  }

  /**
   * 批量处理多个AI模型的消息
   */
  async broadcastToProviders(
    providers: string[],
    options: LLMRequestOptions,
    callbacks?: {
      onChunk?: (provider: string, chunk: any) => void;
      onComplete?: (provider: string, response: LLMResponse) => void;
      onError?: (provider: string, error: Error) => void;
    }
  ): Promise<Map<string, LLMResponse>> {
    const results = new Map<string, LLMResponse>();
    const errors = new Map<string, Error>();

    // 并行调用所有提供商
    const promises = providers.map(async (provider) => {
      try {
        const response = await this.sendMessage(provider, options);
        results.set(provider, response);
        callbacks?.onComplete?.(provider, response);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.set(provider, err);
        callbacks?.onError?.(provider, err);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 创建聊天完成请求选项
   */
  createChatOptions(
    model: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): LLMRequestOptions {
    const llmMessages: LLMMessage[] = [];

    // 添加系统提示词
    if (systemPrompt) {
      llmMessages.push({ role: 'system', content: systemPrompt });
    }

    // 添加对话历史
    messages.forEach(msg => {
      llmMessages.push({
        role: msg.role as any,
        content: msg.content,
      });
    });

    return {
      model,
      messages: llmMessages,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2048,
    };
  }

  /**
   * 标准化provider名称（处理显示名称到技术标识符的映射）
   */
  private normalizeProviderName(provider: string): string {
    const providerLower = provider.toLowerCase().trim();

    // 直接匹配技术标识符
    const directMatches = ['openai', 'claude', 'gemini', 'qwen', 'wenxin', 'glm', 'kimi', 'deepseek', 'custom'];
    if (directMatches.includes(providerLower)) {
      return providerLower;
    }

    // 中文/显示名称映射
    const nameMappings: Record<string, string> = {
      // 阿里云/通义千问
      '阿里云': 'qwen',
      '通义千问': 'qwen',
      'qwen': 'qwen',
      // DeepSeek
      'deepseek': 'deepseek',
      '深度求索': 'deepseek',
      // OpenAI
      'openai': 'openai',
      // Claude
      'claude': 'claude',
      'anthropic': 'claude',
      // Gemini
      'gemini': 'gemini',
      'google': 'gemini',
      // 文心一言
      'wenxin': 'wenxin',
      '文心一言': 'wenxin',
      '百度': 'wenxin',
      // GLM
      'glm': 'glm',
      'chatglm': 'glm',
      '智谱': 'glm',
      // Kimi
      'kimi': 'kimi',
      'moonshot': 'kimi',
    };

    // 尝试部分匹配
    for (const [key, value] of Object.entries(nameMappings)) {
      if (providerLower.includes(key)) {
        return value;
      }
    }

    // 如果没有匹配，返回原始值（可能报错）
    return providerLower;
  }

  private getProviderWithConfig(
    provider: string,
    config?: Partial<ProviderConfig>
  ): BaseLLMProvider {
    const hasConfig = Boolean(config?.apiKey || config?.apiEndpoint);

    // 标准化provider名称
    const normalizedProvider = this.normalizeProviderName(provider);

    if (!hasConfig) {
      return this.getProvider(normalizedProvider);
    }

    const providerLower = normalizedProvider;
    const isOpenAI = providerLower === 'openai';

    // 处理API Endpoint格式
    let apiEndpoint = config?.apiEndpoint;
    if (apiEndpoint && isOpenAI) {
      // 确保OpenAI端点以/v1结尾
      if (!apiEndpoint.endsWith('/v1')) {
        apiEndpoint = apiEndpoint.replace(/\/+$/, '') + '/v1';
      }
    }

    const normalizedConfig: ProviderConfig = {
      apiKey: config?.apiKey !== undefined && config?.apiKey !== null 
        ? config.apiKey 
        : (isOpenAI ? process.env.OPENAI_API_KEY || '' : ''),
      apiEndpoint: apiEndpoint || (isOpenAI ? process.env.OPENAI_API_ENDPOINT : undefined),
      organizationId: config?.organizationId,
      timeout: config?.timeout ?? 60000,
      maxRetries: config?.maxRetries ?? 3,
    };

    switch (providerLower) {
      case 'openai':
        return new OpenAIProvider(normalizedConfig);
      case 'claude':
        return new ClaudeProvider(normalizedConfig);
      case 'gemini':
        return new GeminiProvider(normalizedConfig);
      case 'qwen':
        return new QwenProvider(normalizedConfig);
      case 'wenxin':
        return new WenxinProvider(normalizedConfig);
      case 'glm':
        return new GLMProvider(normalizedConfig);
      case 'kimi':
        return new KimiProvider(normalizedConfig);
      case 'deepseek':
        return new DeepSeekProvider(normalizedConfig);
      default:
        return this.getProvider(provider);
    }
  }
}
