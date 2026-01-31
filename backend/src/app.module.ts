import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AIModelsModule } from './modules/ai-models/ai-models.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 功能模块
    AuthModule,
    UsersModule,
    RoomsModule,
    MessagesModule,
    AIModelsModule,
    WebsocketModule,
  ],
  providers: [
    // 全局 JWT 认证守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
