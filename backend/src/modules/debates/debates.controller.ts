import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DebatesService } from './debates.service';
import { CreateDebateDto, ScoreDebateDto } from './dto/debate.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('api/v1/debates')
export class DebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  // @ts-ignore
  async create(@Body() dto: CreateDebateDto, @Req() req) {
    return this.debatesService.createDebate({
      ...dto,
      userId: req.user.id as string,
    });
  }

  @Post(':roomId/start')
  async start(@Param('roomId') roomId: string) {
    return this.debatesService.startDebate(roomId);
  }

  @Post(':roomId/next')
  async nextTurn(@Param('roomId') roomId: string) {
    return this.debatesService.nextTurn(roomId);
  }

  @Post(':roomId/score')
  async score(@Param('roomId') roomId: string, @Body() dto: ScoreDebateDto) {
    return this.debatesService.scoreDebate(roomId, { A: dto.scoreA, B: dto.scoreB });
  }

  @Get(':roomId/state')
  async getState(@Param('roomId') roomId: string) {
    return this.debatesService.getDebateState(roomId);
  }
}
