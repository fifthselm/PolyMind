import { Module, forwardRef } from '@nestjs/common';
import { AIChatService } from './ai-chat.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { LLMModule } from '../../providers/llm/llm.module';
import { WebSearchModule } from '../web-search/web-search.module';

@Module({
  imports: [
    forwardRef(() => WebsocketModule),
    LLMModule,
    WebSearchModule,
  ],
  providers: [AIChatService],
  exports: [AIChatService],
})
export class AIChatModule {}
