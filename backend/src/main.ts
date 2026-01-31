import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 去除不在 DTO 中的属性
      forbidNonWhitelisted: true, // 禁止非白名单属性
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS 配置
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 全局前缀
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 PolyMind 后端服务启动成功!`);
  console.log(`📡 API 服务: http://localhost:${port}/api`);
  console.log(`🌐 WebSocket: ws://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
