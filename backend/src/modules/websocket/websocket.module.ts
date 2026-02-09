import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { GatewayService } from './gateway.service';
import { GatewayGateway } from './gateway.gateway';
import { AIChatModule } from '../ai-chat/ai-chat.module';

@Module({
  imports: [
    forwardRef(() => AIChatModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [GatewayService, GatewayGateway],
  exports: [GatewayService, GatewayGateway],
})
export class WebsocketModule {}
