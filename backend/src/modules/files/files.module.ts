import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { LocalStorageService } from './storage/local-storage.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, LocalStorageService],
  exports: [FilesService],
})
export class FilesModule {}
