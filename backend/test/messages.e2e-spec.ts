import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/providers/prisma.service';

// 测试数据
const testUser = {
  email: `msgtest${Date.now()}@polymind.local`,
  username: `msguser${Date.now()}`,
  password: 'Test123!@#',
};

let authToken: string;
let roomId: string;

describe('Messages Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = app.get(PrismaService);

    // 注册并登录
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    authToken = loginRes.body.data.accessToken;

    // 创建测试房间
    const roomRes = await request(app.getHttpServer())
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '消息测试房间',
      });

    roomId = roomRes.body.id;
  });

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: {
        room: { createdBy: { email: testUser.email } },
      },
    });
    await prisma.roomMember.deleteMany({
      where: {
        room: { createdBy: { email: testUser.email } },
      },
    });
    await prisma.chatRoom.deleteMany({
      where: {
        createdBy: { email: testUser.email },
      },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  describe('GET /api/rooms/:roomId/messages', () => {
    it('应该返回空的消息列表（新房间）', () => {
      return request(app.getHttpServer())
        .get(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.messages).toEqual([]);
          expect(res.body.total).toBe(0);
        });
    });

    it('应该支持分页', async () => {
      // 发送10条消息
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post(`/api/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: `消息 ${i + 1}` });
      }

      return request(app.getHttpServer())
        .get(`/api/rooms/${roomId}/messages`)
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.messages.length).toBe(5);
          expect(res.body.total).toBe(10);
        });
    });
  });

  describe('POST /api/rooms/:roomId/messages', () => {
    it('应该成功发送消息', () => {
      return request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello, World!',
          contentType: 'text',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.content).toBe('Hello, World!');
          expect(res.body.senderType).toBe('human');
          expect(res.body.roomId).toBe(roomId);
        });
    });

    it('应该支持@提及', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: `@${testUser.username} 你好`,
          mentions: ['user-id-placeholder'],
        });

      expect(res.status).toBe(201);
    });

    it('应该拒绝未登录发送消息', () => {
      return request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .send({ content: '测试消息' })
        .expect(401);
    });

    it('应该拒绝空内容消息', () => {
      return request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' })
        .expect(400);
    });
  });

  describe('PUT /api/rooms/:roomId/messages/:messageId', () => {
    let messageId: string;

    beforeAll(async () => {
      // 先发送一条消息
      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '原始消息内容' });
      
      messageId = res.body.id;
    });

    it('应该成功编辑消息', () => {
      return request(app.getHttpServer())
        .put(`/api/rooms/${roomId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '编辑后的消息内容' })
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('编辑后的消息内容');
        });
    });

    it('应该拒绝编辑他人的消息', async () => {
      // 另一个用户（需要先注册）
      const otherUser = {
        email: `other${Date.now()}@polymind.local`,
        username: `other${Date.now()}`,
        password: 'Test123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(otherUser);

      const otherLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: otherUser.email,
          password: otherUser.password,
        });

      const otherToken = otherLogin.body.data.accessToken;

      return request(app.getHttpServer())
        .put(`/api/rooms/${roomId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: '尝试编辑' })
        .expect(403);
    });
  });

  describe('DELETE /api/rooms/:roomId/messages/:messageId', () => {
    let messageId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '待删除的消息' });
      
      messageId = res.body.id;
    });

    it('应该成功删除消息（软删除）', () => {
      return request(app.getHttpServer())
        .delete(`/api/rooms/${roomId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('应该标记消息为已删除', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const deletedMessage = res.body.messages.find(
        (m: any) => m.id === messageId
      );

      expect(deletedMessage.isDeleted).toBe(true);
    });
  });
});
