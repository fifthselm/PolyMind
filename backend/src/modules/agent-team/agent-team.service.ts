import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';

// Agent角色定义
export interface AgentRole {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  avatarUrl?: string;
  isTemplate: boolean;
  createdById?: string;
  tags: string[];
}

// 协作模式
export type CollaborationMode = 'parallel' | 'sequential' | 'debate';

// Agent团队配置
export interface AgentTeam {
  id: string;
  name: string;
  description?: string;
  mode: string;
  roomId: string;
  createdById: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 预定义角色模板
export const AGENT_ROLE_TEMPLATES: Omit<AgentRole, 'id' | 'isTemplate' | 'createdById'>[] = [
  {
    name: '产品经理',
    description: '负责需求分析和产品设计',
    systemPrompt: '你是一位经验丰富的产品经理。你的职责是分析用户需求，设计产品功能，制定产品规划。你善于从用户角度思考问题，注重用户体验和商业价值。',
    tags: ['产品', '设计', '规划'],
  },
  {
    name: '开发工程师',
    description: '负责技术实现和代码编写',
    systemPrompt: '你是一位全栈开发工程师。你的职责是将产品需求转化为技术实现，编写高质量的代码，解决技术难题。你注重代码质量、性能和可维护性。',
    tags: ['开发', '技术', '代码'],
  },
  {
    name: '测试工程师',
    description: '负责质量保证和测试',
    systemPrompt: '你是一位专业的测试工程师。你的职责是设计测试用例，发现软件缺陷，保证产品质量。你善于发现边界情况和潜在问题。',
    tags: ['测试', '质量', 'QA'],
  },
  {
    name: 'UI/UX设计师',
    description: '负责界面设计和用户体验',
    systemPrompt: '你是一位创意UI/UX设计师。你的职责是设计美观、易用的用户界面，优化用户体验。你关注设计趋势，注重细节和视觉美感。',
    tags: ['设计', 'UI', 'UX'],
  },
  {
    name: '技术架构师',
    description: '负责系统架构设计',
    systemPrompt: '你是一位资深技术架构师。你的职责是设计系统架构，选择技术栈，制定技术规范。你善于权衡各种技术方案的优缺点。',
    tags: ['架构', '技术', '设计'],
  },
  {
    name: '正方辩手',
    description: '辩论中的正方观点',
    systemPrompt: '你是一位辩论正方辩手。你的职责是支持并论证给定的观点。你需要提供有力的论据、案例和逻辑推理来支持你的立场。',
    tags: ['辩论', '论证'],
  },
  {
    name: '反方辩手',
    description: '辩论中的反方观点',
    systemPrompt: '你是一位辩论反方辩手。你的职责是质疑并反驳给定的观点。你需要找出对方论证中的漏洞，提供反例和批判性思考。',
    tags: ['辩论', '批判'],
  },
  {
    name: '总结者',
    description: '总结和提炼关键信息',
    systemPrompt: '你是一位专业的总结者。你的职责是从复杂的讨论中提取关键信息，总结核心观点，提供清晰、简洁的摘要。',
    tags: ['总结', '提炼'],
  },
  {
    name: '翻译官',
    description: '多语言翻译专家',
    systemPrompt: '你是一位精通多国语言的翻译专家。你的职责是准确、自然地进行语言翻译，保持原文的语气和风格。',
    tags: ['翻译', '语言'],
  },
  {
    name: '代码审查员',
    description: '审查代码质量和最佳实践',
    systemPrompt: '你是一位严格的代码审查员。你的职责是审查代码质量，发现潜在问题，提出改进建议。你关注代码规范、性能、安全性和可维护性。',
    tags: ['代码审查', '质量'],
  },
];

@Injectable()
export class AgentTeamService {
  private readonly logger = new Logger(AgentTeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 初始化默认角色模板
   */
  async initializeDefaultRoles(): Promise<void> {
    const existingCount = await this.prisma.agentRole.count({
      where: { isTemplate: true },
    });

    if (existingCount > 0) {
      this.logger.log('角色模板已存在，跳过初始化');
      return;
    }

    for (const template of AGENT_ROLE_TEMPLATES) {
      await this.prisma.agentRole.create({
        data: {
          ...template,
          isTemplate: true,
        },
      });
    }

    this.logger.log(`初始化完成: ${AGENT_ROLE_TEMPLATES.length} 个角色模板`);
  }

  /**
   * 获取所有角色模板
   */
  async getRoleTemplates(): Promise<AgentRole[]> {
    return this.prisma.agentRole.findMany({
      where: { isTemplate: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 创建自定义角色
   */
  async createRole(
    data: Omit<AgentRole, 'id' | 'isTemplate'>,
    userId: string,
  ): Promise<AgentRole> {
    return this.prisma.agentRole.create({
      data: {
        ...data,
        isTemplate: false,
        createdById: userId,
      },
    });
  }

  /**
   * 创建Agent团队
   */
  // @ts-ignore
  async createTeam(
    data: any,
    userId: string,
  ): Promise<AgentTeam> {
    return this.prisma.agentTeam.create({
      data: {
        ...data,
        createdById: userId,
      },
    });
  }

  /**
   * 获取房间的Agent团队
   */
  async getTeamsByRoom(roomId: string): Promise<AgentTeam[]> {
    // @ts-ignore
    return this.prisma.agentTeam.findMany({
      where: { roomId },
      include: {
        agents: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * 执行团队协作
   */
  async executeTeamCollaboration(
    teamId: string,
    topic: string,
    context?: string,
  ): Promise<Array<{ role: string; content: string; order: number }>> {
    const team = await this.prisma.agentTeam.findUnique({
      where: { id: teamId },
      include: {
        agents: {
          include: { role: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!team) {
      throw new Error('团队不存在');
    }

    this.logger.log(`执行团队协作: ${team.name}, 模式: ${team.mode}`);

    // 根据协作模式执行
    switch (team.mode) {
      case 'parallel':
        return this.executeParallel(team.agents, topic, context);
      case 'sequential':
        return this.executeSequential(team.agents, topic, context);
      case 'debate':
        return this.executeDebate(team.agents, topic, context);
      default:
        throw new Error(`未知的协作模式: ${team.mode}`);
    }
  }

  /**
   * 并行执行（所有Agent同时响应）
   */
  private async executeParallel(
    agents: any[],
    topic: string,
    context?: string,
  ): Promise<Array<{ role: string; content: string; order: number }>> {
    // 这里应该调用AI服务，现在返回模拟数据
    return agents.map((agent, index) => ({
      role: agent.role.name,
      content: `[${agent.role.name}] 关于"${topic}"的观点...`,
      order: index,
    }));
  }

  /**
   * 串行执行（Agent依次响应）
   */
  private async executeSequential(
    agents: any[],
    topic: string,
    context?: string,
  ): Promise<Array<{ role: string; content: string; order: number }>> {
    const results: Array<{ role: string; content: string; order: number }> = [];
    let accumulatedContext = context || '';

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      // 构建提示词（包含之前的上下文）
      const prompt = accumulatedContext 
        ? `基于之前的讨论:\n${accumulatedContext}\n\n请${agent.role.name}继续: ${topic}`
        : `${agent.role.name}请开始: ${topic}`;

      // 这里应该调用AI服务
      const response = `[${agent.role.name}] 针对"${topic}"的分析...`;

      results.push({
        role: agent.role.name,
        content: response,
        order: i,
      });

      // 更新上下文
      accumulatedContext += `\n${agent.role.name}: ${response}`;
    }

    return results;
  }

  /**
   * 辩论模式（正方vs反方）
   */
  private async executeDebate(
    agents: any[],
    topic: string,
    context?: string,
  ): Promise<Array<{ role: string; content: string; order: number }>> {
    const rounds = 3; // 辩论轮数
    const results: Array<{ role: string; content: string; order: number }> = [];

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        
        results.push({
          role: agent.role.name,
          content: `[第${round + 1}轮] [${agent.role.name}] 关于"${topic}"的辩论观点...`,
          order: round * agents.length + i,
        });
      }
    }

    return results;
  }
}
