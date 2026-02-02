import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AIModelsModule } from './modules/ai-models/ai-models.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { TestModule } from './modules/test/test.module';
import { WebSearchModule } from './modules/web-search/web-search.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PublicGuard } from './guards/public.guard';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 速率限制模块
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 500,
      },
    ]),
    // 功能模块
    AuthModule,
    UsersModule,
    RoomsModule,
    MessagesModule,
    AIModelsModule,
    WebsocketModule,
    TestModule,
    WebSearchModule,
  ],
  providers: [
    // 速率限制守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 公开路由守卫 (先执行)
    {
      provide: APP_GUARD,
      useClass: PublicGuard,
    },
    // 全局 JWT 认证守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
