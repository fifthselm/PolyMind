import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/providers/prisma.service';

// 测试数据
const testUser = {
  email: `aitest${Date.now()}@polymind.local`,
  username: `aiuser${Date.now()}`,
  password: 'Test123!@#',
};

let authToken: string;
let roomId: string;
let aiModelId: string;

describe('AI Chat Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
        name: 'AI测试房间',
      });

    roomId = roomRes.body.id;

    // 创建测试AI模型配置
    const modelRes = await request(app.getHttpServer())
      .post('/api/models')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        provider: 'openai',
        modelName: 'gpt-3.5-turbo',
        displayName: '测试GPT',
        apiKey: 'test-api-key',
        systemPrompt: '你是一个友好的AI助手',
      });

    aiModelId = modelRes.body.id;

    // 将AI添加到房间
    await request(app.getHttpServer())
      .post(`/api/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        memberType: 'ai',
        aiModelId,
      });
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
    await prisma.aIModel.deleteMany({
      where: { createdBy: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  describe('POST /api/models', () => {
    it('应该成功创建AI模型配置', () => {
      return request(app.getHttpServer())
        .post('/api/models')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'claude',
          modelName: 'claude-sonnet-4-20250514',
          displayName: '测试Claude',
          apiKey: 'test-claude-key',
          systemPrompt: '你是一个有帮助的助手',
          temperature: 0.7,
          maxTokens: 1024,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.provider).toBe('claude');
          expect(res.body.displayName).toBe('测试Claude');
          expect(res.body.temperature).toBe(0.7);
          // API Key不应该返回
          expect(res.body.apiKey).toBeUndefined();
        });
    });

    it('应该验证必填字段', () => {
      return request(app.getHttpServer())
        .post('/api/models')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'openai',
          // 缺少 modelName 和 displayName
        })
        .expect(400);
    });

    it('应该验证provider值', () => {
      return request(app.getHttpServer())
        .post('/api/models')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'invalid-provider',
          modelName: 'gpt-4',
          displayName: '测试',
          apiKey: 'test-key',
        })
        .expect(400);
    });
  });

  describe('GET /api/models', () => {
    it('应该返回所有AI模型', () => {
      return request(app.getHttpServer())
        .get('/api/models')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /api/models/:id/test', () => {
    it('应该测试模型连接（模拟）', () => {
      return request(app.getHttpServer())
        .post(`/api/models/${aiModelId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBeDefined();
          expect(res.body.message).toBeDefined();
        });
    });
  });

  describe('PUT /api/models/:id', () => {
    it('应该更新模型配置', () => {
      return request(app.getHttpServer())
        .put(`/api/models/${aiModelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          displayName: '更新的名称',
          temperature: 0.5,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.displayName).toBe('更新的名称');
          expect(res.body.temperature).toBe(0.5);
        });
    });
  });

  describe('发送消息触发AI响应', () => {
    it('用户发送消息后AI应该响应（模拟环境）', async () => {
      // 发送用户消息
      const messageRes = await request(app.getHttpServer())
        .post(`/api/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '你好，请介绍一下自己',
        });

      expect(messageRes.status).toBe(201);

      // 注意：在测试环境中，AI响应可能不会真实触发
      // 需要Mock外部API调用
    });
  });
});
