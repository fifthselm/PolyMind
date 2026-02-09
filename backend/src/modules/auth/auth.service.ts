import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../providers/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto, RegisterDto, AuthResponse, UserResponse, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      this.logger.log(`尝试注册用户: ${dto.email}`);

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
      this.logger.log('开始密码加密...');
      const passwordHash = await bcrypt.hash(dto.password, 12);
      this.logger.log('密码加密完成');

      // 创建用户
      this.logger.log('开始创建用户...');
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
        },
      });
      this.logger.log(`用户创建成功: ${user.id}`);

      // 生成 JWT
      const accessToken = this.generateToken(user.id);

      return {
        user: this.formatUserResponse(user),
        accessToken,
      };
    } catch (error) {
      this.logger.error(`注册失败: ${error.message}`, error.stack);
      throw error;
    }
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
  private formatUserResponse(user: {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl ?? undefined,
      status: user.status as 'active' | 'inactive' | 'banned',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 忘记密码 - 发送重置邮件
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      this.logger.log(`密码重置请求: ${dto.email}`);

      // 查找用户
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        // 为了安全，即使用户不存在也返回相同消息
        this.logger.warn(`密码重置请求: 用户不存在 ${dto.email}`);
        return { message: '如果该邮箱存在，重置密码邮件已发送' };
      }

      // 使旧token失效
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      // 生成随机token
      const token = randomBytes(32).toString('hex');

      // 创建新的重置token（1小时后过期）
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // 开发模式：直接控制台输出链接
      const isDevMode = process.env.MAIL_DEV_MODE === 'true';
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      
      if (isDevMode) {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║              🔑 密码重置链接（开发模式）               ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║ 用户: ${user.username.padEnd(45)} ║`);
        console.log(`║ 邮箱: ${user.email.padEnd(45)} ║`);
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║ 完整Token（64字符，请务必复制完整）:                   ║');
        console.log('║                                                        ║');
        console.log(token);
        console.log('║                                                        ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║ 重置链接（完整URL）:                                   ║');
        console.log(resetUrl);
        console.log('║                                                        ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║ ⚠️  重要：Token长度必须是64字符！                      ║');
        console.log('║     如果链接显示不完整，请直接复制上方完整Token        ║');
        console.log('║     然后手动构建URL:                                   ║');
        console.log(`║     http://localhost:5173/reset-password?token=[Token] ║`);
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║ 此链接1小时后过期                                      ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        
        this.logger.log(`[开发模式] 密码重置链接已生成: ${dto.email}`);
        this.logger.log(`[开发模式] Token: ${token}`);
        return { message: '重置链接已生成（请查看后端控制台）' };
      }
      
      // 生产模式：发送邮件
      await this.mailService.sendPasswordResetEmail(user.email, token, user.username);
      this.logger.log(`密码重置邮件已发送至: ${dto.email}`);
      return { message: '如果该邮箱存在，重置密码邮件已发送' };
    } catch (error) {
      this.logger.error(`忘记密码处理失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      this.logger.log('处理密码重置');
      this.logger.log(`收到Token: ${dto.token}`);
      this.logger.log(`Token长度: ${dto.token.length}`);

      // 查找有效的token
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token: dto.token },
        include: { user: true },
      });

      if (!resetToken) {
        this.logger.error(`Token未找到: ${dto.token.substring(0, 20)}...`);
        
        // 开发模式：检查token是否存在（不区分大小写）
        const allTokens = await this.prisma.passwordResetToken.findMany({
          where: { used: false },
          take: 5,
          orderBy: { createdAt: 'desc' },
        });
        this.logger.log(`数据库中未使用token数量: ${allTokens.length}`);
        allTokens.forEach((t, i) => {
          this.logger.log(`DB Token ${i}: ${t.token}`);
          this.logger.log(`  匹配? ${t.token === dto.token}`);
          this.logger.log(`  长度: ${t.token.length} vs ${dto.token.length}`);
        });
        throw new BadRequestException('无效或已过期的重置令牌');
      }

      this.logger.log(`找到token: userId=${resetToken.userId}, used=${resetToken.used}, expires=${resetToken.expiresAt}`);

      if (resetToken.used) {
        throw new BadRequestException('该重置链接已使用');
      }

      if (resetToken.expiresAt < new Date()) {
        throw new BadRequestException('重置链接已过期');
      }

      // 加密新密码
      const passwordHash = await bcrypt.hash(dto.password, 12);

      // 更新用户密码
      await this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      // 标记token为已使用
      await this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      // 发送成功通知
      await this.mailService.sendPasswordResetSuccessEmail(
        resetToken.user.email,
        resetToken.user.username,
      );

      this.logger.log(`密码重置成功: ${resetToken.user.email}`);
      return { message: '密码重置成功' };
    } catch (error) {
      this.logger.error(`密码重置失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
