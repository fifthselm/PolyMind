// ============================================
// 常量定义
// ============================================

// 用户状态
export const USER_STATUS = {
  ACTIVE: 'active' as const,
  INACTIVE: 'inactive' as const,
  BANNED: 'banned' as const,
};

// 房间状态
export const ROOM_STATUS = {
  ACTIVE: 'active' as const,
  ARCHIVED: 'archived' as const,
  DELETED: 'deleted' as const,
};

// 成员角色
export const MEMBER_ROLE = {
  OWNER: 'owner' as const,
  ADMIN: 'admin' as const,
  MEMBER: 'member' as const,
};

// 成员类型
export const MEMBER_TYPE = {
  HUMAN: 'human' as const,
  AI: 'ai' as const,
};

// 消息内容类型
export const MESSAGE_CONTENT_TYPE = {
  TEXT: 'text' as const,
  IMAGE: 'image' as const,
  FILE: 'file' as const,
};

// AI提供商
export const AI_PROVIDER = {
  OPENAI: 'openai' as const,
  CLAUDE: 'claude' as const,
  GEMINI: 'gemini' as const,
  QWEN: 'qwen' as const,
  WENXIN: 'wenxin' as const,
  GLM: 'glm' as const,
  KIMI: 'kimi' as const,
  CUSTOM: 'custom' as const,
};

// 默认配置
export const DEFAULTS = {
  // 用户
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 8,

  // 房间
  DEFAULT_MAX_MEMBERS: 50,
  MAX_ROOMS_PER_USER: 10,

  // 消息
  MESSAGE_MAX_LENGTH: 10000,
  MESSAGES_PER_PAGE: 50,
  MAX_MESSAGES_HISTORY: 1000,

  // AI
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2048,
  MAX_CONTEXT_MESSAGES: 20,

  // 分页
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// JWT配置
export const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN: '30d',
  ALGORITHM: 'HS256',
};

// Redis键前缀
export const REDIS_KEYS = {
  SESSION: 'session:',
  RATE_LIMIT: 'rate:',
  ONLINE_USERS: 'online:users',
  ROOM_USERS: 'room:users:',
  TYPING: 'typing:',
};

// WebSocket配置
export const WEBSOCKET_CONFIG = {
  PING_INTERVAL: 25000,
  PING_TIMEOUT: 20000,
  MAX_BUFFER_SIZE: 1e6, // 1MB
};
