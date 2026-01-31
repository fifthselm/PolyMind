import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
export class ClaudeProvider extends BaseLLMProvider {
  readonly providerName = 'claude';
  readonly defaultModel = 'claude-sonnet-4-20250514';
  readonly supportedModels = [
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-haiku-3-20250514',
    'claude-opus-3-20250219',
    'claude-sonnet-3-20240229',
    'claude-haiku-3-20240307',
  ];

  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.apiEndpoint || 'https://api.anthropic.com/v1',
      timeout: config.timeout || 60000,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
  }

  /**
   * 发送消息
   */
  async sendMessage(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const payload = this.buildPayload(options);
      const response = await this.client.post('/messages', payload);
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
      
      const response = await this.client.post('/messages', payload, {
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
                const parsed = JSON.parse(data) as any;
                const content = parsed.delta?.text || parsed.completion?.slice(-1);
                
                if (content) {
                  fullContent += content;
                  callbacks.onChunk({
                    id: parsed.id || 'claude-stream',
                    object: 'chunk',
                    created: Date.now(),
                    model: options.model,
                    choices: [{
                      index: 0,
                      delta: { content },
                      finish_reason: parsed.stop_reason,
                    }],
                  });
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
          callbacks.onComplete(fullContent);
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
      await this.client.get('/messages', {
        params: { max_tokens: 1 },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取模型列表
   */
  async getModelList(): Promise<string[]> {
    return this.supportedModels;
  }

  /**
   * 构建请求载荷
   */
  private buildPayload(options: LLMRequestOptions): any {
    const systemMessage = options.messages.find(m => m.role === 'system');
    const conversationMessages = options.messages.filter(m => m.role !== 'system');

    const payload: any = {
      model: options.model,
      messages: conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      stream: options.stream ?? false,
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    if (options.topP !== undefined) {
      payload.top_p = options.topP;
    }

    return payload;
  }

  /**
   * 转换响应格式
   */
  private transformResponse(data: any): LLMResponse {
    return {
      id: data.id,
      object: 'chat.completion',
      created: Date.now(),
      model: data.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.content[0].text,
        },
        finish_reason: data.stop_reason,
      }],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }
}
