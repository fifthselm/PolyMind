import { Controller, Post, Body, Logger } from '@nestjs/common';
import { MindMapsService } from './mind-maps.service';
import { GenerateMindMapDto, MindMapLayout } from './dto/generate-mindmap.dto';

interface GenerateRequest {
  messages: string[];
  title?: string;
  layout?: MindMapLayout;
}

@Controller('mind-maps')
export class MindMapsController {
  private readonly logger = new Logger(MindMapsService.name);

  constructor(private readonly mindMapsService: MindMapsService) {}

  /**
   * 生成思维导图
   */
  @Post('generate')
  async generateMindMap(@Body() body: GenerateRequest) {
    const { messages, title, layout = 'mindmap' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: '缺少对话内容',
      };
    }

    const dto: GenerateMindMapDto = {
      messages,
      title,
      layout,
    };

    try {
      const result = await this.mindMapsService.generateMindMap(dto);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('生成思维导图失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成失败',
      };
    }
  }

  /**
   * 获取支持的布局类型
   */
  @Post('layouts')
  getSupportedLayouts() {
    const layouts = this.mindMapsService.getSupportedLayouts();
    return {
      success: true,
      data: layouts,
    };
  }
}
