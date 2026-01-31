import { Module } from '@nestjs/common';
import { AIChatService } from './ai-chat.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { LLMModule } from '../../providers/llm/llm.module';

@Module({
  imports: [
    WebsocketModule,
    LLMModule,
  ],
  providers: [AIChatService],
  exports: [AIChatService],
})
export class AIChatModule {}
