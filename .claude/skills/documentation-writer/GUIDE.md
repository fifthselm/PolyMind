# Documentation Writer - 使用指南

## 快速开始

### 1. 生成 README

要生成新的 README 文件：

```bash
# 告诉 Claude 你要生成 README
"请为这个项目生成一个专业的 README"
```

Claude 会：
1. 分析项目结构
2. 识别技术栈
3. 提取功能特性
4. 生成完整的 README.md

### 2. 优化现有 README

要优化已有的 README：

```bash
"请优化现有的 README.md"
```

Claude 会：
1. 读取现有 README
2. 识别缺失或过时的内容
3. 改进排版和格式
4. 更新内容以匹配当前代码

### 3. 生成 API 文档

要生成 API 文档：

```bash
"请生成 API 文档"
```

Claude 会：
1. 扫描所有 API 路由
2. 提取端点信息
3. 生成详细的 API 文档

## 模板变量

在模板中可以使用以下变量：

- `{{project_name}}` - 项目名称
- `{{project_description}}` - 项目描述
- `{{features_list}}` - 功能列表
- `{{tech_stack}}` - 技术栈
- `{{installation_steps}}` - 安装步骤
- `{{directory_structure}}` - 目录结构
- `{{license}}` - 许可证信息

## 输出位置

生成的文档默认保存到：
- README.md → 项目根目录
- API 文档 → docs/api.md
- 贡献指南 → CONTRIBUTING.md
- 更新日志 → CHANGELOG.md

## 最佳实践

1. **生成后审查**：始终审查生成的文档，确保准确性
2. **定期更新**：当项目有重大变更时重新生成文档
3. **保持一致**：使用统一的术语和风格
4. **添加截图**：对于 UI 项目，添加截图会更有帮助
5. **提供示例**：确保代码示例可以正常运行

## 示例项目

### Node.js + Express 项目

```markdown
# My API Server

高性能 REST API 服务

## 功能特性

- 🚀 高性能 Express 服务器
- 📦 MongoDB 数据库支持
- 🔐 JWT 身份认证
- 📊 内置性能监控

## 安装

npm install
npm run dev

## API 端点

- GET /api/users - 获取用户列表
- POST /api/users - 创建用户
- GET /api/users/:id - 获取单个用户
```

### React 前端项目

```markdown
# My React App

现代化 React 单页应用

## 功能特性

- ⚡ Vite 构建工具
- 🎨 Tailwind CSS 样式
- 📱 响应式设计
- 🌐 i18n 国际化支持

## 安装

npm install
npm run dev

## 脚本

- dev: 开发模式
- build: 生产构建
- preview: 预览生产版本
```

## 故障排除

### Q: 生成的文档不准确？
A: 这是正常的！请审查并根据实际情况修改。文档生成器提供的是基础框架，你需要根据实际情况填充细节。

### Q: 如何处理多语言文档？
A: 可以创建多个 README 文件：
- README.md (英文)
- README.zh.md (中文)
- README.ja.md (日文)

### Q: 可以自定义模板吗？
A: 可以！修改 `.claude/skills/documentation-writer/templates/` 目录下的模板文件。

## 更新日志

### v1.0.0
- 初始版本
- 支持 README、API 文档、贡献指南生成
- 内置多种项目类型模板
