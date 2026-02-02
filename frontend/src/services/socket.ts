import { io, Socket } from 'socket.io-client';
import { getToken } from '../stores/authStore';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * 连接WebSocket
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = getToken();
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket连接成功');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket断开:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket错误:', error);
    });

    // 重新注册事件监听器
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });

    return this.socket;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      // 清理所有事件监听器
      this.eventListeners.forEach((_callbacks, event) => {
        this.socket?.off(event);
      });
      this.eventListeners.clear();

      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string): void {
    this.socket?.emit('room:join', { roomId });
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId: string): void {
    this.socket?.emit('room:leave', { roomId });
  }

  /**
   * 发送消息
   */
  sendMessage(roomId: string, content: string, options?: { replyToId?: string; mentions?: string[] }): void {
    this.socket?.emit('message:send', {
      roomId,
      content,
      ...options,
    });
  }

  /**
   * 开始输入
   */
  startTyping(roomId: string): void {
    this.socket?.emit('typing:start', { roomId });
  }

  /**
   * 停止输入
   */
  stopTyping(roomId: string): void {
    this.socket?.emit('typing:stop', { roomId });
  }

  /**
   * 监听事件
   */
  on(event: string, callback: EventCallback): void {
    // 保存监听器
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);

    // 注册到Socket
    this.socket?.on(event, callback);
  }

  /**
   * 取消监听
   */
  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    } else {
      this.eventListeners.delete(event);
      this.socket?.off(event);
    }
  }

  /**
   * 一次性监听
   */
  once(event: string, callback: EventCallback): void {
    this.socket?.once(event, callback);
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
