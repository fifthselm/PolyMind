import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../../providers/prisma.service';
import { GatewayGateway } from '../websocket/gateway.gateway';
import { AIChatService } from '../ai-chat/ai-chat.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;

  const mockPrisma = {
    roomMember: {
      findFirst: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockGateway = {
    server: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    },
  };

  const mockAIChatService = {
    processAIChat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: GatewayGateway,
          useValue: mockGateway,
        },
        {
          provide: AIChatService,
          useValue: mockAIChatService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('send', () => {
    const roomId = 'room-123';
    const senderId = 'user-123';
    const sendDto = {
      content: 'Hello, World!',
      contentType: 'text' as const,
    };

    it('应该成功发送消息', async () => {
      const mockMembership = {
        id: 'membership-id',
        memberType: 'human' as const,
      };

      const mockMessage = {
        id: 'message-id',
        roomId,
        senderType: 'human' as const,
        senderUserId: senderId,
        content: sendDto.content,
        contentType: 'text' as const,
        mentions: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        senderUser: null,
        senderAiModel: null,
        replyTo: null,
      };

      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await service.send(roomId, sendDto, 'human', senderId);

      expect(result.content).toBe(sendDto.content);
      expect(result.roomId).toBe(roomId);
      expect(mockPrisma.message.create).toHaveBeenCalled();
    });

    it('应该拒绝非房间成员发送消息', async () => {
      mockPrisma.roomMember.findFirst.mockResolvedValue(null);

      await expect(
        service.send(roomId, sendDto, 'human', senderId)
      ).rejects.toThrow();
    });
  });

  describe('getHistory', () => {
    it('应该返回消息历史', async () => {
      const roomId = 'room-123';
      const mockMessages = [
        { id: 'msg-1', roomId, content: 'Hello', createdAt: new Date(), mentions: [], isDeleted: false },
        { id: 'msg-2', roomId, content: 'World', createdAt: new Date(), mentions: [], isDeleted: false },
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.count.mockResolvedValue(2);

      const result = await service.getHistory(roomId, 1, 50);

      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('应该支持分页', async () => {
      const roomId = 'room-123';
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(0);

      await service.getHistory(roomId, 2, 20);

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });
  });

  describe('edit', () => {
    const userId = 'user-123';
    const messageId = 'message-123';
    const roomId = 'room-123';
    const newContent = '编辑后的内容';

    it('应该成功编辑消息', async () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 1000 * 60 * 30);
      const mockMessage = {
        id: messageId,
        roomId,
        senderUserId: userId,
        isDeleted: false,
        createdAt: thirtyMinutesAgo,
        senderType: 'human' as const,
        content: '原始内容',
        contentType: 'text' as const,
        mentions: [],
        updatedAt: now,
        senderUser: null,
        senderAiModel: null,
        replyTo: null,
      };

      const updatedMessage = {
        ...mockMessage,
        content: newContent,
        updatedAt: new Date(),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue(updatedMessage);

      const result = await service.edit(messageId, newContent, userId);

      expect(result.content).toBe(newContent);
    });

    it('应该拒绝编辑他人的消息', async () => {
      const roomId = 'room-123';
      const mockMessage = {
        id: messageId,
        roomId,
        senderUserId: 'other-user',
        isDeleted: false,
        createdAt: new Date(),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      await expect(service.edit(messageId, newContent, userId)).rejects.toThrow();
    });

    it('应该拒绝编辑超过1小时的消息', async () => {
      const roomId = 'room-123';
      const mockMessage = {
        id: messageId,
        roomId,
        senderUserId: userId,
        isDeleted: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 70), // 70分钟前
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      await expect(service.edit(messageId, newContent, userId)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    const userId = 'user-123';
    const messageId = 'message-123';
    const roomId = 'room-123';

    it('应该成功删除消息（软删除）', async () => {
      const mockMessage = {
        id: messageId,
        roomId,
        senderUserId: userId,
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
      });

      await service.delete(messageId, userId);

      expect(mockPrisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: messageId },
          data: { isDeleted: true },
        })
      );
    });
  });
});
