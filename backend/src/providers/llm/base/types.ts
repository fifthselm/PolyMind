/**
 * LLM消息类型定义
 */

// 消息角色
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool';

// 消息内容类型
export type ContentType = 'text' | 'image_url' | 'image_url';

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageUrlContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type MessageContent = TextContent | ImageUrlContent;

// LLM消息
export interface LLMMessage {
  role: LLMMessageRole;
  content: string | MessageContent[];
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

// 工具/函数调用
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

// 使用统计
export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// 完成原因
export type FinishReason = 
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | 'error'
  | 'unknown';

// 流式块
export interface LLMStreamChunk {
  id: string;
  object: 'chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: any[];
    };
    finish_reason?: FinishReason;
  }>;
}

// 请求选项
export interface LLMRequestOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: string; function: { name: string } };
  systemPrompt?: string;
  signal?: AbortSignal;
}

// 响应
export interface LLMResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      tool_calls?: any[];
    };
    finish_reason: FinishReason;
  }>;
  usage: LLMUsage;
}

// 流式响应处理器
export interface StreamingCallbacks {
  onChunk: (chunk: LLMStreamChunk) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}

// Provider配置
export interface ProviderConfig {
  apiKey: string;
  apiEndpoint?: string;
  organizationId?: string;
  timeout?: number;
  maxRetries?: number;
}
