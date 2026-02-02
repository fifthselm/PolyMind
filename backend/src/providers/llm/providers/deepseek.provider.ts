import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BaseLLMProvider } from '../base/base.provider';
import {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  StreamingCallbacks,
  ProviderConfig
} from '../base/types';

@Injectable()
export class DeepSeekProvider extends BaseLLMProvider {
  readonly providerName = 'deepseek';
  readonly defaultModel = 'deepseek-chat';
  readonly supportedModels = [
    'deepseek-chat',
    'deepseek-reasoner',
  ];

  private client: any;
  private apiKey: string;
  private readonly logger = new Logger(DeepSeekProvider.name);

  constructor(config: ProviderConfig) {
    super();
    this.apiKey = (config.apiKey || '').trim();
    const endpoint = this.normalizeEndpoint(config.apiEndpoint || 'https://api.deepseek.com/v1', 'v1');
    this.client = axios.create({
      baseURL: endpoint,
      timeout: config.timeout || 60000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 发送消息
   */
  async sendMessage(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('DeepSeek API Key 未配置');
      }
      this.logger.log(`DeepSeek sendMessage - 模型: ${options.model}`);
      const payload = this.buildPayload(options);
      const response = await this.client.post('/chat/completions', payload);
      this.logger.log(`DeepSeek响应成功`);
      return this.transformResponse(response.data);
    } catch (error) {
      this.logger.error(`DeepSeek sendMessage失败: ${error.message}`);
      throw this.handleError(error);
    }
  }

  /**
   * 流式发送消息
   */
  async streamMessage(
    options: LLMRequestOptions,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error('DeepSeek API Key 未配置');
      }
      
      this.logger.log(`DeepSeek请求开始 - 模型: ${options.model}`);
      this.logger.log(`消息数量: ${options.messages.length}`);
      
      const payload = this.buildPayload({ ...options, stream: true });
      this.logger.debug(`请求payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await this.client.post('/chat/completions', payload, {
        responseType: 'stream',
      });

      let fullContent = '';
      let chunkCount = 0;
      const stream = response.data;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          this.logger.debug(`收到chunk: ${lines.length} lines`);

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                this.logger.log(`DeepSeek响应完成 - 总字符数: ${fullContent.length}, chunks: ${chunkCount}`);
                callbacks.onComplete(fullContent);
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                chunkCount++;
                
                // 检查DeepSeek响应格式
                const content = parsed.choices?.[0]?.delta?.content || 
                               parsed.choices?.[0]?.text ||
                               parsed.choices?.[0]?.message?.content;
                
                if (content) {
                  fullContent += content;
                  callbacks.onChunk(parsed);
                  this.logger.debug(`收到内容: ${content.substring(0, 50)}...`);
                }
              } catch (e) {
                this.logger.warn(`解析chunk失败: ${e.message}, data: ${data.substring(0, 100)}`);
              }
            }
          }
        });

        stream.on('error', (error: Error) => {
          this.logger.error(`Stream错误: ${error.message}`);
          callbacks.onError(error);
          reject(error);
        });

        stream.on('end', () => {
          this.logger.log(`Stream结束 - 总字符数: ${fullContent.length}`);
          if (fullContent) {
            callbacks.onComplete(fullContent);
          } else {
            this.logger.warn('Stream结束但没有收到任何内容');
            callbacks.onError(new Error('DeepSeek没有返回任何内容'));
          }
          resolve();
        });
      });
    } catch (error) {
      this.logger.error(`DeepSeek请求失败: ${error.message}`);
      callbacks.onError(this.handleError(error));
    }
  }

  /**
   * 验证API Key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取模型列表
   */
  async getModelList(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data
        .filter((m: any) => m.id.startsWith('deepseek'))
        .map((m: any) => m.id);
    } catch {
      return this.supportedModels;
    }
  }

  /**
   * 构建请求载荷
   */
  private buildPayload(options: LLMRequestOptions): any {
    const payload: any = {
      model: options.model,
      messages: options.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: options.stream ?? false,
    };

    if (options.topP !== undefined) {
      payload.top_p = options.topP;
    }

    if (options.frequencyPenalty !== undefined) {
      payload.frequency_penalty = options.frequencyPenalty;
    }

    if (options.presencePenalty !== undefined) {
      payload.presence_penalty = options.presencePenalty;
    }

    if (options.stop) {
      payload.stop = options.stop;
    }

    return payload;
  }

  private normalizeEndpoint(raw: string, suffix: string): string {
    let url = raw.trim().replace(/\/+$/, '');
    url = url.replace(/\/chat\/completions$/, '');
    if (!url.endsWith(`/${suffix}`) && !url.endsWith(suffix)) {
      if (url.endsWith('/v1') && suffix === 'v1') {
        return url;
      }
      url = `${url}/${suffix}`;
    }
    return url;
  }

  /**
   * 处理DeepSeek特定错误
   */
  protected handleError(error: any): Error {
    this.logger.error(`DeepSeek错误详情: ${JSON.stringify(error, null, 2)}`);
    
    if (error?.response?.data) {
      const data = error.response.data;
      const errorMsg = data.error?.message || data.message || JSON.stringify(data);
      this.logger.error(`DeepSeek API返回错误: ${errorMsg}`);
      return new Error(`DeepSeek API错误: ${errorMsg}`);
    }
    
    if (error?.response?.status) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      this.logger.error(`DeepSeek HTTP错误: ${status} ${statusText}`);
      return new Error(`DeepSeek请求失败 (${status} ${statusText})`);
    }
    
    if (error?.code === 'ECONNREFUSED') {
      return new Error('无法连接到DeepSeek服务器，请检查网络');
    }
    
    if (error?.code === 'ETIMEDOUT') {
      return new Error('DeepSeek请求超时，请稍后重试');
    }
    
    return super.handleError(error);
  }

  /**
   * 转换响应格式
   */
  private transformResponse(data: any): LLMResponse {
    const choice = data.choices[0];
    return {
      id: data.id,
      object: 'chat.completion',
      created: data.created,
      model: data.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: choice.message.content,
        },
        finish_reason: choice.finish_reason,
      }],
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
