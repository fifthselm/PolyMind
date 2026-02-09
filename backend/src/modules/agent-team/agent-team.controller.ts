import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AgentTeamService } from './agent-team.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('agent-team')
@UseGuards(JwtAuthGuard)
export class AgentTeamController {
  constructor(private readonly agentTeamService: AgentTeamService) {}

  @Get('roles')
  async getRoleTemplates() {
    const roles = await this.agentTeamService.getRoleTemplates();
    return { success: true, data: roles };
  }

  @Get('teams')
  async getTeams(@Query('roomId') roomId: string) {
    const teams = await this.agentTeamService.getTeamsByRoom(roomId);
    return { success: true, data: teams };
  }

  @Post('execute/:teamId')
  async executeTeam(
    @Param('teamId') teamId: string,
    @Body('topic') topic: string,
    @Body('context') context?: string,
  ) {
    const results = await this.agentTeamService.executeTeamCollaboration(teamId, topic, context);
    return { success: true, data: results };
  }
}
