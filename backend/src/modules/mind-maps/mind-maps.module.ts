import { Module } from '@nestjs/common';
import { MindMapsController } from './mind-maps.controller';
import { MindMapsService } from './mind-maps.service';

@Module({
  controllers: [MindMapsController],
  providers: [MindMapsService],
  exports: [MindMapsService],
})
export class MindMapsModule {}
