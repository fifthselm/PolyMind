import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';
import { LLMService } from '../../../providers/llm/llm.service';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
  ) {}

  async generateSummary(meetingId: string, type: string = 'executive') {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { transcripts: true },
    });

    if (!meeting) {
      throw new Error('会议不存在');
    }

    const transcript = meeting.transcripts
      .map((t) => `[${t.speaker}]: ${t.content}`)
      .join('\n');

    let prompt = '';
    switch (type) {
      case 'action_items':
        prompt = `从以下会议记录中提取所有行动项，包括负责人、截止时间和优先级：\n\n${transcript}`;
        break;
      case 'detailed':
        prompt = `生成详细的会议纪要，包括讨论要点、争议点和决策过程：\n\n${transcript}`;
        break;
      default:
        prompt = `生成会议执行摘要（200字以内），包括：\n1. 会议主题和目的\n2. 主要讨论内容\n3. 关键决策\n4. 下一步行动\n\n${transcript}`;
    }

    const result = await this.llmService.sendMessage('default', {
      model: 'gpt-3.5-turbo',
      messages: [],
      systemPrompt: prompt,
      temperature: 0.5,
      maxTokens: 2000,
    });

    const summary = await this.prisma.meetingSummary.create({
      data: {
        meetingId,
        type,
        content: result.choices[0].message.content,
      },
    });

    this.logger.log(`生成会议纪要: ${summary.id}`);
    return summary;
  }

  async extractActionItems(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { transcripts: true },
    });

    if (!meeting) {
      throw new Error('会议不存在');
    }

    const transcript = meeting.transcripts
      .map((t) => `${t.speaker}: ${t.content}`)
      .join('\n');

    const prompt = `从以下会议讨论中提取行动项，以JSON格式返回：
[
  {
    "description": "行动项描述",
    "assignee": "负责人（如有）",
    "dueDate": "截止日期（如有）",
    "priority": "high/medium/low"
  }
]\n\n会议内容：\n${transcript}`;

    const result = await this.llmService.sendMessage('default', {
      model: 'gpt-3.5-turbo',
      messages: [],
      systemPrompt: prompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    let actionItems: any[] = [];
    try {
      actionItems = JSON.parse(result.choices[0].message.content);
    } catch (e) {
      // 如果JSON解析失败，返回原始内容
      actionItems = [{ description: result.choices[0].message.content, priority: 'medium' }];
    }

    const created = await Promise.all(
      actionItems.map((item) =>
        this.prisma.meetingActionItem.create({
          data: {
            meetingId,
            description: item.description,
            assignee: item.assignee,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            priority: item.priority || 'medium',
          },
        }),
      ),
    );

    this.logger.log(`提取行动项: ${created.length} 项`);
    return created;
  }
}
