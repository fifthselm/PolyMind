import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { CreateMeetingDto } from './dto/meeting.dto';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createMeeting(data: CreateMeetingDto) {
    const meeting = await this.prisma.meeting.create({
      data: {
        title: data.title,
        description: data.description,
        status: 'scheduled',
      },
    });

    this.logger.log(`创建会议: ${meeting.id} - ${meeting.title}`);
    return meeting;
  }

  async getMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        transcripts: true,
        summaries: true,
        actionItems: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException(`会议ID ${id} 不存在`);
    }

    return meeting;
  }

  async addTranscript(meetingId: string, transcript: { speaker: string; content: string; timestamp: number }) {
    return this.prisma.meetingTranscript.create({
      data: {
        meetingId,
        speaker: transcript.speaker,
        content: transcript.content,
        timestamp: transcript.timestamp,
      },
    });
  }
}
