import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
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
export class OpenAIProvider extends BaseLLMProvider {
  readonly providerName = 'openai';
  readonly defaultModel = 'gpt-3.5-turbo';
  readonly supportedModels = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-0125',
  ];

  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.apiEndpoint || 'https://api.openai.com/v1',
      timeout: config.timeout || 60000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': config.organizationId,
      },
    });
  }

  /**
   * 发送消息
   */
  async sendMessage(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const payload = this.buildPayload(options);
      const response = await this.client.post('/chat/completions', payload);
      return this.transformResponse(response.data);
    } catch (error) {
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
      const payload = this.buildPayload({ ...options, stream: true });
      
      const response = await this.client.post('/chat/completions', payload, {
        responseType: 'stream',
      });

      let fullContent = '';
      const stream = response.data;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                callbacks.onComplete(fullContent);
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data) as LLMStreamChunk;
                const content = parsed.choices[0]?.delta?.content;
                
                if (content) {
                  fullContent += content;
                  callbacks.onChunk(parsed);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        stream.on('error', (error: Error) => {
          callbacks.onError(error);
          reject(error);
        });

        stream.on('end', () => {
          if (fullContent) {
            callbacks.onComplete(fullContent);
          }
          resolve();
        });
      });
    } catch (error) {
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
        .filter((m: any) => m.id.startsWith('gpt'))
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
      max_tokens: options.maxTokens ?? 2048,
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
