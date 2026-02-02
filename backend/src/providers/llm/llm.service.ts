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

// 性能监控指标
interface LLMPerformanceMetrics {
  provider: string;
  model: string;
  startTime: number;
  endTime?: number;
  firstChunkTime?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  success: boolean;
  error?: string;
  retryCount: number;
}

// 请求上下文
interface RequestContext {
  abortController?: AbortController;
  startTime: number;
  retryCount: number;
  metrics: LLMPerformanceMetrics;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly providers: Map<string, BaseLLMProvider> = new Map();
  
  // 性能监控存储
  private performanceMetrics: LLMPerformanceMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

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
   * 发送消息（带重试机制）
   */
  async sendMessage(
    provider: string,
    options: LLMRequestOptions,
    config?: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
      signal?: AbortSignal;
    }
  ): Promise<LLMResponse> {
    const normalizedProvider = this.normalizeProviderName(provider);
    const maxRetries = config?.maxRetries ?? 3;
    const retryDelay = config?.retryDelay ?? 1000;
    const timeout = config?.timeout ?? 60000;
    
    // 创建请求上下文
    const context: RequestContext = {
      startTime: Date.now(),
      retryCount: 0,
      metrics: {
        provider: normalizedProvider,
        model: options.model,
        startTime: Date.now(),
        success: false,
        retryCount: 0,
      },
    };

    // 检查是否已取消
    if (config?.signal?.aborted) {
      throw new Error('Request was aborted');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        context.retryCount = attempt;
        context.metrics.retryCount = attempt;

        // 创建超时 Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);

          // 如果信号已取消，清除定时器
          config?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Request was aborted'));
          }, { once: true });
        });

        // 执行请求
        const llmProvider = this.getProvider(normalizedProvider);
        const requestPromise = llmProvider.sendMessage(options);

        // 竞争超时和请求
        const response = await Promise.race([requestPromise, timeoutPromise]);

        // 记录成功指标
        context.metrics.endTime = Date.now();
        context.metrics.success = true;
        context.metrics.totalTokens = response.usage?.totalTokens;
        context.metrics.promptTokens = response.usage?.promptTokens;
        context.metrics.completionTokens = response.usage?.completionTokens;
        this.recordMetrics(context.metrics);

        this.logger.log(`[${normalizedProvider}] 请求成功，耗时: ${context.metrics.endTime - context.metrics.startTime}ms`);

        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 检查是否是取消错误
        if (lastError.message.includes('aborted')) {
          this.logger.log(`[${normalizedProvider}] 请求被取消`);
          throw lastError;
        }

        // 检查是否应该重试
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(retryDelay, attempt);
          this.logger.warn(`[${normalizedProvider}] 请求失败，${delay}ms后重试 (${attempt + 1}/${maxRetries}): ${lastError.message}`);
          await this.sleep(delay);
        } else {
          // 记录失败指标
          context.metrics.endTime = Date.now();
          context.metrics.success = false;
          context.metrics.error = lastError.message;
          this.recordMetrics(context.metrics);

          this.logger.error(`[${normalizedProvider}] 请求最终失败: ${lastError.message}`);
          throw this.enhanceError(lastError, normalizedProvider, attempt);
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * 流式发送消息（带重试机制）
   */
  async streamMessage(
    provider: string,
    options: LLMRequestOptions,
    callbacks: StreamingCallbacks,
    config?: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    const normalizedProvider = this.normalizeProviderName(provider);
    const maxRetries = config?.maxRetries ?? 3;
    const retryDelay = config?.retryDelay ?? 1000;
    const timeout = config?.timeout ?? 60000;

    // 创建请求上下文
    const context: RequestContext = {
      startTime: Date.now(),
      retryCount: 0,
      metrics: {
        provider: normalizedProvider,
        model: options.model,
        startTime: Date.now(),
        success: false,
        retryCount: 0,
      },
    };

    // 检查是否已取消
    if (config?.signal?.aborted) {
      throw new Error('Request was aborted');
    }

    let lastError: Error | null = null;
    let accumulatedContent = '';
    let firstChunkReceived = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        context.retryCount = attempt;
        context.metrics.retryCount = attempt;

        const llmProvider = this.getProvider(normalizedProvider);

        // 包装回调以记录首块时间
        const wrappedCallbacks: StreamingCallbacks = {
          onChunk: (chunk) => {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              context.metrics.firstChunkTime = Date.now();
            }

            const content = chunk.choices[0]?.delta?.content || '';
            accumulatedContent += content;

            // 检查是否已取消
            if (config?.signal?.aborted) {
              return;
            }

            callbacks.onChunk(chunk);
          },
          onComplete: (fullContent) => {
            // 记录成功指标
            context.metrics.endTime = Date.now();
            context.metrics.success = true;
            this.recordMetrics(context.metrics);

            this.logger.log(`[${normalizedProvider}] 流式请求成功，首块: ${context.metrics.firstChunkTime ? context.metrics.firstChunkTime - context.metrics.startTime : 'N/A'}ms, 总耗时: ${context.metrics.endTime - context.metrics.startTime}ms`);

            callbacks.onComplete(fullContent);
          },
          onError: (error) => {
            // 检查是否是取消错误
            if (error.message.includes('aborted')) {
              this.logger.log(`[${normalizedProvider}] 流式请求被取消`);
              callbacks.onError(error);
              return;
            }

            // 记录失败指标
            context.metrics.endTime = Date.now();
            context.metrics.success = false;
            context.metrics.error = error.message;
            this.recordMetrics(context.metrics);

            this.logger.error(`[${normalizedProvider}] 流式请求失败: ${error.message}`);
            callbacks.onError(this.enhanceError(error, normalizedProvider, attempt));
          },
        };

        // 创建超时处理
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Stream timeout after ${timeout}ms`));
          }, timeout);

          config?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Stream was aborted'));
          }, { once: true });
        });

        // 执行流式请求
        const streamPromise = llmProvider.streamMessage(options, wrappedCallbacks);

        // 竞争超时和请求
        await Promise.race([streamPromise, timeoutPromise]);

        // 如果成功，直接返回
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否是取消错误
        if (lastError.message.includes('aborted')) {
          throw lastError;
        }

        // 检查是否应该重试
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(retryDelay, attempt);
          this.logger.warn(`[${normalizedProvider}] 流式请求失败，${delay}ms后重试 (${attempt + 1}/${maxRetries}): ${lastError.message}`);
          
          // 重置首块标记
          firstChunkReceived = false;
          
          await this.sleep(delay);
        } else {
          // 记录失败指标
          context.metrics.endTime = Date.now();
          context.metrics.success = false;
          context.metrics.error = lastError.message;
          this.recordMetrics(context.metrics);

          this.logger.error(`[${normalizedProvider}] 流式请求最终失败: ${lastError.message}`);
          throw this.enhanceError(lastError, normalizedProvider, attempt);
        }
      }
    }

    throw lastError || new Error('Unknown error');
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
    
    // 提取重试配置
    const retryConfig = {
      maxRetries: config?.maxRetries ?? 3,
      timeout: config?.timeout ?? 60000,
      signal: options.signal,
    };

    // 移除 signal 从 options，因为我们已经在 retryConfig 中处理
    const { signal, ...cleanOptions } = options;

    return this.streamMessage(provider, cleanOptions, callbacks, retryConfig);
  }

  /**
   * 验证API Key
   */
  async validateApiKey(provider: string, config?: Partial<ProviderConfig>): Promise<boolean> {
    try {
      if (config) {
        const llmProvider = this.getProviderWithConfig(provider, config);
        return llmProvider.validateApiKey();
      }
      const llmProvider = this.getProvider(provider);
      return llmProvider.validateApiKey();
    } catch (error) {
      this.logger.error(`[${provider}] API Key验证失败: ${error}`);
      return false;
    }
  }

  /**
   * 获取模型列表
   */
  async getModelListWithConfig(provider: string, config?: Partial<ProviderConfig>): Promise<string[]> {
    try {
      const llmProvider = config 
        ? this.getProviderWithConfig(provider, config)
        : this.getProvider(provider);
      return llmProvider.getModelList();
    } catch (error) {
      this.logger.error(`[${provider}] 获取模型列表失败: ${error}`);
      return [];
    }
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
   * 获取性能统计
   */
  getPerformanceStats(): {
    totalRequests: number;
    successRate: number;
    avgLatency: number;
    avgFirstChunkLatency: number;
    providerStats: Record<string, {
      total: number;
      success: number;
      failed: number;
      avgLatency: number;
    }>;
  } {
    const metrics = this.performanceMetrics;
    const total = metrics.length;
    
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        avgFirstChunkLatency: 0,
        providerStats: {},
      };
    }

    const successful = metrics.filter(m => m.success);
    const failed = metrics.filter(m => !m.success);

    // 计算平均延迟
    const latencies = successful
      .filter(m => m.endTime && m.startTime)
      .map(m => m.endTime! - m.startTime);
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

    // 计算首块延迟
    const firstChunkLatencies = successful
      .filter(m => m.firstChunkTime && m.startTime)
      .map(m => m.firstChunkTime! - m.startTime);
    const avgFirstChunkLatency = firstChunkLatencies.length > 0
      ? firstChunkLatencies.reduce((a, b) => a + b, 0) / firstChunkLatencies.length
      : 0;

    // 按提供商统计
    const providerStats: Record<string, { total: number; success: number; failed: number; avgLatency: number }> = {};
    
    metrics.forEach(m => {
      if (!providerStats[m.provider]) {
        providerStats[m.provider] = { total: 0, success: 0, failed: 0, avgLatency: 0 };
      }
      
      providerStats[m.provider].total++;
      if (m.success) {
        providerStats[m.provider].success++;
      } else {
        providerStats[m.provider].failed++;
      }
    });

    // 计算每个提供商的平均延迟
    Object.keys(providerStats).forEach(provider => {
      const providerMetrics = successful.filter(m => m.provider === provider && m.endTime);
      if (providerMetrics.length > 0) {
        const avg = providerMetrics.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / providerMetrics.length;
        providerStats[provider].avgLatency = avg;
      }
    });

    return {
      totalRequests: total,
      successRate: (successful.length / total) * 100,
      avgLatency,
      avgFirstChunkLatency,
      providerStats,
    };
  }

  /**
   * 清除性能指标历史
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
    this.logger.log('性能指标历史已清除');
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
   * 标准化provider名称
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
      '阿里云': 'qwen',
      '通义千问': 'qwen',
      'qwen': 'qwen',
      'deepseek': 'deepseek',
      '深度求索': 'deepseek',
      'openai': 'openai',
      'claude': 'claude',
      'anthropic': 'claude',
      'gemini': 'gemini',
      'google': 'gemini',
      'wenxin': 'wenxin',
      '文心一言': 'wenxin',
      '百度': 'wenxin',
      'glm': 'glm',
      'chatglm': 'glm',
      '智谱': 'glm',
      'kimi': 'kimi',
      'moonshot': 'kimi',
    };

    for (const [key, value] of Object.entries(nameMappings)) {
      if (providerLower.includes(key)) {
        return value;
      }
    }

    return providerLower;
  }

  /**
   * 判断是否应重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误、超时、速率限制应该重试
    const retryableErrors = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'rate limit',
      '429',
      '503',
      '502',
      '500',
    ];

    const errorMessage = error?.message || String(error);
    return retryableErrors.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(baseDelay: number, attempt: number): number {
    // 指数退避: delay * 2^attempt + 随机抖动
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // 0-1000ms 随机抖动
    return Math.min(exponentialDelay + jitter, 30000); // 最大30秒
  }

  /**
   * 增强错误信息
   */
  private enhanceError(error: Error, provider: string, retryCount: number): Error {
    const enhancedMessage = `[${provider}] 请求失败 (重试${retryCount}次): ${error.message}`;
    const enhancedError = new Error(enhancedMessage);
    enhancedError.stack = error.stack;
    (enhancedError as any).originalError = error;
    (enhancedError as any).provider = provider;
    (enhancedError as any).retryCount = retryCount;
    return enhancedError;
  }

  /**
   * 记录性能指标
   */
  private recordMetrics(metrics: LLMPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // 限制历史记录大小
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * 获取带配置的Provider实例
   */
  private getProviderWithConfig(
    provider: string,
    config?: Partial<ProviderConfig>
  ): BaseLLMProvider {
    const hasConfig = Boolean(config?.apiKey || config?.apiEndpoint);

    const normalizedProvider = this.normalizeProviderName(provider);

    if (!hasConfig) {
      return this.getProvider(normalizedProvider);
    }

    const providerLower = normalizedProvider;
    const isOpenAI = providerLower === 'openai';

    // 处理API Endpoint格式
    let apiEndpoint = config?.apiEndpoint;
    if (apiEndpoint && isOpenAI) {
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

  /**
   * 等待指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
