import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GatewayService } from './gateway.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class GatewayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * 处理客户端连接
   */
  async handleConnection(client: Socket): Promise<void> {
    await this.gatewayService.handleConnection(client);
  }

  /**
   * 处理客户端断开
   */
  handleDisconnect(client: Socket): void {
    this.gatewayService.handleDisconnect(client);
  }

  /**
   * 加入房间
   */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    await this.gatewayService.joinRoom(client, data.roomId);
  }

  /**
   * 离开房间
   */
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    await this.gatewayService.leaveRoom(client, data.roomId);
  }

  /**
   * 发送消息
   */
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ): Promise<void> {
    // 广播消息到房间
    this.gatewayService.sendMessageToRoom(this.server, data.roomId, 'message:new', data);
  }

  /**
   * 开始输入
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    const user = this.gatewayService['connectedUsers']?.get(client.id);
    if (user) {
      this.server.to(data.roomId).emit('typing', {
        roomId: data.roomId,
        userId: user.id,
        username: user.username,
        isTyping: true,
      });
    }
  }

  /**
   * 停止输入
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    const user = this.gatewayService['connectedUsers']?.get(client.id);
    if (user) {
      this.server.to(data.roomId).emit('typing', {
        roomId: data.roomId,
        userId: user.id,
        username: user.username,
        isTyping: false,
      });
    }
  }
}
