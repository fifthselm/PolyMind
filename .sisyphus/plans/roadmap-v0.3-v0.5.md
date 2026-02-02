# PolyMind 第二阶段功能规划 (v0.3.0 - v0.5.0)

## 规划概览

基于对 OpenAOE、LobeChat、LibreChat 等优秀开源项目的深入研究，结合 PolyMind 当前状态，制定以下阶段性开发规划。

**当前版本**: v0.2.0  
**目标版本**: v0.5.0  
**规划周期**: 3个阶段，每阶段 2-3 周

---

## 第一阶段：核心功能完善 (v0.3.0) - 优先级：🔴 极高

### 目标
完成第一阶段（基础架构）未完成的功能，奠定产品核心体验。

### 功能列表

#### 1.1 流式输出优化 (Streaming)
**参考**: LibreChat Resumable Streams、LobeChat
```
当前问题：
- AI回复是整段返回，用户体验不佳
- 无法中断生成过程

实现目标：
✓ 逐字/逐词流式显示（类似 ChatGPT）
✓ 支持中断生成（Stop generation）
✓ 可恢复的流（断网后恢复）
✓ 流式状态显示（AI正在输入动画）

技术方案：
- 后端：WebSocket 流式推送 + SSE 双支持
- 前端：StreamingAnimation 组件优化
- 支持多种流式格式：OpenAI stream、Claude stream、通用 stream
```

#### 1.2 LLM统一接口完善
**参考**: OpenAOE、LiteLLM
```
当前问题：
- 各模型 Provider 实现不一致
- 缺乏统一的错误处理和重试机制
- 模型参数配置不灵活

实现目标：
✓ 统一的消息格式（OpenAI兼容格式）
✓ 统一的错误处理和降级策略
✓ 自动重试机制（指数退避）
✓ 超时控制和取消支持
✓ 模型性能监控（响应时间、Token使用量）
✓ 支持模型路由（根据负载自动选择）

技术方案：
- BaseProvider 抽象类完善
- LLMFactory 工厂模式
- 中间件：RetryMiddleware、TimeoutMiddleware、LoggingMiddleware
```

#### 1.3 @提及功能增强
**当前问题**：
- 仅支持文本 @，功能有限
- 无法触发AI响应
- 不支持@多个AI

**实现目标**：
✓ @AI模型时自动触发响应
✓ 支持@多个AI（并行/串行模式）
✓ @用户时发送通知
✓ 智能提示（输入@显示可选项）
✓ 支持AI之间的互相@（AI协作模式）

#### 1.4 Markdown渲染增强
**参考**: LobeChat、LibreChat
```
实现目标：
✓ 完整的Markdown支持（GFM）
✓ 代码块语法高亮（支持100+语言）
✓ 代码块一键复制
✓ LaTeX数学公式渲染（KaTeX/MathJax）
✓ Mermaid图表渲染（流程图、时序图）
✓ 表格渲染优化
✓ 链接卡片预览（Open Graph）
```

### 技术债务
- [ ] WebSocket连接稳定性优化
- [ ] 数据库查询优化（N+1问题）
- [ ] 前端状态管理重构（Zustand最佳实践）
- [ ] 错误边界和降级策略完善

---

## 第二阶段：交互体验升级 (v0.4.0) - 优先级：🟡 高

### 目标
引入多模态能力、文件处理、AI Agent协作等高级功能。

### 功能列表

#### 2.1 文件上传与处理 (File Upload)
**参考**: LobeChat File Upload / Knowledge Base、LibreChat RAG
```
实现目标：
✓ 支持多种文件格式上传
  - 文档：PDF、Word、TXT、Markdown
  - 图片：PNG、JPG、GIF、WebP
  - 代码文件：JS、TS、Python、Java等
  
✓ 文件预览功能
  - 图片缩略图和放大查看
  - PDF预览
  - 代码文件语法高亮
  
✓ 文件存储策略
  - 本地存储（开发环境）
  - 云存储集成（AWS S3、阿里云OSS）
  - 文件大小限制和类型验证
  
✓ 文件与消息关联
  - 消息中包含文件引用
  - 文件下载功能
  - 文件访问权限控制

技术方案：
- 后端：Multer + Sharp（图片处理）
- 前端：react-dropzone + 自定义预览组件
- 存储：抽象存储接口，支持多种后端
```

#### 2.2 RAG知识库 (Retrieval-Augmented Generation)
**参考**: LobeChat Knowledge Base
```
实现目标：
✓ 房间级知识库
  - 上传文档到房间
  - 文档自动分块和向量化
  - 基于文档内容的问答
  
✓ 个人知识库
  - 用户个人文档管理
  - 跨房间共享知识
  
✓ 向量数据库集成
  - 支持 Pinecone、Weaviate、Milvus
  - 本地：ChromaDB、FAISS
  
✓ 文档解析增强
  - OCR识别（扫描PDF）
  - 表格提取
  - 图片中的文字识别

技术方案：
- 向量化：OpenAI Embeddings / HuggingFace Embeddings
- 检索：相似度搜索 + 重排序
- 上下文注入：动态Prompt构建
```

#### 2.3 AI Agent团队 (Agent Team)
**参考**: LobeChat Agent Team、AutoGen
```
概念：多个AI角色协作完成复杂任务

实现目标：
✓ 预定义角色模板
  - 产品经理、开发工程师、测试工程师、设计师
  - 辩论者（正方/反方）
  - 翻译官、总结者、代码审查员
  
✓ 角色协作模式
  - 并行讨论：所有AI同时响应
  - 串行工作流：AI1 → AI2 → AI3
  - 条件分支：根据内容路由到不同AI
  
✓ Agent市场
  - 用户可创建和分享Agent配置
  - 导入/导出Agent角色卡
  - 评分和评论系统
  
✓ 动态角色分配
  - 根据话题自动选择合适的AI
  - AI之间的互相调用

技术方案：
- 工作流引擎：状态机或DAG
- Prompt模板系统
- 上下文管理：共享上下文 vs 私有上下文
```

#### 2.4 Web搜索集成
**参考**: LibreChat Web Search、LobeChat
```
实现目标：
✓ 实时搜索增强
  - 自动判断是否需要搜索
  - 搜索结果注入上下文
  - 引用来源标注
  
✓ 搜索引擎支持
  - Tavily API（专为AI优化）
  - Google Custom Search
  - Bing Search API
  - 百度/必应搜索
  
✓ 搜索结果处理
  - 网页内容抓取和解析
  - 去重和相关性排序
  - 结果缓存

技术方案：
- 搜索意图识别（LLM判断）
- 网页爬虫（Playwright / Puppeteer）
- 内容提取：Readability算法
```

#### 2.5 语音交互 (TTS & STT)
**参考**: LobeChat Speech Synthesis
```
实现目标：
✓ 文本转语音 (TTS)
  - AI回复语音播放
  - 多种声音选择
  - 语速/音调调节
  
✓ 语音转文本 (STT)
  - 语音输入消息
  - 实时语音识别
  - 支持中文/英文/多语言
  
✓ 语音服务商
  - OpenAI TTS (Whisper)
  - Azure Speech
  - 阿里云语音合成
  - 讯飞语音

技术方案：
- 前端：Web Speech API（浏览器原生）
- 后端：服务商API封装
- 音频流式传输
```

---

## 第三阶段：高级特性与生态 (v0.5.0) - 优先级：🟢 中

### 目标
构建完整的AI应用生态，提升产品的专业性和可扩展性。

### 功能列表

#### 3.1 插件系统 (Plugin System)
**参考**: LobeChat Plugin System
```
实现目标：
✓ 插件架构
  - 插件市场（安装/卸载/更新）
  - 插件开发SDK
  - 沙箱安全执行环境
  
✓ 插件类型
  - 工具插件：计算器、天气查询、股票查询
  - 数据源插件：数据库查询、API集成
  - 处理插件：文本处理、翻译、摘要
  - UI插件：自定义消息渲染
  
✓ 插件商店
  - 官方插件库
  - 第三方插件提交
  - 插件评分系统

技术方案：
- 插件格式：npm包或zip文件
- 运行时：QuickJS / vm2（沙箱）
- API设计：类似ChatGPT Plugin
```

#### 3.2 Artifacts生成 (Generative UI)
**参考**: LibreChat Artifacts、Claude Artifacts
```
概念：AI生成的可交互内容块

实现目标：
✓ 代码生成与预览
  - React组件实时预览
  - HTML/CSS/JS预览
  - Python代码执行（Jupyter风格）
  
✓ 图表生成
  - Mermaid图表
  - ECharts数据可视化
  - 流程图、思维导图
  
✓ 文档生成
  - Markdown文档
  - PPT大纲
  - PDF导出

技术方案：
- 代码沙箱：Sandpack / react-runner
- 图表渲染：Mermaid.js、ECharts
- 版本控制：Artifacts版本历史
```

#### 3.3 代码解释器 (Code Interpreter)
**参考**: LibreChat Code Interpreter API
```
实现目标：
✓ 多语言代码执行
  - Python（数据科学）
  - JavaScript/TypeScript
  - Java、Go、Rust等
  
✓ 安全沙箱执行
  - Docker容器隔离
  - 资源限制（CPU/内存/时间）
  - 无网络访问（白名单）
  
✓ 数据处理能力
  - 文件读写
  - 图表生成
  - 数据分析（Pandas、NumPy）
  
✓ 结果展示
  - 文本输出
  - 图片/图表显示
  - 文件下载

技术方案：
- 执行环境：Docker + Firejail
- 文件系统：临时卷映射
- 通信：WebSocket实时输出
```

#### 3.4 分支对话 (Branching Conversations)
**参考**: LobeChat Branching
```
概念：从任意消息创建新的对话分支

实现目标：
✓ 分支创建
  - 从任意消息分支
  - 多分支并行探索
  - 分支合并（选择性合并）
  
✓ 分支管理
  - 分支可视化（树状图）
  - 分支切换
  - 分支删除/归档
  
✓ 对比功能
  - 不同分支AI回复对比
  - AB测试模式

技术方案：
- 数据模型：树形结构（parent_id指针）
- UI：Git graph风格可视化
- 版本控制概念
```

#### 3.5 记忆系统 (Memory)
**参考**: LibreChat Memory
```
实现目标：
✓ 对话记忆
  - 长期记忆（跨会话）
  - 短期记忆（当前会话）
  - 记忆重要性评估
  
✓ 用户画像
  - 用户偏好学习
  - 常用表达方式
  - 个人知识库引用
  
✓ 记忆管理
  - 记忆查看和编辑
  - 记忆删除
  - 记忆导入/导出

技术方案：
- 记忆提取：LLM总结
- 存储：向量数据库 + 结构化存储
- 检索：语义搜索 + 时间衰减
```

#### 3.6 移动端适配与PWA
**参考**: LobeChat PWA
```
实现目标：
✓ 响应式设计优化
  - 移动端聊天界面
  - 触摸手势支持
  - 底部导航栏
  
✓ PWA支持
  - 离线访问（Service Worker）
  - 添加到主屏
  - 推送通知
  
✓ 移动原生功能
  - 相机拍照上传
  - 位置分享
  - 文件分享

技术方案：
- UI框架：Ant Design Mobile / Vant
- PWA：Workbox
- 响应式：CSS Grid + Flexbox
```

---

## 参考项目核心亮点对比

| 功能 | OpenAOE | LobeChat | LibreChat | PolyMind目标 |
|------|---------|----------|-----------|-------------|
| **多模型并行** | ✅ 优秀 | ✅ 支持 | ✅ 支持 | ✅ 已实现 |
| **流式输出** | ✅ 支持 | ✅ 优秀 | ✅ 可恢复 | 🚧 优化中 |
| **插件系统** | ❌ 无 | ✅ 完善 | ⚠️ 基础 | 📋 v0.5.0 |
| **文件上传** | ❌ 无 | ✅ RAG支持 | ✅ OCR | 📋 v0.4.0 |
| **Agent团队** | ❌ 无 | ✅ 协作 | ✅ Assistants | 📋 v0.4.0 |
| **代码解释器** | ❌ 无 | ❌ 无 | ✅ 多语言 | 📋 v0.5.0 |
| **Artifacts** | ❌ 无 | ❌ 无 | ✅ 生成UI | 📋 v0.5.0 |
| **分支对话** | ❌ 无 | ✅ 支持 | ✅ 支持 | 📋 v0.5.0 |
| **语音交互** | ❌ 无 | ✅ TTS/STT | ⚠️ 基础 | 📋 v0.4.0 |
| **移动端** | ❌ 无 | ✅ PWA | ⚠️ 响应式 | 📋 v0.5.0 |

---

## 技术架构演进

### 当前架构（v0.2.0）
```
前端: React + Zustand + Ant Design
后端: NestJS + Prisma + PostgreSQL
实时: WebSocket (Socket.io)
AI: 多Provider直接集成
```

### v0.3.0 架构增强
```
+ 流式处理中间件
+ 统一LLM抽象层
+ Markdown渲染引擎
+ 消息队列（Bull/Redis）
```

### v0.4.0 架构增强
```
+ 文件存储服务（S3/OSS抽象层）
+ 向量数据库（Pinecone/ChromaDB）
+ 搜索服务（Tavily/Google）
+ 语音服务（TTS/STT抽象层）
+ Agent工作流引擎
```

### v0.5.0 架构增强
```
+ 插件运行时（沙箱环境）
+ 代码执行沙箱（Docker）
+ 实时协作服务（Yjs/Socket.io）
+ 缓存层优化（Redis Cluster）
+ CDN静态资源加速
```

---

## 数据库模型扩展

### 新增表结构

```sql
-- 文件表
CREATE TABLE files (
    id UUID PRIMARY KEY,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size INTEGER,
    url TEXT,
    uploader_id UUID REFERENCES users(id),
    room_id UUID REFERENCES chat_rooms(id),
    created_at TIMESTAMP
);

-- 向量文档表（RAG）
CREATE TABLE vector_documents (
    id UUID PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    room_id UUID REFERENCES chat_rooms(id),
    file_id UUID REFERENCES files(id)
);

-- Agent角色表
CREATE TABLE agent_roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    system_prompt TEXT,
    avatar_url TEXT,
    is_template BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id)
);

-- 对话分支表
CREATE TABLE conversation_branches (
    id UUID PRIMARY KEY,
    parent_message_id UUID REFERENCES messages(id),
    name VARCHAR(100),
    room_id UUID REFERENCES chat_rooms(id),
    is_active BOOLEAN DEFAULT true
);

-- 用户记忆表
CREATE TABLE user_memories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content TEXT,
    importance INTEGER DEFAULT 5,
    category VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 插件表
CREATE TABLE plugins (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    version VARCHAR(20),
    manifest JSONB,
    is_enabled BOOLEAN DEFAULT false,
    installed_by UUID REFERENCES users(id)
);
```

---

## 实施路线图

### v0.3.0（4-6周）
**核心目标**：完善基础体验，建立技术债务清零

**Week 1-2**: 流式输出 + LLM统一接口
**Week 3-4**: @提及功能 + Markdown增强
**Week 5-6**: 技术债务清理 + 测试覆盖

**里程碑**：
- 流式响应延迟 < 100ms
- 支持10+ LLM Provider统一接口
- 代码测试覆盖率 > 70%

### v0.4.0（6-8周）
**核心目标**：多模态能力 + AI协作

**Week 1-2**: 文件上传 + 存储服务
**Week 3-4**: RAG知识库 + 向量检索
**Week 5-6**: Agent团队 + 角色系统
**Week 7-8**: Web搜索 + 语音交互

**里程碑**：
- 支持20+文件格式
- 文档问答准确率 > 80%
- 3种以上Agent协作模式

### v0.5.0（6-8周）
**核心目标**：生态建设 + 专业功能

**Week 1-2**: 插件系统 + SDK
**Week 3-4**: Artifacts生成 + 代码解释器
**Week 5-6**: 分支对话 + 记忆系统
**Week 7-8**: 移动端PWA + 性能优化

**里程碑**：
- 插件市场上线（10+官方插件）
- 支持Python/JS代码执行
- PWA Lighthouse评分 > 90

---

## 风险与挑战

### 技术风险
1. **流式输出稳定性**：WebSocket断线重连、消息顺序保证
2. **RAG准确性**：向量检索质量、幻觉问题控制
3. **代码执行安全**：沙箱逃逸防护、资源限制
4. **插件系统安全**：恶意插件检测、权限控制

### 缓解策略
- 完善的单元测试和集成测试
- 渐进式发布（灰度发布）
- 安全审计和代码审查
- 监控和告警系统

---

## 成功指标 (KPI)

### 技术指标
- 流式首字响应时间 < 500ms
- 文件上传成功率 > 99%
- AI响应准确率 > 85%
- 系统可用性 > 99.9%

### 用户指标
- 日活跃用户 (DAU) 增长 50%
- 平均会话时长 > 15分钟
- 用户留存率 (7日) > 40%
- NPS评分 > 50

---

## 附录：优秀项目参考链接

1. **OpenAOE** - https://github.com/InternLM/OpenAOE
   - 学习：多模型并行架构、配置文件管理

2. **LobeChat** - https://github.com/lobehub/lobe-chat
   - 学习：插件系统、Agent Team、PWA、多模态

3. **LibreChat** - https://github.com/danny-avila/LibreChat
   - 学习：Artifacts、Code Interpreter、分支对话、Agent框架

4. **AutoGen** - https://github.com/microsoft/autogen
   - 学习：多Agent协作、工作流编排

5. **CoChat** - https://cochat.ai/
   - 学习：多AI协作模式设计

---

*规划制定时间: 2026-02-02*  
*版本: v0.3.0-v0.5.0 路线图*  
*负责人: Prometheus Planning Agent*
