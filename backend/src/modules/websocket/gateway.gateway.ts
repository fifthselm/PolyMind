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

// WebSocket消息验证接口
interface JoinRoomData {
  roomId: string;
}

interface LeaveRoomData {
  roomId: string;
}

interface SendMessageData {
  roomId: string;
  content: string;
  replyToId?: string;
  mentions?: string[];
}

interface TypingData {
  roomId: string;
}

// 验证函数
const isValidJoinRoomData = (data: unknown): data is JoinRoomData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    typeof (data as Record<string, unknown>).roomId === 'string' &&
    (data as JoinRoomData).roomId.length > 0
  );
};

const isValidLeaveRoomData = (data: unknown): data is LeaveRoomData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    typeof (data as Record<string, unknown>).roomId === 'string' &&
    (data as LeaveRoomData).roomId.length > 0
  );
};

const isValidSendMessageData = (data: unknown): data is SendMessageData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    'content' in data &&
    typeof (data as Record<string, unknown>).roomId === 'string' &&
    typeof (data as Record<string, unknown>).content === 'string' &&
    (data as SendMessageData).content.length > 0 &&
    (data as SendMessageData).content.length <= 10000 // 限制消息长度
  );
};

const isValidTypingData = (data: unknown): data is TypingData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    typeof (data as Record<string, unknown>).roomId === 'string' &&
    (data as TypingData).roomId.length > 0
  );
};

// 允许的localhost开发端口
const ALLOWED_LOCALHOST_PORTS = [5173, 3000, 4173, 8080];

/**
 * 验证WebSocket origin是否允许
 */
function isWebSocketOriginAllowed(origin: string): boolean {
  // 允许配置的来源
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
  
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // 允许特定的localhost开发端口
  const localhostMatch = origin.match(/^http:\/\/localhost:(\d+)$/);
  if (localhostMatch) {
    const port = parseInt(localhostMatch[1], 10);
    if (ALLOWED_LOCALHOST_PORTS.includes(port)) {
      return true;
    }
  }
  
  return false;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err?: Error, success?: boolean) => void) => {
      if (!origin || isWebSocketOriginAllowed(origin)) {
        callback(undefined, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
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
    @MessageBody() data: unknown,
  ): Promise<void> {
    if (!isValidJoinRoomData(data)) {
      client.emit('error', { message: '无效的加入房间请求' });
      return;
    }
    await this.gatewayService.joinRoom(client, data.roomId);
  }

  /**
   * 离开房间
   */
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    if (!isValidLeaveRoomData(data)) {
      client.emit('error', { message: '无效的离开房间请求' });
      return;
    }
    await this.gatewayService.leaveRoom(client, data.roomId);
  }

  /**
   * 发送消息
   */
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    if (!isValidSendMessageData(data)) {
      client.emit('error', { message: '无效的消息格式' });
      return;
    }
    // 广播消息到房间
    const messageData = {
      roomId: data.roomId,
      content: data.content,
      replyToId: data.replyToId,
      mentions: data.mentions,
    };
    this.gatewayService.sendMessageToRoom(this.server, data.roomId, 'message:new', messageData);
  }

  /**
   * 开始输入
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    if (!isValidTypingData(data)) {
      return;
    }
    const user = this.gatewayService.getUserBySocketId(client.id);
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
    @MessageBody() data: unknown,
  ): void {
    if (!isValidTypingData(data)) {
      return;
    }
    const user = this.gatewayService.getUserBySocketId(client.id);
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
