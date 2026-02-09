import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AIChatService } from '../ai-chat/ai-chat.service';

interface ConnectedUser {
  id: string;
  username: string;
  socketId: string;
  rooms: Set<string>;
}

@Injectable()
export class GatewayService {
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => AIChatService))
    private readonly aiChatService: AIChatService,
  ) {}

  /**
   * 验证用户Token
   */
  async verifyToken(client: Socket): Promise<{ id: string; username: string } | null> {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return null;
      }

      const payload = this.jwtService.verify(token);
      return { id: payload.sub, username: payload.username || 'Unknown' };
    } catch (error) {
      return null;
    }
  }

  /**
   * 用户连接
   */
  async handleConnection(client: Socket): Promise<void> {
    const user = await this.verifyToken(client);

    if (!user) {
      client.disconnect();
      return;
    }

    // 记录用户连接
    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.add(client.id);
    }

    this.connectedUsers.set(client.id, {
      id: user.id,
      username: user.username,
      socketId: client.id,
      rooms: new Set(),
    });

    console.log(`用户 ${user.username} 已连接, Socket: ${client.id}`);
  }

  /**
   * 用户断开连接
   */
  handleDisconnect(client: Socket): void {
    const user = this.connectedUsers.get(client.id);

    if (user) {
      // 从所有房间离开
      user.rooms.forEach((roomId) => {
        client.leave(roomId);
      });

      // 从用户socket列表中移除
      const sockets = this.userSockets.get(user.id);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(user.id);
        }
      }

      this.connectedUsers.delete(client.id);
      console.log(`用户 ${user.username} 已断开连接`);
    }
  }

  /**
   * 加入房间
   */
  async joinRoom(client: Socket, roomId: string): Promise<void> {
    const user = this.connectedUsers.get(client.id);

    if (user) {
      user.rooms.add(roomId);
      client.join(roomId);

      // 通知房间内其他用户
      client.to(roomId).emit('member:joined', {
        roomId,
        member: {
          id: user.id,
          username: user.username,
          type: 'human',
        },
      });
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(client: Socket, roomId: string): Promise<void> {
    const user = this.connectedUsers.get(client.id);

    if (user) {
      user.rooms.delete(roomId);
      client.leave(roomId);

      // 通知房间内其他用户
      client.to(roomId).emit('member:left', {
        roomId,
        memberId: user.id,
      });
    }
  }

  /**
   * 发送消息到房间
   */
  sendMessageToRoom(server: Server, roomId: string, event: string, data: Record<string, unknown>): void {
    server.to(roomId).emit(event, data);
  }

  /**
   * 获取在线用户数
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * 获取房间内在线用户
   */
  getRoomOnlineUsers(roomId: string): string[] {
    const users: string[] = [];
    this.connectedUsers.forEach((user) => {
      if (user.rooms.has(roomId)) {
        users.push(user.id);
      }
    });
    return users;
  }

  /**
   * 通过socket ID获取用户信息
   */
  getUserBySocketId(socketId: string): ConnectedUser | undefined {
    return this.connectedUsers.get(socketId);
  }

  /**
   * 中断AI流式生成
   */
  async abortAIStreaming(messageId: string, roomId: string): Promise<boolean> {
    return this.aiChatService.abortStreaming(messageId, roomId);
  }

  /**
   * 获取活跃的流式生成会话列表
   */
  getActiveStreamingSessions(roomId?: string) {
    return this.aiChatService.getActiveStreamingSessions(roomId);
  }
}
