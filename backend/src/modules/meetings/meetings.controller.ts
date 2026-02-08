import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { SummaryService } from './summaries/summary.service';
import { CreateMeetingDto, GenerateSummaryDto, ExtractActionItemsDto } from './dto/meeting.dto';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly summaryService: SummaryService,
  ) {}

  @Post()
  async createMeeting(@Body() dto: CreateMeetingDto) {
    return this.meetingsService.createMeeting(dto);
  }

  @Get(':id')
  async getMeeting(@Param('id') id: string) {
    return this.meetingsService.getMeeting(id);
  }

  @Post(':id/summary')
  async generateSummary(@Param('id') id: string, @Body() dto: GenerateSummaryDto) {
    return this.summaryService.generateSummary(id, dto.type || 'executive');
  }

  @Post(':id/action-items')
  async extractActionItems(@Param('id') id: string, @Body() dto: ExtractActionItemsDto) {
    return this.summaryService.extractActionItems(id);
  }
}
