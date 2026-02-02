import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { AIChatService } from '../ai-chat/ai-chat.service';
import { GatewayGateway } from '../websocket/gateway.gateway';
import { SendMessageDto, MessageResponse } from './dto/message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiChatService: AIChatService,
    private readonly gateway: GatewayGateway,
  ) {}

  /**
   * 发送消息
   */
  async send(roomId: string, dto: SendMessageDto, senderType: string, senderId: string): Promise<MessageResponse> {
    // 验证成员身份
    const membership = await this.prisma.roomMember.findFirst({
      where: {
        roomId,
        OR: [
          { userId: senderId },
          { aiModelId: senderId },
        ],
      },
    });

    if (!membership) {
      throw new ForbiddenException('你不是该房间成员');
    }

    const message = await this.prisma.message.create({
      data: {
        roomId,
        senderType: membership.memberType as 'human' | 'ai',
        senderUserId: membership.memberType === 'human' ? senderId : undefined,
        senderAiModelId: membership.memberType === 'ai' ? senderId : undefined,
        content: dto.content,
        contentType: dto.contentType || 'text',
        replyToId: dto.replyToId,
        mentions: dto.mentions || [],
        metadata: dto.metadata,
      },
      include: {
        senderUser: true,
        senderAiModel: true,
        replyTo: true,
      },
    });

    // 广播新消息
    const formattedMessage = this.formatMessageResponse(message);
    this.gateway.server.to(roomId).emit('message:new', formattedMessage);

    // 如果是人类用户发送的消息，检查是否有AI成员需要响应
    if (membership.memberType === 'human') {
      this.triggerAIResponses(roomId, dto.content, senderId, dto.mentions || [], dto.mode);
    }

    return formattedMessage;
  }

  /**
   * 触发AI响应
   */
  private async triggerAIResponses(
    roomId: string,
    userMessage: string,
    userId: string,
    mentions: string[],
    mode: 'normal' | 'search' | 'deep_think' = 'normal',
  ): Promise<void> {
    try {
      // 异步处理AI响应，不阻塞消息发送
      this.aiChatService.processAIChat(roomId, userMessage, userId, mentions, mode);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI响应触发失败: ${errorMessage}`);
    }
  }

  /**
   * 获取房间消息历史
   */
  async getHistory(
    roomId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: MessageResponse[]; total: number }> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          roomId,
          isDeleted: false,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          senderUser: true,
          senderAiModel: true,
          replyTo: true,
        },
      }),
      this.prisma.message.count({
        where: {
          roomId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      messages: messages.map((m) => this.formatMessageResponse(m)).reverse(),
      total,
    };
  }

  /**
   * 编辑消息
   */
  async edit(messageId: string, content: string, userId: string): Promise<MessageResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.senderUserId !== userId) {
      throw new ForbiddenException('只能编辑自己发送的消息');
    }

    if (message.isDeleted) {
      throw new NotFoundException('消息已被删除');
    }

    // 只能编辑1小时内的消息
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (message.createdAt < oneHourAgo) {
      throw new ForbiddenException('消息已超过1小时，无法编辑');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        senderUser: true,
        senderAiModel: true,
        replyTo: true,
      },
    });

    // 广播编辑事件
    this.gateway.server.to(message.roomId).emit('message:edited', {
      messageId,
      content,
      updatedAt: updated.updatedAt,
    });

    return this.formatMessageResponse(updated);
  }

  /**
   * 删除消息（软删除）
   */
  async delete(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.senderUserId !== userId) {
      throw new ForbiddenException('只能删除自己发送的消息');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    // 广播删除事件
    this.gateway.server.to(message.roomId).emit('message:deleted', {
      messageId,
      deletedAt: new Date(),
    });
  }

  /**
   * 格式化消息响应
   */
  private formatMessageResponse(message: {
    id: string;
    roomId: string;
    senderType: string;
    senderUserId?: string | null;
    senderAiModelId?: string | null;
    content: string;
    contentType: string;
    replyToId?: string | null;
    mentions?: string[];
    metadata?: unknown;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    senderUser?: { id: string; username: string; avatarUrl?: string | null } | null;
    senderAiModel?: { id: string; displayName: string } | null;
    replyTo?: { id: string; content: string; senderUserId?: string | null } | null;
  }): MessageResponse {
    return {
      id: message.id,
      roomId: message.roomId,
      senderType: message.senderType as 'human' | 'ai',
      senderUserId: message.senderUserId ?? undefined,
      senderAiModelId: message.senderAiModelId ?? undefined,
      content: message.content,
      contentType: message.contentType as 'text' | 'image' | 'file',
      replyToId: message.replyToId ?? undefined,
      mentions: message.mentions ?? [],
      metadata: message.metadata as Record<string, unknown> | undefined,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.senderUser ? {
        id: message.senderUser.id,
        username: message.senderUser.username,
        avatarUrl: message.senderUser.avatarUrl ?? undefined,
      } : message.senderAiModel ? {
        id: message.senderAiModel.id,
        username: message.senderAiModel.displayName,
        avatarUrl: undefined,
      } : undefined,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderUserId: message.replyTo.senderUserId ?? undefined,
      } : undefined,
    };
  }
}
