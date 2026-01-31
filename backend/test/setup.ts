/**
 * E2E测试设置文件
 */

import { PrismaService } from '../src/providers/prisma.service';

// 全局超时设置
jest.setTimeout(30000);

// 测试后清理
afterAll(async () => {
  // 等待连接关闭
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
