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
import { LLMMessage, LLMRequestOptions, LLMResponse, StreamingCallbacks } from './base/types';

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
    const p = this.providers.get(provider.toLowerCase());
    if (!p) {
      throw new Error(`不支持的AI提供商: ${provider}`);
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
    return this.providers.has(provider.toLowerCase());
  }

  /**
   * 发送消息
   */
  async sendMessage(
    provider: string,
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    const llmProvider = this.getProvider(provider);
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
    const llmProvider = this.getProvider(provider);
    return llmProvider.streamMessage(options, callbacks);
  }

  /**
   * 验证API Key
   */
  async validateApiKey(provider: string): Promise<boolean> {
    const llmProvider = this.getProvider(provider);
    return llmProvider.validateApiKey();
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
}
