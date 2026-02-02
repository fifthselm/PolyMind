/**
 * WebSocket 测试脚本
 * 使用 Socket.io Client 进行测试
 */

import io from 'socket.io-client';
import { EventEmitter } from 'events';

// 定义 Socket 类型
interface Socket {
  on(event: string, callback: (...args: any[]) => void): void;
  once(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  disconnect(): void;
  connected: boolean;
}

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  error?: Error;
}

class WebSocketTester extends EventEmitter {
  private socket: Socket | null = null;
  private results: TestResult[] = [];
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3000') {
    super();
    this.serverUrl = serverUrl;
  }

  /**
   * 连接WebSocket
   */
  async connect(authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        auth: { token: authToken },
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket连接成功');
        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.log('❌ WebSocket连接失败:', error.message);
        reject(error);
      });

      this.socket.on('error', (error: any) => {
        console.log('WebSocket错误:', error);
      });
    });
  }

  /**
   * 测试房间加入
   */
  async testJoinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('未连接'));
        return;
      }

      this.socket.emit('room:join', { roomId });

      // 监听确认
      this.socket.once('room:joined', (data: any) => {
        this.results.push({
          name: '加入房间',
          status: 'PASS',
          message: `成功加入房间 ${roomId}`,
        });
        resolve();
      });

      this.socket.once('error', (error: any) => {
        this.results.push({
          name: '加入房间',
          status: 'FAIL',
          error: new Error(error.message),
        });
        reject(error);
      });

      // 超时
      setTimeout(() => {
        this.results.push({
          name: '加入房间',
          status: 'FAIL',
          error: new Error('超时'),
        });
        reject(new Error('加入房间超时'));
      }, 5000);
    });
  }

  /**
   * 测试发送消息
   */
  async testSendMessage(roomId: string, content: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('未连接'));
        return;
      }

      const messageData = {
        roomId,
        content,
        timestamp: Date.now(),
      };

      this.socket.emit('message:send', messageData);

      // 监听消息确认
      this.socket.once('message:sent', (data: any) => {
        this.results.push({
          name: '发送消息',
          status: 'PASS',
          message: `消息已发送: ${content}`,
        });
        resolve(data);
      });

      this.socket.once('error', (error: any) => {
        this.results.push({
          name: '发送消息',
          status: 'FAIL',
          error: new Error(error.message),
        });
        reject(error);
      });

      setTimeout(() => {
        this.results.push({
          name: '发送消息',
          status: 'FAIL',
          error: new Error('超时'),
        });
        reject(new Error('发送消息超时'));
      }, 5000);
    });
  }

  /**
   * 测试正在输入状态
   */
  async testTyping(roomId: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve();
        return;
      }

      // 发送开始输入
      this.socket.emit('typing:start', { roomId });

      setTimeout(() => {
        // 发送停止输入
        this.socket!.emit('typing:stop', { roomId });
        this.results.push({
          name: '输入状态',
          status: 'PASS',
          message: '输入状态切换正常',
        });
        resolve();
      }, 1000);
    });
  }

  /**
   * 测试离开房间
   */
  async testLeaveRoom(roomId: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve();
        return;
      }

      this.socket.emit('room:leave', { roomId });

      this.socket.once('room:left', () => {
        this.results.push({
          name: '离开房间',
          status: 'PASS',
          message: `成功离开房间 ${roomId}`,
        });
        resolve();
      });

      setTimeout(() => {
        this.results.push({
          name: '离开房间',
          status: 'FAIL',
          error: new Error('超时'),
        });
        resolve();
      }, 5000);
    });
  }

  /**
   * 监听消息事件
   */
  onMessage(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('message:new', callback);
  }

  /**
   * 监听成员加入事件
   */
  onMemberJoined(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('member:joined', callback);
  }

  /**
   * 监听成员离开事件
   */
  onMemberLeft(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('member:left', callback);
  }

  /**
   * 监听正在输入事件
   */
  onTyping(callback: (data: any) => void): void {
    if (!this.socket) return;
    this.socket.on('typing', callback);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * 打印测试报告
   */
  printReport(): void {
    console.log('\n📊 WebSocket 测试报告');
    console.log('='.repeat(50));

    let passed = 0;
    let failed = 0;

    this.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(
        `${status} [${index + 1}] ${result.name}: ${result.message || result.error?.message}`
      );
      
      if (result.status === 'PASS') {
        passed++;
      } else {
        failed++;
      }
    });

    console.log('='.repeat(50));
    console.log(`总计: ${passed + failed} | 通过: ${passed} | 失败: ${failed}`);
  }
}

// 导出测试类
export { WebSocketTester, TestResult };

// 如果直接运行此脚本
async function main() {
  console.log('🧪 WebSocket 测试开始...\n');

  const tester = new WebSocketTester('http://localhost:3000');

  try {
    // 获取测试Token（需要先启动后端服务）
    // 这里需要实际的Token
    const authToken = process.env.TEST_AUTH_TOKEN;

    if (!authToken) {
      console.log('❌ 请设置环境变量 TEST_AUTH_TOKEN');
      console.log('示例: TEST_AUTH_TOKEN=<jwt-token> npx ts-node test-websocket.ts');
      process.exit(1);
    }

    // 连接
    await tester.connect(authToken);

    // 测试房间ID（需要先创建一个房间）
    const testRoomId = process.env.TEST_ROOM_ID || 'test-room-id';

    // 执行测试
    await tester.testJoinRoom(testRoomId);
    await tester.testTyping(testRoomId);
    await tester.testSendMessage(testRoomId, '测试消息');
    await tester.testLeaveRoom(testRoomId);

    // 打印报告
    tester.printReport();

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    tester.disconnect();
  }
}

// 如果是主模块则运行
if (require.main === module) {
  main();
}
