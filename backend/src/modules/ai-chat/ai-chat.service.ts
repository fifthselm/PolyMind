import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { GatewayGateway } from '../websocket/gateway.gateway';
import { LLMMessage, StreamingCallbacks } from '../../providers/llm/base/types';

interface ChatContext {
  roomId: string;
  aiModelId: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  // 最大上下文消息数
  private readonly MAX_CONTEXT_MESSAGES = 20;

  // Token限制（保守估计）
  private readonly MAX_TOKENS = 8000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly gateway: GatewayGateway,
  ) {}

  /**
   * 处理AI聊天请求
   */
  async processAIChat(
    roomId: string,
    userMessage: string,
    userId: string,
    mentions: string[] = [],
  ): Promise<void> {
    // 获取房间内的所有AI模型
    const aiMembers = await this.prisma.roomMember.findMany({
      where: {
        roomId,
        memberType: 'ai',
      },
      include: {
        aiModel: true,
      },
    });

    // 并行调用所有AI模型
    const promises = aiMembers.map(async (member) => {
      if (member.aiModel) {
        await this.processSingleAI(
          roomId,
          member.aiModel,
          userMessage,
          userId,
          mentions,
        );
      }
    });

    await Promise.all(promises);
  }

  /**
   * 处理单个AI模型的响应
   */
  async processSingleAI(
    roomId: string,
    aiModel: any,
    userMessage: string,
    userId: string,
    mentions: string[] = [],
  ): Promise<void> {
    try {
      // 获取对话上下文
      const context = await this.getContext(roomId, aiModel.id, aiModel.systemPrompt);

      // 构建消息
      const messages: LLMMessage[] = context.messages.map(msg => ({
        role: msg.role as any,
        content: msg.content,
      }));

      // 添加用户消息
      messages.push({ role: 'user', content: userMessage });

      // 创建AI消息（初始状态）
      const aiMessage = await this.prisma.message.create({
        data: {
          roomId,
          senderType: 'ai',
          senderAiModelId: aiModel.id,
          content: '',
          mentions,
        },
        include: {
          senderAiModel: true,
        },
      });

      // 广播空消息表示AI正在生成
      this.gateway.server.to(roomId).emit('message:ai:streaming', {
        messageId: aiMessage.id,
        aiModelId: aiModel.id,
        aiModelName: aiModel.displayName,
        isTyping: true,
      });

      // 流式调用AI
      const callbacks: StreamingCallbacks = {
        onChunk: (chunk) => {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // 增量更新消息
            this.gateway.server.to(roomId).emit('message:ai:streaming', {
              messageId: aiMessage.id,
              aiModelId: aiModel.id,
              chunk: content,
              isTyping: true,
            });
          }
        },
        onComplete: async (fullContent) => {
          // 更新消息内容
          await this.prisma.message.update({
            where: { id: aiMessage.id },
            data: { content: fullContent },
          });

          // 广播完成
          this.gateway.server.to(roomId).emit('message:ai:complete', {
            messageId: aiMessage.id,
            aiModelId: aiModel.id,
            content: fullContent,
          });

          // 保存上下文
          await this.saveContext(roomId, aiModel.id, messages, fullContent);
        },
        onError: async (error) => {
          this.logger.error(`AI响应错误: ${error.message}`);

          // 更新消息为错误状态
          await this.prisma.message.update({
            where: { id: aiMessage.id },
            data: { content: '抱歉，我遇到了一些问题。' },
          });

          // 广播错误
          this.gateway.server.to(roomId).emit('message:ai:error', {
            messageId: aiMessage.id,
            aiModelId: aiModel.id,
            error: error.message,
          });
        },
      };

      await this.llmService.streamMessage(
        aiModel.provider,
        {
          model: aiModel.modelName,
          messages,
          temperature: aiModel.temperature,
          maxTokens: aiModel.maxTokens,
        },
        callbacks
      );

    } catch (error) {
      this.logger.error(`AI聊天处理失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取对话上下文
   */
  private async getContext(
    roomId: string,
    aiModelId: string,
    systemPrompt?: string,
  ): Promise<ChatContext> {
    // 先尝试从数据库获取保存的上下文
    let savedContext = await this.prisma.aiConversationContext.findUnique({
      where: {
        roomId_aiModelId: { roomId, aiModelId },
      },
    });

    let messages: Array<{ role: string; content: string }> = [];

    if (savedContext) {
      messages = (savedContext.contextMessages as any) || [];
    } else {
      // 获取最近的对话历史
      const recentMessages = await this.prisma.message.findMany({
        where: {
          roomId,
          isDeleted: false,
          senderType: { in: ['human', 'ai'] },
        },
        orderBy: { createdAt: 'desc' },
        take: this.MAX_CONTEXT_MESSAGES,
      });

      // 反转并构建上下文
      messages = recentMessages.reverse().map(msg => ({
        role: msg.senderType as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));
    }

    return {
      roomId,
      aiModelId,
      messages,
      systemPrompt,
    };
  }

  /**
   * 保存对话上下文
   */
  private async saveContext(
    roomId: string,
    aiModelId: string,
    messages: LLMMessage[],
    lastResponse: string,
  ): Promise<void> {
    // 添加AI响应到上下文
    const allMessages: LLMMessage[] = [
      ...messages,
      { role: 'assistant', content: lastResponse },
    ];

    // 检查是否需要摘要
    if (this.estimateTokenCount(allMessages) > this.MAX_TOKENS) {
      // TODO: 实现摘要逻辑
      // 保留最近的N条消息
      allMessages.splice(0, allMessages.length - this.MAX_CONTEXT_MESSAGES);
    }

    // 将LLMMessage转换为纯JSON对象
    const contextMessagesJson = JSON.parse(JSON.stringify(allMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
    }))));

    await this.prisma.aiConversationContext.upsert({
      where: {
        roomId_aiModelId: { roomId, aiModelId },
      },
      create: {
        roomId,
        aiModelId,
        contextMessages: contextMessagesJson,
        tokenCount: this.estimateTokenCount(allMessages),
      },
      update: {
        contextMessages: contextMessagesJson,
        tokenCount: this.estimateTokenCount(allMessages),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 估算token数量
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * 重置AI对话上下文
   */
  async resetContext(roomId: string, aiModelId: string): Promise<void> {
    await this.prisma.aiConversationContext.delete({
      where: {
        roomId_aiModelId: { roomId, aiModelId },
      },
    });
  }

  /**
   * 批量处理多个AI模型
   */
  async broadcastToAIs(
    roomId: string,
    userMessage: string,
    userId: string,
    aiModelIds: string[],
  ): Promise<void> {
    const promises = aiModelIds.map(async (aiModelId) => {
      const aiModel = await this.prisma.aIModel.findUnique({
        where: { id: aiModelId },
      });

      if (aiModel) {
        await this.processSingleAI(roomId, aiModel, userMessage, userId);
      }
    });

    await Promise.all(promises);
  }
}
