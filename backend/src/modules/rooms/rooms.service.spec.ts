import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../providers/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: PrismaService;

  const mockPrisma = {
    chatRoom: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    roomMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createDto = {
      name: '测试房间',
      description: '这是一个测试房间',
      maxMembers: 50,
    };

    it('应该成功创建房间', async () => {
      const mockRoom = {
        id: 'room-123',
        name: createDto.name,
        description: createDto.description,
        createdById: userId,
        maxMembers: createDto.maxMembers,
        isPrivate: false,
        status: 'active',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.create.mockResolvedValue({
        id: 'member-id',
        roomId: mockRoom.id,
        userId,
        memberType: 'human',
        role: 'owner',
        joinedAt: new Date(),
      });

      const result = await service.create(createDto, userId);

      expect(result.name).toBe(createDto.name);
      expect(mockPrisma.chatRoom.create).toHaveBeenCalled();
    });

    it('应该使用默认值', async () => {
      const mockRoom = {
        id: 'room-123',
        name: '测试房间',
        createdById: userId,
        maxMembers: 50,
        isPrivate: false,
        status: 'active',
        members: [],
      };

      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.create.mockResolvedValue({});

      const result = await service.create({ name: '测试房间' }, userId);

      expect(result.maxMembers).toBe(50);
      expect(result.isPrivate).toBe(false);
    });
  });

  describe('findById', () => {
    it('应该返回房间详情', async () => {
      const mockRoom = {
        id: 'room-123',
        name: '测试房间',
        createdById: 'user-123',
        maxMembers: 50,
        isPrivate: false,
        status: 'active',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);

      const result = await service.findById('room-123');

      expect(result.id).toBe('room-123');
      expect(result.name).toBe('测试房间');
    });

    it('应该拒绝不存在的房间', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByUser', () => {
    it('应该返回用户所属房间', async () => {
      const userId = 'user-123';
      const mockMemberships = [
        {
          room: {
            id: 'room-1',
            name: '房间1',
            createdById: userId,
            maxMembers: 50,
            isPrivate: false,
            status: 'active',
            members: [],
          },
        },
        {
          room: {
            id: 'room-2',
            name: '房间2',
            createdById: userId,
            maxMembers: 50,
            isPrivate: false,
            status: 'active',
            members: [],
          },
        },
      ];

      mockPrisma.roomMember.findMany.mockResolvedValue(mockMemberships);

      const result = await service.findByUser(userId);

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const roomId = 'room-123';
    const updateDto = {
      name: '更新后的名称',
      description: '更新后的描述',
    };

    it('应该成功更新房间（所有者）', async () => {
      const mockMembership = {
        id: 'member-id',
        role: 'owner',
      };

      const mockRoom = {
        id: roomId,
        name: updateDto.name,
        description: updateDto.description,
        createdById: userId,
        maxMembers: 50,
        isPrivate: false,
        status: 'active',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);

      const result = await service.update(roomId, updateDto, userId);

      expect(result.name).toBe(updateDto.name);
    });

    it('应该拒绝非管理员更新房间', async () => {
      mockPrisma.roomMember.findFirst.mockResolvedValue(null);

      await expect(
        service.update(roomId, updateDto, 'other-user')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMember', () => {
    const userId = 'user-123';
    const roomId = 'room-123';
    const addDto = {
      memberType: 'ai' as const,
      aiModelId: 'ai-model-123',
      role: 'member' as const,
    };

    it('应该成功添加AI成员', async () => {
      const mockMembership = {
        id: 'member-id',
        role: 'admin',
      };

      const mockRoom = {
        id: roomId,
        _count: { members: 5 },
        maxMembers: 50,
      };

      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomMember.create.mockResolvedValue({
        id: 'new-member-id',
        roomId,
        aiModelId: addDto.aiModelId,
        memberType: 'ai',
        role: 'member',
        joinedAt: new Date(),
      });

      const result = await service.addMember(roomId, addDto, userId);

      expect(result.memberType).toBe('ai');
      expect(result.aiModelId).toBe(addDto.aiModelId);
    });

    it('应该拒绝房间已满时添加成员', async () => {
      const mockMembership = {
        id: 'member-id',
        role: 'owner',
      };

      const mockRoom = {
        id: roomId,
        _count: { members: 50 },
        maxMembers: 50,
      };

      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);

      await expect(service.addMember(roomId, addDto, userId)).rejects.toThrow();
    });
  });

  describe('leave', () => {
    const userId = 'user-123';
    const roomId = 'room-123';

    it('应该成功离开房间', async () => {
      const mockMembership = {
        id: 'member-id',
        role: 'member',
      };

      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.roomMember.delete.mockResolvedValue({});

      await service.leave(roomId, userId);

      expect(mockPrisma.roomMember.delete).toHaveBeenCalled();
    });

    it('应该拒绝房主直接离开', async () => {
      const mockMembership = {
        id: 'member-id',
        role: 'owner',
      };

      mockPrisma.roomMember.findFirst.mockResolvedValue(mockMembership);

      await expect(service.leave(roomId, userId)).rejects.toThrow();
    });
  });
});
