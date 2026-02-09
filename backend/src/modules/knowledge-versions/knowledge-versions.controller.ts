import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { KnowledgeVersionsService } from './knowledge-versions.service';
import { CreateVersionDto, CompareVersionsDto } from './dto/version.dto';

@Controller('kb-versions')
export class KnowledgeVersionsController {
  constructor(private readonly kvService: KnowledgeVersionsService) {}

  @Post()
  async createVersion(@Body() dto: CreateVersionDto) {
    return this.kvService.createVersion(dto);
  }

  @Get('history/:documentId')
  async getHistory(@Param('documentId') documentId: string) {
    return this.kvService.getVersionHistory(documentId);
  }

  @Get(':id')
  async getVersion(@Param('id') id: string) {
    return this.kvService.getVersion(id);
  }

  @Post(':id/rollback')
  async rollback(@Param('id') id: string) {
    return this.kvService.rollback(id);
  }

  @Post('compare')
  async compare(@Body() dto: CompareVersionsDto) {
    return this.kvService.compareVersions(dto.versionId1, dto.versionId2);
  }
}
