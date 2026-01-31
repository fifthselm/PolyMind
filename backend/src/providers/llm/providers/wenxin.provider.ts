import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { BaseLLMProvider } from '../base/base.provider';
import { 
  LLMMessage, 
  LLMRequestOptions, 
  LLMResponse, 
  StreamingCallbacks,
  ProviderConfig 
} from '../base/types';

@Injectable()
export class WenxinProvider extends BaseLLMProvider {
  readonly providerName = 'wenxin';
  readonly defaultModel = 'ernie-bot-4';
  readonly supportedModels = [
    'ernie-bot-4',
    'ernie-bot-turbo',
    'ernie-bot',
    'ernie-speed-128k',
    'ernie-speed-8k',
    'ernie-lite-8k',
    'ernie-lite-128k',
  ];

  private apiKey: string;
  private secretKey: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ProviderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.secretKey = config.apiEndpoint || ''; // 百度使用apiKey和secretKey组合
  }

  /**
   * 获取access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.get(
        'https://aip.baidubce.com/oauth/2.0/token',
        {
          params: {
            grant_type: 'client_credentials',
            client_id: this.apiKey,
            client_secret: this.secretKey,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      return this.accessToken;
    } catch (error) {
      throw new Error('获取百度access token失败');
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const payload = this.buildPayload(options);
      
      const response = await axios.post(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${options.model}?access_token=${accessToken}`,
        payload
      );

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
      const accessToken = await this.getAccessToken();
      const payload = this.buildPayload({ ...options, stream: true });
      
      const response = await axios.post(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${options.model}?access_token=${accessToken}`,
        payload,
        {
          responseType: 'stream',
        }
      );

      let fullContent = '';
      const stream = response.data;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          try {
            const text = chunk.toString();
            const parsed = JSON.parse(text);
            
            const content = parsed.result;
            if (content) {
              fullContent += content;
              callbacks.onChunk({
                id: 'wenxin-stream',
                object: 'chunk',
                created: Date.now(),
                model: options.model,
                choices: [{
                  index: 0,
                  delta: { content },
                }],
              });
            }

            if (parsed.is_end) {
              callbacks.onComplete(fullContent);
              resolve();
            }
          } catch (e) {
            // 忽略解析错误
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
      await this.getAccessToken();
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
    return {
      messages: options.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.7,
      stream: options.stream ?? false,
    };
  }

  /**
   * 转换响应格式
   */
  private transformResponse(data: any): LLMResponse {
    return {
      id: 'wenxin-' + Date.now(),
      object: 'chat.completion',
      created: Date.now(),
      model: data.id || 'ernie-bot',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.result,
        },
        finish_reason: 'stop',
      }],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }
}
