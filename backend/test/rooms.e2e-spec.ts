import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/providers/prisma.service';

// 测试数据
const testUser = {
  email: `roomtest${Date.now()}@polymind.local`,
  username: `roomuser${Date.now()}`,
  password: 'Test123!@#',
};

let authToken: string;
let roomId: string;

describe('Rooms Module (e2e)', () => {
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

    // 先注册并登录
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
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.roomMember.deleteMany({
      where: {
        user: { email: testUser.email },
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

  describe('POST /api/rooms', () => {
    it('应该成功创建房间', () => {
      return request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'AI讨论群',
          description: '讨论人工智能的群聊',
          maxMembers: 100,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('AI讨论群');
          expect(res.body.createdBy).toBeDefined();
          roomId = res.body.id;
        });
    });

    it('应该拒绝未登录创建房间', () => {
      return request(app.getHttpServer())
        .post('/api/rooms')
        .send({
          name: '测试房间',
        })
        .expect(401);
    });

    it('应该验证房间名称', () => {
      return request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // 空名称
        })
        .expect(400);
    });
  });

  describe('GET /api/rooms', () => {
    it('应该返回用户所属房间列表', () => {
      return request(app.getHttpServer())
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('应该返回房间详情', () => {
      return request(app.getHttpServer())
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(roomId);
          expect(res.body.members).toBeDefined();
        });
    });

    it('应该拒绝访问不存在的房间', () => {
      return request(app.getHttpServer())
        .get('/api/rooms/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/rooms/:id', () => {
    it('应该更新房间信息', () => {
      return request(app.getHttpServer())
        .put(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'AI讨论群（更新）',
          description: '更新后的描述',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('AI讨论群（更新）');
        });
    });
  });

  describe('POST /api/rooms/:id/leave', () => {
    it('普通成员应该能离开房间', async () => {
      // 先创建新房间用于测试离开
      const newRoom = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试离开房间',
        });

      const newRoomId = newRoom.body.id;

      // 离开房间
      return request(app.getHttpServer())
        .post(`/api/rooms/${newRoomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('房主不能直接离开房间', () => {
      return request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
