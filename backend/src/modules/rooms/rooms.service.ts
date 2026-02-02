import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { CreateRoomDto, UpdateRoomDto, RoomResponse, AddMemberDto, MemberResponse } from './dto/room.dto';

// 类型定义 - 替换 any 类型
interface RoomWithMembers {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  maxMembers: number;
  isPrivate: boolean;
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  members?: Array<{
    id: string;
    roomId: string;
    userId: string | null;
    aiModelId: string | null;
    memberType: 'human' | 'ai';
    role: 'owner' | 'admin' | 'member';
    aiPrompt: string | null;
    joinedAt: Date;
    user?: {
      id: string;
      username: string;
      avatarUrl: string | null;
    } | null;
    aiModel?: {
      id: string;
      displayName: string;
      provider: string;
    } | null;
  }>;
}

interface MembershipWithRoom {
  room: RoomWithMembers;
}

interface MemberWithRelations {
  id: string;
  roomId: string;
  userId: string | null;
  aiModelId: string | null;
  memberType: 'human' | 'ai';
  role: 'owner' | 'admin' | 'member';
  aiPrompt: string | null;
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  aiModel?: {
    id: string;
    displayName: string;
    provider: string;
  } | null;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建房间
   */
  async create(dto: CreateRoomDto, userId: string): Promise<RoomResponse> {
    const room = await this.prisma.chatRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdById: userId,
        maxMembers: dto.maxMembers || 50,
        isPrivate: dto.isPrivate || false,
      },
    });

    // 创建者自动成为房间成员
    await this.prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: userId,
        memberType: 'human',
        role: 'owner',
      },
    });

    return this.findById(room.id);
  }

  /**
   * 根据ID获取房间
   */
  async findById(id: string): Promise<RoomResponse> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
            aiModel: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('房间不存在');
    }

    return this.formatRoomResponse(room);
  }

  /**
   * 获取用户的所有房间
   */
  async findByUser(userId: string): Promise<RoomResponse[]> {
    const memberships = await this.prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: true,
          },
        },
      },
    });

    return memberships.map((m: MembershipWithRoom) => this.formatRoomResponse(m.room));
  }

  /**
   * 更新房间信息
   */
  async update(id: string, dto: UpdateRoomDto, userId: string): Promise<RoomResponse> {
    // 检查权限
    const membership = await this.prisma.roomMember.findFirst({
      where: {
        roomId: id,
        userId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('无权修改此房间');
    }

    const room = await this.prisma.chatRoom.update({
      where: { id },
      data: dto,
    });

    return this.findById(room.id);
  }

  /**
   * 添加房间成员
   */
  async addMember(id: string, dto: AddMemberDto, userId: string): Promise<MemberResponse> {
    // 检查权限
    const membership = await this.prisma.roomMember.findFirst({
      where: {
        roomId: id,
        userId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('无权添加成员');
    }

    // 检查房间成员数
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!room) {
      throw new BadRequestException('房间不存在');
    }

    if (room._count.members >= room.maxMembers) {
      throw new BadRequestException('房间成员已满');
    }

    // 检查成员是否已存在（AI模型唯一性）
    if (dto.memberType === 'ai' && dto.aiModelId) {
      const existingAiMember = await this.prisma.roomMember.findUnique({
        where: {
          roomId_aiModelId: {
            roomId: id,
            aiModelId: dto.aiModelId,
          },
        },
      });

      if (existingAiMember) {
        throw new ConflictException('该AI模型已在此房间中');
      }
    }

    // 检查用户是否已在房间中
    if (dto.memberType === 'human' && dto.userId) {
      const existingHumanMember = await this.prisma.roomMember.findFirst({
        where: {
          roomId: id,
          userId: dto.userId,
        },
      });

      if (existingHumanMember) {
        throw new ConflictException('该用户已在房间中');
      }
    }

    // 创建成员
    const member = await this.prisma.roomMember.create({
      data: {
        roomId: id,
        userId: dto.userId,
        aiModelId: dto.aiModelId,
        memberType: dto.memberType,
        role: dto.role || 'member',
        aiPrompt: dto.aiPrompt,
      },
      include: {
        user: true,
        aiModel: true,
      },
    });

    // 手动转换类型以匹配 MemberResponse
    return {
      id: member.id,
      roomId: member.roomId,
      userId: member.userId ?? undefined,
      aiModelId: member.aiModelId ?? undefined,
      memberType: member.memberType,
      role: member.role,
      aiPrompt: member.aiPrompt ?? undefined,
      joinedAt: member.joinedAt,
      user: member.user
        ? {
            id: member.user.id,
            username: member.user.username,
            avatarUrl: member.user.avatarUrl ?? undefined,
          }
        : undefined,
      aiModel: member.aiModel
        ? {
            id: member.aiModel.id,
            displayName: member.aiModel.displayName,
            provider: member.aiModel.provider,
          }
        : undefined,
    };
  }

  /**
   * 获取房间成员列表
   * @param roomId 房间ID
   * @returns 成员列表
   */
  async getMembers(roomId: string): Promise<MemberResponse[]> {
    // 检查房间是否存在
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('房间不存在');
    }

    // 获取成员列表
    const members = await this.prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: true,
        aiModel: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId ?? undefined,
      aiModelId: m.aiModelId ?? undefined,
      memberType: m.memberType,
      role: m.role,
      aiPrompt: m.aiPrompt ?? undefined,
      joinedAt: m.joinedAt,
      user: m.user
        ? {
            id: m.user.id,
            username: m.user.username,
            avatarUrl: m.user.avatarUrl ?? undefined,
          }
        : undefined,
      aiModel: m.aiModel
        ? {
            id: m.aiModel.id,
            displayName: m.aiModel.displayName,
            provider: m.aiModel.provider,
          }
        : undefined,
    }));
  }

  /**
   * 离开房间
   */
  async leave(id: string, userId: string): Promise<void> {
    const membership = await this.prisma.roomMember.findFirst({
      where: {
        roomId: id,
        userId,
        memberType: 'human',
      },
    });

    if (!membership) {
      throw new NotFoundException('你不是该房间成员');
    }

    // 房主不能直接离开，需要先转移所有权或删除房间
    if (membership.role === 'owner') {
      throw new BadRequestException('房主不能直接离开，请先转移所有权或删除房间');
    }

    await this.prisma.roomMember.delete({
      where: { id: membership.id },
    });
  }

  /**
   * 删除房间成员（管理员/房主可操作）
   */
  async removeMember(id: string, memberId: string, userId: string): Promise<void> {
    // 检查房间是否存在
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('房间不存在');
    }

    // 检查操作者权限
    const operatorMembership = await this.prisma.roomMember.findFirst({
      where: {
        roomId: id,
        userId,
        memberType: 'human',
      },
    });

    if (!operatorMembership) {
      throw new ForbiddenException('无权操作');
    }

    // 只有房主和管理员可以删除成员
    if (operatorMembership.role !== 'owner' && operatorMembership.role !== 'admin') {
      throw new ForbiddenException('只有房主和管理员可以删除成员');
    }

    // 查找要删除的成员
    const targetMember = await this.prisma.roomMember.findFirst({
      where: {
        id: memberId,
        roomId: id,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('成员不存在');
    }

    // 不能删除房主
    if (targetMember.role === 'owner') {
      throw new BadRequestException('不能删除房主');
    }

    // 管理员不能删除其他管理员
    if (targetMember.role === 'admin' && operatorMembership.role !== 'owner') {
      throw new ForbiddenException('只有房主可以删除管理员');
    }

    // 删除成员
    await this.prisma.roomMember.delete({
      where: { id: memberId },
    });

    this.logger.log(`成员 ${memberId} 已从房间 ${id} 被 ${userId} 删除`);
  }

  /**
   * 格式化房间响应
   */
  private formatRoomResponse(room: RoomWithMembers): RoomResponse {
    return {
      id: room.id,
      name: room.name,
      description: room.description ?? undefined,
      createdBy: room.createdById,
      maxMembers: room.maxMembers,
      isPrivate: room.isPrivate,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      members: room.members?.map((m: MemberWithRelations) => ({
        id: m.id,
        roomId: m.roomId,
        userId: m.userId ?? undefined,
        aiModelId: m.aiModelId ?? undefined,
        memberType: m.memberType,
        role: m.role,
        aiPrompt: m.aiPrompt ?? undefined,
        joinedAt: m.joinedAt,
        user: m.user
          ? {
              id: m.user.id,
              username: m.user.username,
              avatarUrl: m.user.avatarUrl ?? undefined,
            }
          : undefined,
        aiModel: m.aiModel
          ? {
              id: m.aiModel.id,
              displayName: m.aiModel.displayName,
              provider: m.aiModel.provider,
            }
          : undefined,
      })),
    };
  }
}
