import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

// 测试数据
const testUser = {
  email: `test${Date.now()}@polymind.local`,
  username: `testuser${Date.now()}`,
  password: 'Test123!@#',
};

let authToken: string;
let userId: string;

describe('Auth Module (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 创建测试应用
    app = Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await app.init();
    
    // 设置全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user.email).toBe(testUser.email);
          expect(res.body.data.accessToken).toBeDefined();
          
          authToken = res.body.data.accessToken;
          userId = res.body.data.user.id;
        });
    });

    it('应该拒绝重复邮箱注册', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('应该验证邮箱格式', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'Test123!@#',
        })
        .expect(400);
    });

    it('应该验证密码强度', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test2@polymind.local',
          username: 'testuser2',
          password: '123', // 太短
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('应该拒绝错误密码', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('应该拒绝不存在的用户', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'notexists@polymind.local',
          password: 'Test123!@#',
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该返回当前用户信息', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe(testUser.email);
        });
    });

    it('应该拒绝无Token请求', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });
});
