import { Module } from '@nestjs/common';
import { RAGController } from './rag.controller';
import { RAGService } from './rag.service';

@Module({
  controllers: [RAGController],
  providers: [RAGService],
  exports: [RAGService],
})
export class RAGModule {}
