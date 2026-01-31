import { Test, TestingModule } from '@nestjs/testing';
import { AIChatService } from './ai-chat.service';
import { PrismaService } from '../../providers/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { GatewayGateway } from '../websocket/gateway.gateway';

describe('AIChatService', () => {
  let service: AIChatService;
  let prisma: PrismaService;
  let llmService: LLMService;
  let gateway: GatewayGateway;

  const mockPrisma = {
    roomMember: {
      findMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    aiConversationContext: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockLLMService = {
    streamMessage: jest.fn(),
  };

  const mockGateway = {
    server: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIChatService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: LLMService,
          useValue: mockLLMService,
        },
        {
          provide: GatewayGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<AIChatService>(AIChatService);
    prisma = module.get<PrismaService>(PrismaService);
    llmService = module.get<LLMService>(LLMService);
    gateway = module.get<GatewayGateway>(GatewayGateway);

    jest.clearAllMocks();
  });

  describe('resetContext', () => {
    it('应该删除AI对话上下文', async () => {
      const roomId = 'room1';
      const aiModelId = 'model1';

      mockPrisma.aiConversationContext.delete.mockResolvedValue({});

      await service.resetContext(roomId, aiModelId);

      expect(mockPrisma.aiConversationContext.delete).toHaveBeenCalledWith({
        where: {
          roomId_aiModelId: { roomId, aiModelId },
        },
      });
    });
  });

  describe('estimateTokenCount', () => {
    it('应该正确估算token数量', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'system', content: 'You are a helpful assistant' },
      ];

      // 预期：总字符数 = 5 + 8 + 29 = 42，token数 ≈ 11 (42/4)
      const result = (service as any).estimateTokenCount(messages);

      expect(result).toBe(11);
    });

    it('应该处理空消息数组', () => {
      const result = (service as any).estimateTokenCount([]);

      expect(result).toBe(0);
    });

    it('应该处理长消息', () => {
      const longMessage = 'A'.repeat(1000);
      const messages = [{ role: 'user', content: longMessage }];

      const result = (service as any).estimateTokenCount(messages);

      expect(result).toBe(250); // 1000/4 = 250
    });
  });

  describe('processAIChat', () => {
    it('应该处理AI聊天请求', async () => {
      const roomId = 'room1';
      const userMessage = 'Hello AI!';
      const userId = 'user1';

      const aiMembers = [
        {
          id: 'member1',
          roomId,
          memberType: 'ai',
          aiModel: {
            id: 'model1',
            provider: 'openai',
            modelName: 'gpt-4',
            displayName: 'GPT-4',
            systemPrompt: 'You are helpful',
            temperature: 0.7,
            maxTokens: 4096,
          },
        },
      ];

      mockPrisma.roomMember.findMany.mockResolvedValue(aiMembers);
      mockPrisma.aiConversationContext.findUnique.mockResolvedValue(null);
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg1',
        roomId,
        senderType: 'ai',
        senderAiModelId: 'model1',
        content: '',
        mentions: [],
        senderAiModel: aiMembers[0].aiModel,
      });
      mockLLMService.streamMessage.mockImplementation((provider, options, callbacks) => {
        callbacks.onComplete('AI response');
        return Promise.resolve();
      });

      await service.processAIChat(roomId, userMessage, userId);

      expect(mockPrisma.roomMember.findMany).toHaveBeenCalledWith({
        where: { roomId, memberType: 'ai' },
        include: { aiModel: true },
      });
    });

    it('应该跳过无效的AI成员', async () => {
      const roomId = 'room1';
      const userMessage = 'Hello AI!';
      const userId = 'user1';

      const aiMembers = [
        {
          id: 'member1',
          roomId,
          memberType: 'ai',
          aiModel: null, // 无效的AI模型
        },
      ];

      mockPrisma.roomMember.findMany.mockResolvedValue(aiMembers);

      await service.processAIChat(roomId, userMessage, userId);

      expect(mockLLMService.streamMessage).not.toHaveBeenCalled();
    });
  });

  describe('getContext', () => {
    it('应该从数据库获取保存的上下文', async () => {
      const roomId = 'room1';
      const aiModelId = 'model1';
      const systemPrompt = 'You are helpful';

      const savedContext = {
        roomId,
        aiModelId,
        contextMessages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ],
        tokenCount: 10,
      };

      mockPrisma.aiConversationContext.findUnique.mockResolvedValue(savedContext);

      const result = await (service as any).getContext(roomId, aiModelId, systemPrompt);

      expect(result.roomId).toBe(roomId);
      expect(result.aiModelId).toBe(aiModelId);
      expect(result.messages).toEqual(savedContext.contextMessages);
      expect(result.systemPrompt).toBe(systemPrompt);
    });

    it('应该从消息历史获取上下文', async () => {
      const roomId = 'room1';
      const aiModelId = 'model1';
      const systemPrompt = 'You are helpful';

      const recentMessages = [
        {
          id: 'msg1',
          roomId,
          senderType: 'user',
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          id: 'msg2',
          roomId,
          senderType: 'ai',
          content: 'Hi',
          createdAt: new Date(),
        },
      ];

      mockPrisma.aiConversationContext.findUnique.mockResolvedValue(null);
      mockPrisma.message.findMany.mockResolvedValue(recentMessages);

      const result = await (service as any).getContext(roomId, aiModelId, systemPrompt);

      expect(result.messages).toHaveLength(2);
      // 消息历史会被反转，所以原来的第一条变成最后一条
      expect(result.messages[0].role).toBe('ai');
      expect(result.messages[1].role).toBe('user');
    });
  });
});
