import { Test, TestingModule } from '@nestjs/testing';
import { AIModelsService } from './ai-models.service';
import { PrismaService } from '../../providers/prisma.service';

describe('AIModelsService', () => {
  let service: AIModelsService;
  let prisma: PrismaService;

  const mockPrisma = {
    aIModel: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIModelsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AIModelsService>(AIModelsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建新AI模型配置', async () => {
      const createDto = {
        name: 'GPT-4',
        provider: 'openai' as const,
        modelName: 'gpt-4',
        displayName: 'OpenAI GPT-4',
        apiKey: 'sk-xxx',
        systemPrompt: '你是一个有帮助的AI助手',
        temperature: 0.7,
        maxTokens: 4096,
      };

      const userId = 'user1';
      const createdModel = {
        id: '1',
        provider: createDto.provider,
        modelName: createDto.modelName,
        displayName: createDto.displayName,
        apiEndpoint: null,
        apiKeyEncrypted: createDto.apiKey,
        systemPrompt: createDto.systemPrompt,
        temperature: createDto.temperature,
        maxTokens: createDto.maxTokens,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.aIModel.create.mockResolvedValue(createdModel);

      const result = await service.create(createDto, userId);

      expect(result).toHaveProperty('id', '1');
      expect(result.provider).toBe('openai');
      expect(mockPrisma.aIModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: createDto.provider,
          modelName: createDto.modelName,
          createdById: userId,
        }),
      });
    });
  });

  describe('findById', () => {
    it('应该根据ID查找AI模型', async () => {
      const modelId = '1';
      const model = {
        id: modelId,
        provider: 'openai',
        modelName: 'gpt-4',
        displayName: 'GPT-4',
        apiEndpoint: null,
        apiKeyEncrypted: 'sk-xxx',
        systemPrompt: null,
        temperature: 0.7,
        maxTokens: 4096,
        isActive: true,
        createdById: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.aIModel.findUnique.mockResolvedValue(model);

      const result = await service.findById(modelId);

      expect(result).toHaveProperty('id', modelId);
      expect(mockPrisma.aIModel.findUnique).toHaveBeenCalledWith({
        where: { id: modelId },
      });
    });

    it('应该抛出异常当模型不存在', async () => {
      mockPrisma.aIModel.findUnique.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow('模型不存在');
    });
  });

  describe('findAll', () => {
    it('应该返回所有激活的AI模型', async () => {
      const models = [
        {
          id: '1',
          provider: 'openai',
          modelName: 'gpt-4',
          displayName: 'GPT-4',
          apiEndpoint: null,
          apiKeyEncrypted: 'sk-xxx',
          systemPrompt: null,
          temperature: 0.7,
          maxTokens: 4096,
          isActive: true,
          createdById: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.aIModel.findMany.mockResolvedValue(models);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('provider', 'openai');
      expect(mockPrisma.aIModel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('应该更新AI模型配置', async () => {
      const modelId = '1';
      const userId = 'user1';
      const updateDto = {
        temperature: 0.5,
        maxTokens: 8192,
      };

      const updatedModel = {
        id: modelId,
        provider: 'openai',
        modelName: 'gpt-4',
        displayName: 'GPT-4',
        apiEndpoint: null,
        apiKeyEncrypted: 'sk-xxx',
        systemPrompt: null,
        temperature: updateDto.temperature,
        maxTokens: updateDto.maxTokens,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.aIModel.findUnique.mockResolvedValue({ ...updatedModel, createdById: userId });
      mockPrisma.aIModel.update.mockResolvedValue(updatedModel);

      const result = await service.update(modelId, updateDto, userId);

      expect(result).toHaveProperty('temperature', 0.5);
      expect(mockPrisma.aIModel.update).toHaveBeenCalled();
    });

    it('应该拒绝修改他人创建的模型', async () => {
      const modelId = '1';
      const userId = 'user2';
      const updateDto = { temperature: 0.5 };

      mockPrisma.aIModel.findUnique.mockResolvedValue({
        id: modelId,
        createdById: 'user1', // 不同的创建者
      });

      await expect(service.update(modelId, updateDto, userId)).rejects.toThrow('只能修改自己创建的模型配置');
    });
  });

  describe('delete', () => {
    it('应该删除AI模型', async () => {
      const modelId = '1';
      const userId = 'user1';

      mockPrisma.aIModel.findUnique.mockResolvedValue({ id: modelId, createdById: userId });
      mockPrisma.aIModel.delete.mockResolvedValue({ id: modelId });

      await service.delete(modelId, userId);

      expect(mockPrisma.aIModel.delete).toHaveBeenCalledWith({
        where: { id: modelId },
      });
    });

    it('应该拒绝删除他人创建的模型', async () => {
      const modelId = '1';
      const userId = 'user2';

      mockPrisma.aIModel.findUnique.mockResolvedValue({
        id: modelId,
        createdById: 'user1',
      });

      await expect(service.delete(modelId, userId)).rejects.toThrow('只能删除自己创建的模型配置');
    });
  });
});
