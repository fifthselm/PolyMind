import { Module } from '@nestjs/common';
import { DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';
import { DebatesGateway } from './debates.gateway';
import { PrismaModule } from '../../providers/prisma.module';
import { LLMModule } from '../../providers/llm/llm.module';

@Module({
  imports: [PrismaModule, LLMModule],
  controllers: [DebatesController],
  providers: [DebatesService, DebatesGateway],
  exports: [DebatesService],
})
export class DebatesModule {}
