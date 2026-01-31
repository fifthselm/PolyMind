import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto, MessageResponse, PaginationQueryDto } from './dto/message.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('rooms/:roomId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * 发送消息
   */
  @Post()
  async send(
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ): Promise<MessageResponse> {
    return this.messagesService.send(roomId, dto, 'human', req.user.id);
  }

  /**
   * 获取消息历史
   */
  @Get()
  async getHistory(
    @Param('roomId') roomId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ messages: MessageResponse[]; total: number }> {
    return this.messagesService.getHistory(
      roomId,
      query.page || 1,
      query.limit || 50,
    );
  }

  /**
   * 编辑消息
   */
  @Put(':messageId')
  async edit(
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ): Promise<MessageResponse> {
    return this.messagesService.edit(messageId, body.content, req.user.id);
  }

  /**
   * 删除消息
   */
  @Delete(':messageId')
  async delete(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.messagesService.delete(messageId, req.user.id);
  }
}
