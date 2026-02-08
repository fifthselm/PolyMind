import { Module } from '@nestjs/common';
import { KnowledgeVersionsController } from './knowledge-versions.controller';
import { KnowledgeVersionsService } from './knowledge-versions.service';
import { PrismaModule } from '../../providers/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeVersionsController],
  providers: [KnowledgeVersionsService],
  exports: [KnowledgeVersionsService],
})
export class KnowledgeVersionsModule {}
