// ============================================
// 基础类型定义
// ============================================

// 用户类型
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: Date;
  updatedAt: Date;
}

// 用户创建DTO
export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
}

// 用户登录DTO
export interface LoginDto {
  email: string;
  password: string;
}

// 认证响应
export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ============================================
// AI模型类型
// ============================================

// AI模型提供商
export type AIProvider = 
  | 'openai' 
  | 'claude' 
  | 'gemini' 
  | 'qwen' 
  | 'wenxin' 
  | 'glm' 
  | 'kimi'
  | 'custom';

// AI模型
export interface AIModel {
  id: string;
  provider: AIProvider;
  modelName: string;
  displayName: string;
  apiEndpoint?: string;
  apiKeyEncrypted?: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建AI模型DTO
export interface CreateAIModelDto {
  provider: AIProvider;
  modelName: string;
  displayName: string;
  apiEndpoint?: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// 更新AI模型DTO
export interface UpdateAIModelDto {
  displayName?: string;
  apiEndpoint?: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  isActive?: boolean;
}

// ============================================
// 群聊房间类型
// ============================================

// 房间成员类型
export type MemberType = 'human' | 'ai';

// 成员角色
export type MemberRole = 'owner' | 'admin' | 'member';

// 房间状态
export type RoomStatus = 'active' | 'archived' | 'deleted';

// 房间成员
export interface RoomMember {
  id: string;
  roomId: string;
  userId?: string;
  aiModelId?: string;
  memberType: MemberType;
  role: MemberRole;
  joinedAt: Date;
  user?: User;
  aiModel?: AIModel;
}

// 群聊房间
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  maxMembers: number;
  isPrivate: boolean;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
  members?: RoomMember[];
}

// 创建房间DTO
export interface CreateRoomDto {
  name: string;
  description?: string;
  maxMembers?: number;
  isPrivate?: boolean;
}

// 更新房间DTO
export interface UpdateRoomDto {
  name?: string;
  description?: string;
  maxMembers?: number;
  isPrivate?: boolean;
  status?: RoomStatus;
}

// 添加成员DTO
export interface AddRoomMemberDto {
  memberType: MemberType;
  userId?: string;
  aiModelId?: string;
  role?: MemberRole;
}

// ============================================
// 消息类型
// ============================================

// 消息内容类型
export type MessageContentType = 'text' | 'image' | 'file';

// 消息
export interface Message {
  id: string;
  roomId: string;
  senderType: MemberType;
  senderUserId?: string;
  senderAiModelId?: string;
  content: string;
  contentType: MessageContentType;
  replyToId?: string;
  mentions: string[];
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: User | AIModel;
  replyTo?: Message;
}

// 发送消息DTO
export interface SendMessageDto {
  content: string;
  contentType?: MessageContentType;
  replyToId?: string;
  mentions?: string[];
}

// 编辑消息DTO
export interface EditMessageDto {
  content: string;
}

// 消息反应
export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

// ============================================
// 实时通信事件类型
// ============================================

// WebSocket事件命名空间
export const SOCKET_EVENTS = {
  // 连接
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // 房间
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CREATED: 'room:created',
  ROOM_UPDATED: 'room:updated',
  ROOM_DELETED: 'room:deleted',

  // 成员
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
  MEMBER_UPDATED: 'member:updated',

  // 消息
  MESSAGE_NEW: 'message:new',
  MESSAGE_EDITED: 'message:edited',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_REACTION: 'message:reaction',

  // AI流式输出
  MESSAGE_AI_STREAMING: 'message:ai:streaming',
  MESSAGE_AI_COMPLETE: 'message:ai:complete',
  MESSAGE_AI_ERROR: 'message:ai:error',

  // 输入状态
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // 错误
  ERROR: 'error',
} as const;

// WebSocket事件负载
export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomLeavePayload {
  roomId: string;
}

export interface MessageSendPayload {
  roomId: string;
  content: string;
  contentType?: MessageContentType;
  replyToId?: string;
  mentions?: string[];
}

export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

export interface MessageNewEvent {
  type: typeof SOCKET_EVENTS.MESSAGE_NEW;
  data: Message;
}

export interface MemberJoinedEvent {
  type: typeof SOCKET_EVENTS.MEMBER_JOINED;
  data: RoomMember;
}

export interface TypingEvent {
  type: typeof SOCKET_EVENTS.TYPING_START | typeof SOCKET_EVENTS.TYPING_STOP;
  data: {
    roomId: string;
    userId: string;
    username: string;
  };
}

// ============================================
// API响应类型
// ============================================

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// API错误响应
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, unknown>;
}

// 通用API响应
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============================================
// LLM相关类型
// ============================================

// LLM消息角色
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool';

// LLM消息
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
  name?: string;
}

// LLM发送选项
export interface LLMSendOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// LLM响应
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}
