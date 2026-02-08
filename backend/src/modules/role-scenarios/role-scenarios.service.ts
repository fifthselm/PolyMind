import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { prompts } from './prompts';

@Injectable()
export class RoleScenariosService {
  private readonly logger = new Logger(RoleScenariosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取所有场景（包含预设和用户自定义）
   */
  async getAllScenarios() {
    const scenarios = await this.prisma.roleScenario.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 如果数据库为空，返回预设场景
    if (scenarios.length === 0) {
      return this.getPresetScenarios();
    }

    return scenarios;
  }

  /**
   * 获取预设场景
   */
  async getPresetScenarios() {
    return prompts.map((prompt, index) => ({
      id: `preset-${index + 1}`,
      name: prompt.name,
      role: prompt.role,
      description: prompt.description,
      systemPrompt: prompt.systemPrompt,
      difficulty: prompt.difficulty,
      category: prompt.category,
      isPreset: true,
      createdAt: new Date(),
    }));
  }

  /**
   * 根据ID获取场景
   */
  async getScenarioById(id: string) {
    // 检查是否是预设场景
    if (id.startsWith('preset-')) {
      const index = parseInt(id.replace('preset-', '')) - 1;
      if (index >= 0 && index < prompts.length) {
        const prompt = prompts[index];
        return {
          id,
          name: prompt.name,
          role: prompt.role,
          description: prompt.description,
          systemPrompt: prompt.systemPrompt,
          difficulty: prompt.difficulty,
          category: prompt.category,
          isPreset: true,
        };
      }
    }

    // 查找用户自定义场景
    const scenario = await this.prisma.roleScenario.findUnique({
      where: { id },
    });

    if (!scenario) {
      throw new NotFoundException(`场景ID ${id} 不存在`);
    }

    return scenario;
  }

  /**
   * 创建自定义场景
   */
  async createScenario(createDto: CreateScenarioDto) {
    const scenario = await this.prisma.roleScenario.create({
      data: {
        name: createDto.name,
        role: createDto.role,
        description: createDto.description,
        systemPrompt: createDto.systemPrompt,
        difficulty: createDto.difficulty || 'intermediate',
        category: createDto.category || 'custom',
        userId: createDto.userId,
      },
    });

    this.logger.log(`创建角色场景: ${scenario.id} - ${scenario.name}`);
    return scenario;
  }

  /**
   * 更新场景
   */
  async updateScenario(id: string, updateData: Partial<CreateScenarioDto>) {
    // 检查是否是预设场景（不允许修改）
    if (id.startsWith('preset-')) {
      throw new NotFoundException('预设场景无法修改');
    }

    const scenario = await this.prisma.roleScenario.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`更新角色场景: ${id}`);
    return scenario;
  }

  /**
   * 删除场景
   */
  async deleteScenario(id: string) {
    // 检查是否是预设场景（不允许删除）
    if (id.startsWith('preset-')) {
      throw new NotFoundException('预设场景无法删除');
    }

    await this.prisma.roleScenario.delete({
      where: { id },
    });

    this.logger.log(`删除角色场景: ${id}`);
    return { success: true, message: '场景已删除' };
  }

  /**
   * 获取场景的系统提示词
   */
  async getScenarioPrompt(id: string) {
    const scenario = await this.getScenarioById(id);
    return {
      id: scenario.id,
      name: scenario.name,
      role: scenario.role,
      systemPrompt: scenario.systemPrompt,
    };
  }

  /**
   * 获取所有场景分类
   */
  async getCategories() {
    const categories = await this.prisma.roleScenario.groupBy({
      by: ['category'],
      _count: true,
    });

    const presetCategories = [...new Set(prompts.map((p) => p.category))];

    return {
      preset: presetCategories.map((cat) => ({
        name: cat,
        count: prompts.filter((p) => p.category === cat).length,
      })),
      custom: categories.map((c) => ({
        name: c.category,
        count: c._count,
      })),
    };
  }
}
