import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { AIChatModule } from '../ai-chat/ai-chat.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    AIChatModule,
    WebsocketModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
