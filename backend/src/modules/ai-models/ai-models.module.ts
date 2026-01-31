import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../providers/database.module';

import { AIModelsService } from './ai-models.service';
import { AIModelsController } from './ai-models.controller';
import { LLMModule } from '../../providers/llm/llm.module';

@Module({
  imports: [
    DatabaseModule,
    LLMModule,
  ],
  controllers: [AIModelsController],
  providers: [AIModelsService],
  exports: [AIModelsService],
})
export class AIModelsModule {}
