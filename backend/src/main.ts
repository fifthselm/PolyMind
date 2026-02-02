import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getCorsOptions } from './common/cors.config';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // 安全头部防护
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // 全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // 去除不在 DTO 中的属性
        forbidNonWhitelisted: false, // 不禁止非白名单属性，静默移除
        transform: true, // 自动转换类型
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map(error => 
            Object.values(error.constraints || {}).join(', ')
          );
          return new BadRequestException(messages.join('; '));
        },
      }),
    );

    // 全局异常过滤器
    app.useGlobalFilters(new GlobalExceptionFilter());

    // CORS 配置 - 使用统一配置
    app.enableCors(getCorsOptions());

    // 全局前缀
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 PolyMind 后端服务启动成功!`);
    console.log(`📡 API 服务: http://localhost:${port}/api`);
    console.log(`🌐 WebSocket: ws://localhost:${port}`);
    console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  } catch (error: any) {
    throw error;
  }
}

bootstrap();
