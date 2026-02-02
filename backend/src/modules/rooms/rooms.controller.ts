import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, AddMemberDto, RoomResponse, MemberResponse } from './dto/room.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /**
   * 创建房间
   */
  @Post()
  async create(@Body() dto: CreateRoomDto, @Request() req: any): Promise<RoomResponse> {
    return this.roomsService.create(dto, req.user.id);
  }

  /**
   * 获取当前用户的所有房间
   */
  @Get()
  async findByUser(@Request() req: any): Promise<RoomResponse[]> {
    return this.roomsService.findByUser(req.user.id);
  }

  /**
   * 根据ID获取房间
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<RoomResponse> {
    return this.roomsService.findById(id);
  }

  /**
   * 获取房间成员列表
   */
  @Get(':id/members')
  async getMembers(@Param('id') id: string): Promise<MemberResponse[]> {
    return this.roomsService.getMembers(id);
  }

  /**
   * 更新房间信息
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @Request() req: any,
  ): Promise<RoomResponse> {
    return this.roomsService.update(id, dto, req.user.id);
  }

  /**
   * 添加房间成员
   */
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Request() req: any,
  ): Promise<MemberResponse> {
    return this.roomsService.addMember(id, dto, req.user.id);
  }

  /**
   * 离开房间
   */
  @Post(':id/leave')
  async leave(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.roomsService.leave(id, req.user.id);
  }

  /**
   * 删除房间成员（仅管理员/房主可删除其他成员）
   */
  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.roomsService.removeMember(id, memberId, req.user.id);
  }
}
