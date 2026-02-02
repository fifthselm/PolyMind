# PolyMind

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)]()
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)]()

> 用户与大模型群聊平台 - 支持多AI模型实时对话的创新聊天系统

## ✨ 功能特性

- 🤖 **多AI模型支持** - 集成 OpenAI、Claude、Gemini、通义千问、文心一言、GLM、Kimi、DeepSeek 等主流大模型
- 💬 **群聊功能** - 创建房间、邀请AI模型、实时消息收发、消息编辑与删除
- 🔐 **用户系统** - 注册登录、JWT认证、个人设置、密码重置
- ⚡ **实时通信** - WebSocket 双向通信、流式输出、打字状态提示
- 🏷️ **消息增强** - @提及功能、消息引用回复、消息反应
- 🎨 **现代化UI** - React + Ant Design，响应式设计

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (Frontend)                   │
│              React 18 + TypeScript + Vite               │
│                    Zustand + Ant Design                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     API 网关层 (Gateway)                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     后端服务层 (Backend)                 │
│            NestJS + TypeScript + WebSocket               │
│          JWT认证 + Prisma ORM + Swagger文档              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      数据层 (Data)                       │
│              PostgreSQL 15+  +  Redis 7+                 │
└─────────────────────────────────────────────────────────┘
```

### 技术栈详情

#### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **状态管理**: Zustand 4
- **UI组件**: Ant Design 5
- **HTTP客户端**: Axios
- **实时通信**: Socket.io-client

#### 后端
- **框架**: NestJS 10
- **数据库**: PostgreSQL 15+ (主数据库)
- **缓存**: Redis 7+
- **ORM**: Prisma 7
- **认证**: JWT + Passport
- **API文档**: Swagger/OpenAPI

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (可选，用于容器化部署)

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/fifthselm/PolyMind.git
cd PolyMind
```

2. **安装依赖**

```bash
# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

3. **配置环境变量**

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和API密钥
```

必需配置项：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `JWT_SECRET` - JWT 密钥（建议使用256位随机密钥）
- `CORS_ORIGIN` - 前端地址（默认 http://localhost:5173）

可选配置（用于AI模型）：
- `OPENAI_API_KEY` - OpenAI API密钥
- `ANTHROPIC_API_KEY` - Claude API密钥
- `GEMINI_API_KEY` - Google Gemini API密钥
- `QWEN_API_KEY` - 阿里云通义千问API密钥
- `WENXIN_API_KEY` / `WENXIN_SECRET` - 百度文心一言
- `GLM_API_KEY` - 智谱GLM API密钥
- `KIMI_API_KEY` - Moonshot Kimi API密钥
- `DEEPSEEK_API_KEY` - DeepSeek API密钥

4. **初始化数据库**

```bash
cd backend

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# (可选) 初始化测试数据
npx prisma db seed
```

5. **启动服务**

```bash
# 终端1：启动后端
cd backend
npm run start:dev

# 终端2：启动前端
cd frontend
npm run dev
```

访问地址：
- 前端: http://localhost:5173
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/api/docs

## 🐳 Docker 部署

### 开发环境

```bash
# 一键启动所有服务
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f
```

### 生产环境

```bash
# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d
```

详细的生产部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📁 项目结构

```
polymind/
├── backend/                 # NestJS后端
│   ├── src/
│   │   ├── modules/        # 功能模块
│   │   │   ├── auth/       # 认证模块（JWT、登录注册）
│   │   │   ├── users/      # 用户模块
│   │   │   ├── rooms/      # 房间模块
│   │   │   ├── messages/   # 消息模块
│   │   │   ├── ai-models/  # AI模型管理
│   │   │   └── websocket/  # WebSocket实时通信
│   │   ├── providers/      # 服务提供商
│   │   │   └── llm/        # LLM统一接口
│   │   ├── prisma/         # 数据库Schema
│   │   └── test/           # 测试文件
│   └── package.json
│
├── frontend/               # React前端
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── stores/        # Zustand状态管理
│   │   ├── services/      # API服务
│   │   └── hooks/         # 自定义Hooks
│   └── package.json
│
├── docker-compose.yml      # Docker编排配置
└── README.md
```

## 📚 API 文档

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/auth/forgot-password` | 忘记密码 |
| POST | `/api/auth/reset-password` | 重置密码 |

### 房间接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/rooms` | 获取房间列表 |
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:id` | 获取房间详情 |
| PUT | `/api/rooms/:id` | 更新房间 |
| POST | `/api/rooms/:id/members` | 添加成员 |
| DELETE | `/api/rooms/:id/members/:id` | 移除成员 |

### 消息接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/rooms/:id/messages` | 获取消息历史 |
| POST | `/api/rooms/:id/messages` | 发送消息 |
| PUT | `/api/rooms/:id/messages/:id` | 编辑消息 |
| DELETE | `/api/rooms/:id/messages/:id` | 删除消息 |

### AI模型接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/models` | 获取模型列表 |
| POST | `/api/models` | 创建模型配置 |
| PUT | `/api/models/:id` | 更新模型配置 |
| DELETE | `/api/models/:id` | 删除模型配置 |
| POST | `/api/models/:id/test` | 测试模型连接 |

## 🔌 WebSocket 事件

### 客户端发送

- `room:join` - 加入房间
- `room:leave` - 离开房间
- `message:send` - 发送消息
- `typing:start` - 开始输入
- `typing:stop` - 停止输入

### 服务端推送

- `message:new` - 新消息
- `member:joined` - 成员加入
- `member:left` - 成员离开
- `typing` - 输入状态变化

## 🔧 开发指南

### 代码规范

项目遵循严格的代码规范，详见 [AGENTS.md](./AGENTS.md)

- **缩进**: 2空格
- **命名**: PascalCase (组件), camelCase (变量函数), UPPER_SNAKE_CASE (常量)
- **类型**: 严格TypeScript，禁止`any`类型
- **导入**: 第三方库 → 内部模块

### 常用命令

```bash
# 后端
cd backend
npm run start:dev      # 开发模式
npm run build          # 构建
npm run test           # 运行测试
npm run test:cov       # 测试覆盖率
npm run lint           # 代码检查
npm run prisma:studio  # 数据库管理界面

# 前端
cd frontend
npm run dev            # 开发模式
npm run build          # 构建
npm run lint           # 代码检查
```

## 📊 数据库模型

核心数据表：

- **users** - 用户表
- **ai_models** - AI模型配置表
- **chat_rooms** - 群聊房间表
- **room_members** - 房间成员表
- **messages** - 消息表
- **message_reads** - 消息已读状态

详细的数据库设计请参考 [PROJECT_PLAN.md](./PROJECT_PLAN.md)

## 🗺️ 项目规划

### 已实现 ✅
- [x] 用户认证系统（注册/登录/JWT）
- [x] 群聊房间管理
- [x] 实时消息系统
- [x] AI模型配置管理
- [x] WebSocket实时通信
- [x] 密码重置功能

### 进行中 🚧
- [ ] LLM统一接口完善
- [ ] 流式输出优化
- [ ] @提及功能增强

### 计划中 📋
- [ ] 移动端适配
- [ ] 文件/图片上传
- [ ] 消息搜索功能
- [ ] 通知系统

详细的开发计划请参考 [PROJECT_PLAN.md](./PROJECT_PLAN.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式（不影响运行）
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

## 📄 许可证

[MIT License](./LICENSE)

## 📞 联系方式

- 项目主页: https://github.com/fifthselm/PolyMind
- 问题反馈: https://github.com/fifthselm/PolyMind/issues

---

<p align="center">
  用 ❤️ 和 🤖 构建
</p>
