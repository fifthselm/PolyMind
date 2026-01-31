import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { CreateRoomDto, UpdateRoomDto, RoomResponse, AddMemberDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
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

    return memberships.map((m) => this.formatRoomResponse(m.room));
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
  async addMember(id: string, dto: AddMemberDto, userId: string): Promise<any> {
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

    // 创建成员
    const member = await this.prisma.roomMember.create({
      data: {
        roomId: id,
        userId: dto.userId,
        aiModelId: dto.aiModelId,
        memberType: dto.memberType,
        role: dto.role || 'member',
      },
      include: {
        user: true,
        aiModel: true,
      },
    });

    return member;
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
   * 格式化房间响应
   */
  private formatRoomResponse(room: any): RoomResponse {
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      createdBy: room.createdById,
      maxMembers: room.maxMembers,
      isPrivate: room.isPrivate,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      members: room.members?.map((m: any) => ({
        id: m.id,
        roomId: m.roomId,
        userId: m.userId,
        aiModelId: m.aiModelId,
        memberType: m.memberType,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user ? {
          id: m.user.id,
          username: m.user.username,
          avatarUrl: m.user.avatarUrl,
        } : undefined,
        aiModel: m.aiModel ? {
          id: m.aiModel.id,
          displayName: m.aiModel.displayName,
          provider: m.aiModel.provider,
        } : undefined,
      })),
    };
  }
}
