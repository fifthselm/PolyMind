import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { UpdateUserDto, UserResponse } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据ID获取用户
   */
  async findById(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.formatUserResponse(user);
  }

  /**
   * 根据邮箱获取用户
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 更新用户信息
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    return this.formatUserResponse(user);
  }

  /**
   * 格式化用户响应
   */
  private formatUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
