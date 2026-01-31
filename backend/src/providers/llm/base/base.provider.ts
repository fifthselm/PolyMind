import { LLMMessage, LLMRequestOptions, LLMResponse, LLMStreamChunk, StreamingCallbacks } from './types';

/**
 * LLM Provider抽象基类
 * 所有AI模型提供商需要实现此接口
 */
export abstract class BaseLLMProvider {
  // 提供商标识
  abstract readonly providerName: string;

  // 支持的模型列表
  abstract readonly supportedModels: string[];

  // 默认模型
  abstract readonly defaultModel: string;

  /**
   * 发送消息并获取响应
   */
  abstract sendMessage(options: LLMRequestOptions): Promise<LLMResponse>;

  /**
   * 发送消息并流式输出
   */
  abstract streamMessage(
    options: LLMRequestOptions,
    callbacks: StreamingCallbacks
  ): Promise<void>;

  /**
   * 验证API Key是否有效
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * 获取模型列表
   */
  abstract getModelList(): Promise<string[]>;

  /**
   * 估算token数量（用于上下文管理）
   */
  estimateTokenCount(messages: LLMMessage[]): number {
    // 简单估算：平均每个token约4个字符
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : msg.content.map(c => 'text' in c ? c.text : '').join('');
      return sum + content.length;
    }, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * 转换消息格式（如果需要）
   */
  protected transformMessages(messages: LLMMessage[]): any[] {
    return messages;
  }

  /**
   * 错误处理
   */
  protected handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`LLM调用失败: ${JSON.stringify(error)}`);
  }

  /**
   * 等待指定毫秒
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
