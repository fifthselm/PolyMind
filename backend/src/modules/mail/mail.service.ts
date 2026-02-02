import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * 开发模式：在控制台输出重置链接
   */
  private logDevModeResetLink(email: string, resetToken: string, username: string): void {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              🔑 密码重置令牌（开发模式）               ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ 用户: ${username.padEnd(45)} ║`);
    console.log(`║ 邮箱: ${email.padEnd(45)} ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 重置链接（点击或复制到浏览器）:                        ║');
    console.log('║                                                        ║');
    console.log(`║ ${resetUrl.substring(0, 54).padEnd(54)} ║`);
    if (resetUrl.length > 54) {
      console.log(`║ ${resetUrl.substring(54).padEnd(54)} ║`);
    }
    console.log('║                                                        ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 此链接1小时后过期                                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string, resetToken: string, username: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const isDevMode = process.env.MAIL_DEV_MODE === 'true';

    // 开发模式：只在控制台输出
    if (isDevMode) {
      this.logDevModeResetLink(email, resetToken, username);
      this.logger.log(`[开发模式] 密码重置令牌已生成: ${email}`);
      return;
    }

    // 检查邮件配置
    if (!process.env.MAIL_HOST || !process.env.MAIL_USER) {
      this.logger.warn('邮件服务未配置，切换到开发模式输出');
      this.logDevModeResetLink(email, resetToken, username);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'PolyMind - 密码重置',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">密码重置</h2>
            <p>您好 ${username},</p>
            <p>我们收到了您的密码重置请求。请点击下方链接重置密码：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                重置密码
              </a>
            </div>
            <p>或者复制以下链接到浏览器：</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件。
            </p>
          </div>
        `,
      });

      this.logger.log(`密码重置邮件已发送至: ${email}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`发送邮件失败: ${errorMsg}`);
      
      // 发送失败时，提供开发模式备用方案
      if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNREFUSED')) {
        this.logger.warn('邮件服务器连接失败，提供备用重置链接：');
        this.logDevModeResetLink(email, resetToken, username);
        
        // 仍然抛出错误，但提供了备用方案
        throw new Error(`邮件发送失败（网络超时），请查看上方控制台输出的重置链接，或检查邮件配置`);
      }
      
      throw error;
    }
  }

  /**
   * 发送密码重置成功通知
   */
  async sendPasswordResetSuccessEmail(email: string, username: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'PolyMind - 密码重置成功',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">密码重置成功</h2>
            <p>您好 ${username},</p>
            <p>您的密码已成功重置。如果这不是您的操作，请立即联系管理员。</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              如需要帮助，请联系 support@polymind.com
            </p>
          </div>
        `,
      });

      this.logger.log(`密码重置成功通知已发送至: ${email}`);
    } catch (error) {
      this.logger.error(`发送邮件失败: ${error.message}`, error.stack);
    }
  }
}
