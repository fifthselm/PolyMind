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
export class GeminiProvider extends BaseLLMProvider {
  readonly providerName = 'gemini';
  readonly defaultModel = 'gemini-1.5-flash';
  readonly supportedModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: `https://generativelanguage.googleapis.com/v1beta`,
      timeout: config.timeout || 60000,
    });
  }

  /**
   * 发送消息
   */
  async sendMessage(options: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const url = `/models/${options.model}:generateContent?key=${this.apiKey}`;
      const payload = this.buildPayload(options);
      const response = await this.client.post(url, payload);
      return this.transformResponse(response.data, options.model);
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
      const url = `/models/${options.model}:streamGenerateContent?key=${this.apiKey}`;
      const payload = this.buildPayload(options);
      
      const response = await this.client.post(url, payload, {
        responseType: 'stream',
      });

      let fullContent = '';
      const stream = response.data;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          
          try {
            const lines = text.split('\n').filter(Boolean);
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                const parsed = JSON.parse(data);
                
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  fullContent += content;
                  callbacks.onChunk({
                    id: 'gemini-stream',
                    object: 'chunk',
                    created: Date.now(),
                    model: options.model,
                    choices: [{
                      index: 0,
                      delta: { content },
                    }],
                  });
                }
              }
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
      await this.client.get(`/models?key=${this.apiKey}`);
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
      const response = await this.client.get(`/models?key=${this.apiKey}`);
      return response.data.models
        .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
    } catch {
      return this.supportedModels;
    }
  }

  /**
   * 构建请求载荷
   */
  private buildPayload(options: LLMRequestOptions): any {
    const contents = options.messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{
        text: msg.content,
      }],
    }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    if (options.systemPrompt) {
      // Gemini使用单独的system_instruction
      payload.system_instruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    return payload;
  }

  /**
   * 转换响应格式
   */
  private transformResponse(data: any, model: string): LLMResponse {
    const candidate = data.candidates?.[0];
    return {
      id: 'gemini-' + Date.now(),
      object: 'chat.completion',
      created: Date.now(),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: candidate?.content?.parts?.[0]?.text || '',
        },
        finish_reason: 'stop',
      }],
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }
}
