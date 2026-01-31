import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../providers/prisma.service';
import { LoginDto, RegisterDto, AuthResponse, UserResponse } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('该用户名已被使用');
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
      },
    });

    // 生成 JWT
    const accessToken = this.generateToken(user.id);

    return {
      user: this.formatUserResponse(user),
      accessToken,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查用户状态
    if (user.status !== 'active') {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成 JWT
    const accessToken = this.generateToken(user.id);

    return {
      user: this.formatUserResponse(user),
      accessToken,
    };
  }

  /**
   * 获取当前用户信息
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return this.formatUserResponse(user);
  }

  /**
   * 生成 JWT
   */
  private generateToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
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
