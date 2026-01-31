# PolyMind - 用户与大模型群聊系统

## 项目概述

PolyMind 是一个创新的群聊平台，允许用户与多个大语言模型（LLM）进行实时群聊对话。用户可以邀请不同的AI模型加入群聊，观察它们之间的互动，并获得多角度的回答。

## 核心功能

### 1. 群聊管理
- 创建/删除群聊房间
- 邀请/移除AI模型成员
- 设置群聊主题和规则
- 群聊历史记录

### 2. 多模型支持
- 支持市面上主流大模型：
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic Claude
  - Google Gemini
  - 阿里云通义千问
  - 百度文心一言
  - 智谱AI GLM
  - Moonshot Kimi
  - 其他通过统一接口接入的模型

### 3. 对话功能
- 实时消息发送与接收
- 流式输出支持
- 消息引用和回复
- @提及功能（@用户 或 @AI模型）
- 消息编辑和删除

### 4. AI模型配置
- 为每个模型设置系统提示词（System Prompt）
- 调整模型参数（温度、最大token等）
- 设置模型角色和性格
- API密钥管理

### 5. 用户系统
- 用户注册/登录
- 个人资料管理
- 偏好设置
- 消息通知

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Frontend)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web App   │  │  Mobile App │  │   Admin Dashboard   │  │
│  │   (React)   │  │  (React Native)│  │      (React)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API网关层 (Gateway)                      │
│              (Nginx / Kong / AWS API Gateway)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端服务层 (Backend)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              NestJS 微服务架构                          │  │
│  ├─────────────┬─────────────┬─────────────┬─────────────┤  │
│  │  API服务    │  消息服务   │  AI服务     │  用户服务   │  │
│  │  (REST)     │  (WebSocket)│  (LLM集成)  │  (Auth)     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (Data Layer)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Redis    │  │   Message Queue     │  │
│  │  (主数据库)  │  │  (缓存/会话) │  │    (RabbitMQ)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    外部服务层 (External)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ OpenAI  │ │ Claude  │ │ Gemini  │ │  文心   │ │ 通义   │ │
│  │  API    │ │  API    │ │  API    │ │ 一言API │ │千问API │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

#### 前端
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand / Redux Toolkit
- **UI组件**: Ant Design / Chakra UI
- **实时通信**: Socket.io-client
- **HTTP客户端**: Axios
- **构建工具**: Vite

#### 后端
- **框架**: NestJS (Node.js)
- **语言**: TypeScript
- **API风格**: RESTful + WebSocket
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI

#### 数据库
- **主数据库**: PostgreSQL 15+
- **缓存**: Redis 7+
- **消息队列**: RabbitMQ / Bull (Redis-based)
- **搜索引擎**: Elasticsearch (可选，用于消息搜索)

#### 基础设施
- **容器化**: Docker + Docker Compose
- **编排**: Kubernetes (生产环境)
- **CI/CD**: GitHub Actions / GitLab CI
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack / Loki

## 数据库设计

### 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI模型配置表
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- 'openai', 'claude', 'gemini', etc.
    model_name VARCHAR(100) NOT NULL, -- 'gpt-4', 'claude-3-opus', etc.
    display_name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT, -- 加密存储
    system_prompt TEXT,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群聊房间表
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    max_members INTEGER DEFAULT 50,
    is_private BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群聊成员表
CREATE TABLE room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    member_type VARCHAR(20) NOT NULL, -- 'human', 'ai'
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, ai_model_id)
);

-- 消息表
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'human', 'ai'
    sender_user_id UUID REFERENCES users(id),
    sender_ai_model_id UUID REFERENCES ai_models(id),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
    reply_to_id UUID REFERENCES messages(id),
    mentions UUID[], -- 被提及的用户/AI ID数组
    metadata JSONB, -- 额外信息（如AI的token使用量）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- 消息读取状态表
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- AI对话上下文表（用于维护AI的记忆）
CREATE TABLE ai_conversation_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    context_messages JSONB, -- 存储最近的对话历史
    summary TEXT, -- 对话摘要（用于长对话）
    token_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, ai_model_id)
);
```

## API设计

### RESTful API

#### 认证相关
```
POST   /api/v1/auth/register          # 用户注册
POST   /api/v1/auth/login             # 用户登录
POST   /api/v1/auth/logout            # 用户登出
POST   /api/v1/auth/refresh           # 刷新Token
GET    /api/v1/auth/me                # 获取当前用户信息
```

#### 用户管理
```
GET    /api/v1/users                  # 获取用户列表
GET    /api/v1/users/:id              # 获取用户详情
PUT    /api/v1/users/:id              # 更新用户信息
PUT    /api/v1/users/:id/avatar       # 更新头像
```

#### AI模型管理
```
GET    /api/v1/models                 # 获取支持的模型列表
POST   /api/v1/models                 # 添加自定义模型
GET    /api/v1/models/:id             # 获取模型详情
PUT    /api/v1/models/:id             # 更新模型配置
DELETE /api/v1/models/:id             # 删除模型
POST   /api/v1/models/:id/test        # 测试模型连接
```

#### 群聊房间
```
GET    /api/v1/rooms                  # 获取房间列表
POST   /api/v1/rooms                  # 创建房间
GET    /api/v1/rooms/:id              # 获取房间详情
PUT    /api/v1/rooms/:id              # 更新房间信息
DELETE /api/v1/rooms/:id              # 删除房间
POST   /api/v1/rooms/:id/join         # 加入房间
POST   /api/v1/rooms/:id/leave        # 离开房间
```

#### 房间成员
```
GET    /api/v1/rooms/:id/members      # 获取成员列表
POST   /api/v1/rooms/:id/members      # 添加成员（邀请AI或用户）
DELETE /api/v1/rooms/:id/members/:memberId  # 移除成员
PUT    /api/v1/rooms/:id/members/:memberId/role  # 修改成员角色
```

#### 消息
```
GET    /api/v1/rooms/:id/messages     # 获取消息历史
POST   /api/v1/rooms/:id/messages     # 发送消息（非实时）
PUT    /api/v1/rooms/:id/messages/:messageId  # 编辑消息
DELETE /api/v1/rooms/:id/messages/:messageId  # 删除消息
POST   /api/v1/rooms/:id/messages/:messageId/react  # 消息反应
```

### WebSocket 事件

#### 客户端发送事件
```javascript
// 加入房间
socket.emit('room:join', { roomId: 'uuid' });

// 离开房间
socket.emit('room:leave', { roomId: 'uuid' });

// 发送消息
socket.emit('message:send', {
  roomId: 'uuid',
  content: 'Hello everyone!',
  replyToId: null,
  mentions: []
});

// 正在输入
socket.emit('typing:start', { roomId: 'uuid' });
socket.emit('typing:stop', { roomId: 'uuid' });

// 消息操作
socket.emit('message:edit', { messageId: 'uuid', content: 'new content' });
socket.emit('message:delete', { messageId: 'uuid' });
```

#### 服务端推送事件
```javascript
// 新消息
socket.on('message:new', (data) => {
  // { id, roomId, sender, content, createdAt, ... }
});

// AI正在生成回复（流式）
socket.on('message:ai:streaming', (data) => {
  // { messageId, roomId, aiModelId, chunk, isComplete }
});

// 成员加入/离开
socket.on('member:joined', (data) => {
  // { roomId, member: { id, type, name, ... } }
});
socket.on('member:left', (data) => {
  // { roomId, memberId }
});

// 用户正在输入
socket.on('typing', (data) => {
  // { roomId, userId, username, isTyping }
});

// 消息被编辑/删除
socket.on('message:updated', (data) => {
  // { messageId, content, updatedAt }
});
socket.on('message:deleted', (data) => {
  // { messageId, deletedAt }
});
```

## AI服务架构

### 统一接口设计

```typescript
// 抽象基类
abstract class BaseLLMProvider {
  abstract readonly provider: string;
  abstract readonly supportedModels: string[];
  
  abstract sendMessage(
    model: string,
    messages: Message[],
    options: SendOptions
  ): Promise<LLMResponse>;
  
  abstract streamMessage(
    model: string,
    messages: Message[],
    options: SendOptions,
    onChunk: (chunk: string) => void
  ): Promise<void>;
  
  abstract validateApiKey(apiKey: string): Promise<boolean>;
}

// 具体实现示例 - OpenAI
class OpenAIProvider extends BaseLLMProvider {
  provider = 'openai';
  supportedModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  
  async sendMessage(...) { /* OpenAI SDK调用 */ }
  async streamMessage(...) { /* OpenAI Stream调用 */ }
}

// 工厂模式
class LLMProviderFactory {
  static create(provider: string): BaseLLMProvider {
    switch(provider) {
      case 'openai': return new OpenAIProvider();
      case 'claude': return new ClaudeProvider();
      case 'gemini': return new GeminiProvider();
      case 'qwen': return new QwenProvider();
      case 'wenxin': return new WenxinProvider();
      case 'glm': return new GLMProvider();
      case 'kimi': return new KimiProvider();
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

### AI消息处理流程

```
用户发送消息
    │
    ▼
保存消息到数据库
    │
    ▼
获取房间内的AI成员
    │
    ▼
并行调用各AI模型
    │
    ├─► OpenAI GPT-4 ──► 流式返回 ──► 保存到DB
    ├─► Claude 3 ──────► 流式返回 ──► 保存到DB
    ├─► Gemini Pro ────► 流式返回 ──► 保存到DB
    └─► ...其他模型
    │
    ▼
通过WebSocket广播给所有在线用户
```

### 上下文管理

```typescript
// 上下文管理器
class ConversationContextManager {
  // 获取AI的对话上下文
  async getContext(roomId: string, aiModelId: string): Promise<Message[]> {
    // 1. 从数据库获取最近的N条消息
    // 2. 格式化为模型特定的消息格式
    // 3. 如果token数超过限制，使用摘要
  }
  
  // 更新上下文
  async updateContext(roomId: string, aiModelId: string, message: Message): Promise<void> {
    // 1. 追加新消息
    // 2. 检查token限制
    // 3. 必要时生成摘要
  }
  
  // 生成摘要（用于长对话）
  async generateSummary(messages: Message[]): Promise<string> {
    // 使用轻量级模型或特定算法生成对话摘要
  }
}
```

## 前端架构

### 页面结构

```
/src
  /pages
    /Login              # 登录页
    /Register           # 注册页
    /Dashboard          # 主控制台
      /RoomList         # 房间列表
      /RoomDetail       # 房间详情（聊天界面）
    /Settings           # 设置页
      /Profile          # 个人资料
      /Models           # AI模型管理
    /Admin              # 管理后台（可选）
  /components
    /Chat
      /MessageList      # 消息列表
      /MessageItem      # 单条消息
      /MessageInput     # 消息输入框
      /MemberList       # 成员列表
    /Model
      /ModelSelector    # 模型选择器
      /ModelConfig      # 模型配置面板
    /common
      /Avatar
      /Button
      /Modal
  /hooks
    /useSocket          # WebSocket连接管理
    /useAuth            # 认证状态
    /useRoom            # 房间操作
  /stores
    /authStore          # 认证状态
    /roomStore          # 房间状态
    /messageStore       # 消息状态
  /services
    /api                # REST API调用
    /websocket          # WebSocket服务
    /llm                # LLM相关服务
  /types                # TypeScript类型定义
  /utils                # 工具函数
```

### 核心组件设计

#### 聊天界面
```typescript
// ChatRoom.tsx
const ChatRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { messages, sendMessage, isLoading } = useRoom(roomId);
  const { members } = useRoomMembers(roomId);
  const socket = useSocket();
  
  return (
    <div className="chat-room">
      <MemberList members={members} />
      <MessageList messages={messages} />
      <MessageInput 
        onSend={sendMessage}
        disabled={isLoading}
        mentions={members}
      />
    </div>
  );
};
```

#### 消息输入（支持@提及）
```typescript
// MessageInput.tsx
const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, 
  mentions 
}) => {
  const [content, setContent] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentionList(true);
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(content);
      setContent('');
    }
  };
  
  return (
    <div className="message-input">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，使用@提及..."
      />
      {showMentionList && (
        <MentionList 
          items={mentions}
          onSelect={(item) => {
            setContent(prev => prev + item.name + ' ');
            setShowMentionList(false);
          }}
        />
      )}
      <button onClick={() => onSend(content)}>发送</button>
    </div>
  );
};
```

## 项目目录结构

```
polymind/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── frontend/                    # 前端应用
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── styles/
│
├── backend/                     # 后端服务
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── rooms/
│   │   │   ├── messages/
│   │   │   ├── ai-models/
│   │   │   └── websocket/
│   │   ├── providers/
│   │   │   └── llm/
│   │   │       ├── base.provider.ts
│   │   │       ├── openai.provider.ts
│   │   │       ├── claude.provider.ts
│   │   │       ├── gemini.provider.ts
│   │   │       ├── qwen.provider.ts
│   │   │       ├── wenxin.provider.ts
│   │   │       ├── glm.provider.ts
│   │   │       ├── kimi.provider.ts
│   │   │       └── index.ts
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── utils/
│   └── test/
│
├── shared/                      # 共享类型和工具
│   ├── types/
│   └── constants/
│
├── database/                    # 数据库相关
│   ├── migrations/
│   ├── seeds/
│   └── docker/
│
├── docs/                        # 文档
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
└── scripts/                     # 脚本工具
    ├── setup.sh
    └── deploy.sh
```

## 开发计划

### 第一阶段：基础架构（2-3周）
- [ ] 项目初始化（前后端脚手架）
- [ ] 数据库设计和迁移
- [ ] 基础用户系统（注册/登录/认证）
- [ ] 基础API框架搭建
- [ ] Docker开发环境配置

### 第二阶段：核心功能（3-4周）
- [ ] 群聊房间管理（CRUD）
- [ ] WebSocket实时通信
- [ ] 消息系统（发送/接收/历史）
- [ ] 基础聊天界面
- [ ] AI模型配置管理

### 第三阶段：AI集成（2-3周）
- [ ] 统一LLM接口设计
- [ ] OpenAI集成
- [ ] Claude集成
- [ ] 国内模型集成（通义、文心、GLM、Kimi）
- [ ] 流式输出支持
- [ ] AI上下文管理

### 第四阶段：增强功能（2周）
- [ ] @提及功能
- [ ] 消息引用和回复
- [ ] 文件/图片上传
- [ ] 消息搜索
- [ ] 通知系统

### 第五阶段：优化和部署（2周）
- [ ] 性能优化
- [ ] 安全加固
- [ ] 监控和日志
- [ ] 生产环境部署
- [ ] 文档完善

## 关键技术挑战

### 1. 多模型并发调用
- 使用Promise.all并行调用多个AI
- 实现超时和重试机制
- 错误隔离（单个AI失败不影响其他）

### 2. 流式输出处理
- WebSocket流式传输
- 前端逐字显示效果
- 支持中断生成

### 3. 上下文管理
- Token限制处理
- 对话摘要生成
- 多轮对话记忆

### 4. 消息顺序保证
- 时间戳排序
- 消息ID序列
- 网络延迟处理

### 5. 安全性
- API密钥加密存储
- 用户输入过滤
- 速率限制
- 敏感词过滤

## 部署方案

### 开发环境
```bash
# 使用Docker Compose一键启动
docker-compose -f docker-compose.dev.yml up -d

# 包含：
# - PostgreSQL
# - Redis
# - RabbitMQ
# - 后端服务 (热重载)
# - 前端开发服务器
```

### 生产环境
```bash
# Kubernetes部署
kubectl apply -f k8s/

# 包含：
# - 负载均衡器 (Ingress)
# - 自动扩缩容 (HPA)
# - 持久化存储 (PV/PVC)
# - 配置管理 (ConfigMap/Secret)
```

## 成本估算

### 开发阶段
- 服务器：2-4核 8GB内存（约￥200-400/月）
- 数据库：PostgreSQL + Redis（约￥100-200/月）
- AI API调用：按使用量计费（开发阶段约￥500-1000/月）

### 生产阶段（1000活跃用户）
- 服务器集群：￥2000-5000/月
- 数据库：￥1000-3000/月
- AI API调用：￥5000-20000/月（取决于使用量）
- CDN和存储：￥500-1000/月

## 后续扩展

1. **语音/视频聊天**：集成WebRTC
2. **插件系统**：允许AI使用工具（搜索、计算等）
3. **多语言支持**：国际化和本地化
4. **移动端App**：React Native或Flutter
5. **AI角色市场**：用户可分享和下载AI角色配置
6. **数据分析**：聊天记录分析和可视化

---

*文档版本: v1.0*
*最后更新: 2026-01-31*
