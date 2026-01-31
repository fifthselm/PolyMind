import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 健康检查端点
   */
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
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
