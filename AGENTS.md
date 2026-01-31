# PolyMind 项目规则

## 技术栈
- **前端**：React + TypeScript
- **后端**：NestJS
- **数据库**：PostgreSQL

## 构建命令

### 前端
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 自动修复 lint 问题
npm run lint:fix

# 构建
npm run build

# 运行单个测试文件
npm run test -- path/to/test.spec.ts

# 运行单个测试用例
npm run test -- path/to/test.spec.ts -t "测试用例名称"

# 测试覆盖率
npm run test:coverage
```

### 后端
```bash
# 安装依赖
npm install

# 开发模式
npm run start:dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 自动修复 lint 问题
npm run lint:fix

# 构建
npm run build

# 运行单个测试文件
npm run test -- path/to/test.spec.ts

# 运行单个测试用例
npm run test -- path/to/test.spec.ts -t "测试用例名称"

# 测试覆盖率
npm run test:e2e
```

## 代码风格

### 命名约定
- **组件文件**：PascalCase（如 `UserProfile.tsx`、`DataService.ts`）
- **API 路由**：kebab-case（如 `/user-profile`、`/data-service`）
- **变量和函数**：camelCase（如 `userName`、`getUserById`）
- **常量**：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- **类名**：PascalCase（如 `UserService`、`DatabaseConnection`）
- **接口/类型**：PascalCase，可加 `I` 前缀（如 `IUser`、`UserProfile`）
- **私有成员**：下划线前缀（如 `_privateMethod`）

### 缩进和格式
- **缩进**：2 空格
- **分号**：必须使用
- **引号**：字符串用单引号，JSX 属性用双引号
- **行尾**：Unix 风格（LF）

### 导入顺序
```typescript
// 1. 第三方库
import React from 'react';
import { useState, useEffect } from 'react';

// 2. 内部模块（按层级排序）
import { Button } from '@/components/ui';
import { formatDate } from '@/utils/date';
import { UserService } from '@/services/user';
```

## 类型规范

### TypeScript 使用
- **严格模式**：启用 `strict: true`
- **类型声明**：优先使用 `interface`，需要组合类型时使用 `type`
- **any 禁止**：禁止使用 `any`，使用 `unknown` 代替
- **类型断言**：禁止使用 `as any`，使用 `as` 断言时必须明确类型

### 类型定义示例
```typescript
// 使用 interface
interface User {
  id: string;
  name: string;
  email: string;
}

// 使用 type (联合类型、交叉类型等)
type Status = 'active' | 'inactive' | 'pending';
type UserWithStatus = User & { status: Status };
```

## 错误处理

### 统一错误处理
```typescript
// 前端
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('API 调用失败:', error);
  // 统一错误上报
  trackError(error);
  throw error;
}

// 后端
try {
  const result = await service.getData();
  return result;
} catch (error) {
  throw new BadRequestException('获取数据失败');
}
```

### 错误边界
```typescript
// React Error Boundary
class ErrorBoundary extends React.Component<{ children: ReactNode }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary 捕获错误:', error, errorInfo);
  }

  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
```

## 注释规范

### JSDoc 注释
```typescript
/**
 * 根据用户 ID 获取用户信息
 * @param userId - 用户 ID
 * @returns 用户对象
 * @throws {BadRequestException} 用户不存在时抛出
 */
async getUserById(userId: string): Promise<User> {
  // ...
}
```

### 单行注释
```typescript
// 检查用户权限
const hasPermission = await checkPermission(userId);
```

## 函数规范

### 函数命名
- **动词开头**：`getUserById`、`createOrder`、`updateStatus`
- **布尔值函数**：`isValid`、`hasPermission`、`canEdit`
- **事件处理**：`handleSubmit`、`handleClick`、`onChange`

### 函数长度
- **最大行数**：50 行
- **参数个数**：不超过 4 个，超过则使用对象参数

```typescript
// 不好
function createUser(name, email, age, address, phone, role) {}

// 好
function createUser(data: CreateUserDto) {}
```

## 组件规范

### 组件结构
```typescript
// 1. 导入
import React, { useState, useEffect } from 'react';

// 2. 类型定义
interface Props {
  title: string;
  onClick: () => void;
}

// 3. 组件定义
export const Button: React.FC<Props> = ({ title, onClick }) => {
  // 4. Hooks
  const [isLoading, setIsLoading] = useState(false);

  // 5. 副作用
  useEffect(() => {
    // ...
  }, []);

  // 6. 事件处理
  const handleClick = () => {
    onClick();
  };

  // 7. 渲染
  return (
    <button onClick={handleClick} disabled={isLoading}>
      {title}
    </button>
  );
};
```

### 组件命名
- **展示组件**：PascalCase（如 `UserProfile`、`DataTable`）
- **容器组件**：带 `Container` 后缀（如 `UserProfileContainer`）
- **高阶组件**：`with` 前缀（如 `withAuth`、`withErrorBoundary`）

## 测试规范

### 测试文件命名
- **单元测试**：`ComponentName.spec.tsx` 或 `ComponentName.test.tsx`
- **测试位置**：与源文件同级或 `__tests__` 目录

### 测试结构
```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('应该返回正确的用户信息', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: userId, name: 'Test' };

      // Act
      const result = await service.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
    });

    it('用户不存在时应该抛出错误', async () => {
      // ...
    });
  });
});
```

## Git 提交规范

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响运行）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

### 示例
```
feat(auth): 添加用户登录功能

- 实现 JWT 认证
- 添加登录表单验证
- 集成后端登录接口

Closes #123
```
