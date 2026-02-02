import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './providers/prisma.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 健康检查端点
   */
  @Get('health')
  async getHealth(): Promise<{ status: string; database: string; timestamp: string }> {
    try {
      // 测试数据库连接
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('数据库连接失败:', error.message);
      return {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 根路由
   */
  @Get()
  getRoot(): { name: string; version: string } {
    return {
      name: 'PolyMind API',
      version: '1.0.0',
    };
  }
}
