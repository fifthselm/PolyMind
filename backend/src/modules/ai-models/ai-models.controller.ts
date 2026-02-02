import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AIModelsService } from './ai-models.service';
import { CreateAIModelDto, UpdateAIModelDto, AIModelResponse, GetAvailableModelsDto, TestAndSaveModelDto } from './dto/ai-model.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('models')
@UseGuards(JwtAuthGuard)
export class AIModelsController {
  constructor(private readonly aiModelsService: AIModelsService) {}

  /**
   * 创建模型配置
   */
  @Post()
  async create(@Body() dto: CreateAIModelDto, @Request() req: any): Promise<AIModelResponse> {
    return this.aiModelsService.create(dto, req.user.id);
  }

  /**
   * 获取所有模型
   */
  @Get()
  async findAll(): Promise<AIModelResponse[]> {
    return this.aiModelsService.findAll();
  }

  /**
   * 根据ID获取模型
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<AIModelResponse> {
    return this.aiModelsService.findById(id);
  }

  /**
   * 更新模型配置
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAIModelDto,
    @Request() req: any,
  ): Promise<AIModelResponse> {
    return this.aiModelsService.update(id, dto, req.user.id);
  }

  /**
   * 删除模型配置
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.aiModelsService.delete(id, req.user.id);
  }

  /**
   * 测试模型连接
   */
  @Post(':id/test')
  async test(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.aiModelsService.test(id);
  }

  /**
   * 测试并保存模型配置
   * 先测试配置是否有效，测试通过后才保存到数据库
   */
  @Post('test-and-save')
  async testAndSave(
    @Body() dto: TestAndSaveModelDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string; model?: AIModelResponse }> {
    return this.aiModelsService.testAndSave(dto, req.user.id);
  }

  /**
   * 获取可用模型列表
   */
  @Post('available')
  async getAvailableModels(@Body() dto: GetAvailableModelsDto): Promise<{ models: string[] }> {
    return this.aiModelsService.getAvailableModels(dto);
  }
}
