import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma.service';
import { randomBytes } from 'crypto';

@Controller('test')
export class TestController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 快速生成测试用的重置token（用于开发调试）
   */
  @Post('quick-reset/:email')
  async quickReset(@Param('email') email: string) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: '用户不存在', email };
    }

    // 使旧token失效
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // 生成token
    const token = randomBytes(32).toString('hex');
    
    // 保存到数据库
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

    return {
      success: true,
      email: user.email,
      username: user.username,
      token,
      resetUrl,
      message: 'Token已生成，请使用下方链接重置密码',
    };
  }

  /**
   * 验证token是否存在
   */
  @Get('check-token/:token')
  async checkToken(@Param('token') token: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      // 查找最近的所有token
      const recentTokens = await this.prisma.passwordResetToken.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });

      return {
        exists: false,
        searchedToken: token,
        recentTokens: recentTokens.map(t => ({
          id: t.id,
          tokenPrefix: t.token.substring(0, 20) + '...',
          tokenLength: t.token.length,
          used: t.used,
          expiresAt: t.expiresAt,
          userEmail: t.user?.email,
        })),
      };
    }

    return {
      exists: true,
      used: resetToken.used,
      expired: resetToken.expiresAt < new Date(),
      expiresAt: resetToken.expiresAt,
      user: {
        email: resetToken.user.email,
        username: resetToken.user.username,
      },
    };
  }
}
