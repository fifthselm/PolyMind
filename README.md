# PolyMind

用户与大模型群聊平台 - 支持多AI模型实时对话

## 功能特性

- 🤖 **多AI模型支持** - 集成OpenAI、Claude、Gemini、通义千问、文心一言、GLM、Kimi、DeepSeek等主流大模型
- 💬 **群聊功能** - 创建房间、邀请AI模型、实时消息收发
- 🔐 **用户系统** - 注册登录、JWT认证、个人设置
- ⚡ **实时通信** - WebSocket双向通信、流式输出
- 🎨 **现代化UI** - React + Ant Design

## 技术栈

### 前端
- React 18 + TypeScript
- Zustand (状态管理)
- Ant Design 5 (UI组件)
- Socket.io-client (实时通信)
- Vite (构建工具)

### 后端
- NestJS 10 + TypeScript
- Prisma ORM
- PostgreSQL
- Socket.io (WebSocket)
- JWT认证

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd frontend
npm install
```

### 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

主要配置项：
- `DATABASE_URL` - PostgreSQL连接字符串
- `REDIS_URL` - Redis连接字符串
- `JWT_SECRET` - JWT密钥
- `CORS_ORIGIN` - 前端地址

### 数据库初始化

```bash
cd backend

# 生成Prisma客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# (可选) 初始化测试数据
npm run prisma:seed
```

### 启动服务

```bash
# 启动后端 (开发模式)
cd backend
npm run start:dev

# 启动前端 (开发模式)
cd frontend
npm run dev
```

- 后端服务: http://localhost:3000
- 前端服务: http://localhost:5173
- API文档: http://localhost:3000/api/docs

## Docker部署

```bash
# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

服务说明：
- `postgres:15` - PostgreSQL数据库
- `redis:7` - Redis缓存
- `backend` - 后端API服务
- `frontend` - 前端开发服务器
- `pgadmin` - 数据库管理界面 (可选)

## 项目结构

```
polymind/
├── backend/                 # NestJS后端
│   ├── src/
│   │   ├── modules/        # 功能模块
│   │   │   ├── auth/       # 认证模块
│   │   │   ├── users/      # 用户模块
│   │   │   ├── rooms/      # 房间模块
│   │   │   ├── messages/   # 消息模块
│   │   │   ├── ai-models/  # AI模型模块
│   │   │   └── websocket/  # WebSocket模块
│   │   ├── providers/      # 服务提供商
│   │   └── dto/            # 数据传输对象
│   ├── prisma/             # 数据库Schema
│   └── test/               # 测试文件
│
├── frontend/               # React前端
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── stores/        # Zustand状态
│   │   ├── services/      # API服务
│   │   ├── hooks/         # 自定义Hook
│   │   └── styles/        # 样式文件
│   └── public/            # 静态资源
│
├── shared/                 # 共享类型定义
│   ├── types/             # TypeScript类型
│   └── constants/         # 常量定义
│
├── database/              # 数据库相关
│   ├── migrations/        # 数据库迁移
│   └── seeds/             # 种子数据
│
├── docs/                  # 文档
│   ├── api/               # API文档
│   └── architecture/      # 架构文档
│
└── scripts/               # 脚本工具
```

## API文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户

### 房间接口
- `GET /api/rooms` - 获取房间列表
- `POST /api/rooms` - 创建房间
- `GET /api/rooms/:id` - 获取房间详情
- `PUT /api/rooms/:id` - 更新房间
- `POST /api/rooms/:id/members` - 添加成员
- `POST /api/rooms/:id/leave` - 离开房间

### 消息接口
- `GET /api/rooms/:id/messages` - 获取消息历史
- `POST /api/rooms/:id/messages` - 发送消息
- `PUT /api/rooms/:id/messages/:messageId` - 编辑消息
- `DELETE /api/rooms/:id/messages/:messageId` - 删除消息

### AI模型接口
- `GET /api/models` - 获取模型列表
- `POST /api/models` - 创建模型配置
- `PUT /api/models/:id` - 更新模型配置
- `DELETE /api/models/:id` - 删除模型配置
- `POST /api/models/:id/test` - 测试模型连接

## WebSocket事件

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

## 开发计划

- [x] 项目初始化
- [x] 基础架构
- [x] 用户认证
- [x] 群聊房间管理
- [x] 消息系统
- [x] AI模型配置
- [ ] LLM统一接口
- [ ] 多模型集成
- [ ] 流式输出
- [ ] @提及功能
- [ ] 生产部署

## 贡献指南

1. Fork项目
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/fifthselm/PolyMind
- Issues: https://github.com/fifthselm/PolyMind/issues
