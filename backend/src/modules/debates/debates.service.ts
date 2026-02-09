import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { debatePrompts } from './prompts/debate.prompts';

interface DebateState {
  id: string;
  topic: string;
  positionA_aiModelId: string;
  positionB_aiModelId: string;
  currentRound: number;
  maxRounds: number;
  currentPosition: 'A' | 'B'; // 当前发言方
  history: Array<{
    round: number;
    position: 'A' | 'B';
    content: string;
    timestamp: Date;
  }>;
  status: 'preparing' | 'active' | 'completed';
  scores: { A: number; B: number };
}

@Injectable()
export class DebatesService {
  private readonly logger = new Logger(DebatesService.name);
  private activeDebates = new Map<string, DebateState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
  ) {}

  // 创建辩论
  async createDebate(data: {
    topic: string;
    aiModelIdA: string;
    aiModelIdB: string;
    format: string;
    maxRounds: number;
    userId: string;
  }) {
    const debate = await this.prisma.chatRoom.create({
      data: {
        name: `辩论: ${data.topic}`,
        description: `正方 vs 反方 - ${data.topic}`,
        createdById: data.userId,
        metadata: {
          type: 'debate',
          format: data.format,
          maxRounds: data.maxRounds,
          positionA_aiModelId: data.aiModelIdA,
          positionB_aiModelId: data.aiModelIdB,
          currentRound: 1,
          currentPosition: 'A',
          status: 'preparing',
          scores: { A: 0, B: 0 },
        } as any,
      },
    });

    return debate;
  }

  // 开始辩论
  async startDebate(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room || room.metadata?.type !== 'debate') {
      throw new Error('辩论房间不存在');
    }

    // 初始化状态
    const state: DebateState = {
      id: roomId,
      topic: room.name.replace('辩论: ', ''),
      positionA_aiModelId: room.metadata.positionA_aiModelId,
      positionB_aiModelId: room.metadata.positionB_aiModelId,
      currentRound: 1,
      maxRounds: room.metadata.maxRounds,
      currentPosition: 'A',
      history: [],
      status: 'active',
      scores: { A: 0, B: 0 },
    };

    this.activeDebates.set(roomId, state);

    // 更新房间状态
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { metadata: { ...room.metadata, status: 'active' } },
    });

    // 生成开场白
    const openingA = await this.generateOpening(state, 'A');

    return {
      debateId: roomId,
      round: 1,
      position: 'A',
      content: openingA,
    };
  }

  // 生成开场白
  private async generateOpening(state: DebateState, position: 'A' | 'B') {
    const prompt = position === 'A'
      ? debatePrompts.openingA(state.topic)
      : debatePrompts.openingB(state.topic);

    const aiModelId = position === 'A'
      ? state.positionA_aiModelId
      : state.positionB_aiModelId;

    const result = await this.llmService.sendMessage(aiModelId, [], {
      systemPrompt: prompt,
      temperature: 0.7,
    });

    return result.text;
  }

  // 下一轮发言
  async nextTurn(roomId: string) {
    const state = this.activeDebates.get(roomId);
    if (!state) throw new Error('辩论不存在或已结束');

    if (state.status !== 'active') {
      throw new Error('辩论未在进行中');
    }

    // 切换发言方
    if (state.currentPosition === 'A') {
      state.currentPosition = 'B';
    } else {
      state.currentPosition = 'A';
      state.currentRound++;

      // 检查是否结束
      if (state.currentRound > state.maxRounds) {
        return await this.endDebate(roomId);
      }
    }

    // 生成发言内容
    const context = state.history.map(h => `${h.position}: ${h.content}`).join('\n');
    const prompt = state.currentPosition === 'A'
      ? debatePrompts.argumentA(state.topic, context)
      : debatePrompts.argumentB(state.topic, context);

    const aiModelId = state.currentPosition === 'A'
      ? state.positionA_aiModelId
      : state.positionB_aiModelId;

    const content = await this.llmService.sendMessage(aiModelId, [], {
      systemPrompt: prompt,
      temperature: 0.7,
    });

    // 记录历史
    state.history.push({
      round: state.currentRound,
      position: state.currentPosition,
      content: content,
      timestamp: new Date(),
    });

    return {
      round: state.currentRound,
      position: state.currentPosition,
      content,
    };
  }

  // 评分
  async scoreDebate(roomId: string, scores: { A: number; B: number }) {
    const state = this.activeDebates.get(roomId);
    if (!state) throw new Error('辩论不存在');

    state.scores = scores;

    // 检查双方是否都已评分
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    // 生成客观总结
    const history = state.history.map(h => `${h.position}方: ${h.content}`).join('\n\n');
    const summary = await this.generateSummary(state.topic, history);

    return {
      scores,
      summary,
      winner: scores.A > scores.B ? 'A' : scores.A < scores.B ? 'B' : 'draw',
    };
  }

  // 结束辩论
  private async endDebate(roomId: string) {
    const state = this.activeDebates.get(roomId);
    if (!state) return;

    state.status = 'completed';

    // 生成最终总结
    const history = state.history.map(h => `${h.position}方: ${h.content}`).join('\n\n');
    const summary = await this.generateSummary(state.topic, history);

    // 更新房间状态
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        metadata: {
          ...state,
          status: 'completed',
          summary,
        },
      },
    });

    this.activeDebates.delete(roomId);

    return {
      status: 'completed',
      rounds: state.currentRound,
      scores: state.scores,
      summary,
    };
  }

  // 生成总结
  private async generateSummary(topic: string, history: string) {
    const prompt = debatePrompts.summary(topic, history);
    const result = await this.llmService.sendMessage(
      'default', // 使用默认模型
      [],
      { systemPrompt: prompt, temperature: 0.5 }
    );
    return result.text;
  }

  // 获取辩论状态
  getDebateState(roomId: string) {
    return this.activeDebates.get(roomId);
  }
}
