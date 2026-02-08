import { Module } from '@nestjs/common';
import { DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';
import { DebatesGateway } from './debates.gateway';
import { PrismaService } from '../../providers/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';

@Module({
  controllers: [DebatesController],
  providers: [DebatesService, DebatesGateway, PrismaService, LLMService],
  exports: [DebatesService],
})
export class DebatesModule {}
