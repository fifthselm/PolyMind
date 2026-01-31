/**
 * 负载测试脚本
 * 使用 k6 或 autocannon 进行性能测试
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// 测试配置
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // 预热
    { duration: '2m', target: 50 }, // 负载测试
    { duration: '1m', target: 0 },  // 冷却
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求<500ms
    errors: ['rate<0.01'], // 错误率<1%
  },
};

// 测试数据
const testUser = {
  email: `loadtest${Date.now()}@polymind.local`,
  username: `loaduser${Date.now()}`,
  password: 'Test123!@#',
};

let authToken: string;
let roomId: string;

// 测试场景1: 健康检查
export function healthCheck() {
  const res = http.get('http://localhost:3000/health');
  
  check(res, {
    'health check returns 200': (r) => r.status === 200,
    'health check returns ok': (r) => JSON.parse(r.body as string).status === 'ok',
  }) || errorRate.add(1);
  
  responseTime.add(res.timings.duration);
}

// 测试场景2: 用户注册
export function register() {
  const uniqueEmail = `reg${Date.now()}@polymind.local`;
  
  const res = http.post('http://localhost:3000/api/auth/register', JSON.stringify({
    email: uniqueEmail,
    username: `reguser${Date.now()}`,
    password: 'Test123!@#',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'register returns 201': (r) => r.status === 201,
  }) || errorRate.add(1);
  
  responseTime.add(res.timings.duration);
}

// 测试场景3: 用户登录
export function login() {
  const res = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: testUser.email,
    password: testUser.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(res, {
    'login returns 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return body.data && body.data.accessToken;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  if (success) {
    try {
      const body = JSON.parse(res.body as string);
      authToken = body.data.accessToken;
    } catch {}
  }
  
  responseTime.add(res.timings.duration);
}

// 测试场景4: 获取房间列表
export function getRooms() {
  if (!authToken) return;

  const res = http.get('http://localhost:3000/api/rooms', {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  check(res, {
    'get rooms returns 200': (r) => r.status === 200,
    'rooms is array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body as string));
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);
  
  responseTime.add(res.timings.duration);
}

// 测试场景5: 发送消息
export function sendMessage() {
  if (!authToken || !roomId) return;

  const res = http.post(
    `http://localhost:3000/api/rooms/${roomId}/messages`,
    JSON.stringify({
      content: `负载测试消息 ${Date.now()}`,
    }),
    {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );

  check(res, {
    'send message returns 201': (r) => r.status === 201,
  }) || errorRate.add(1);
  
  responseTime.add(res.timings.duration);
}

// 测试场景6: 获取消息历史
export function getMessages() {
  if (!authToken || !roomId) return;

  const res = http.get(
    `http://localhost:3000/api/rooms/${roomId}/messages`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` },
    }
  );

  check(res, {
    'get messages returns 200': (r) => r.status === 200,
    'messages has total': (r) => {
      try {
        return JSON.parse(r.body as string).total !== undefined;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);
  
  responseTime.add(res.timings.duration);
}

// 测试场景7: 获取AI模型列表
export function getModels() {
  if (!authToken) return;

  const res = http.get('http://localhost:3000/api/models', {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  check(res, {
    'get models returns 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  responseTime.add(res.timings.duration);
}

// 主测试函数
export default function () {
  // 按顺序执行测试场景
  healthCheck();
  sleep(1);
  
  register();
  sleep(1);
  
  login();
  sleep(1);
  
  getRooms();
  sleep(1);
  
  getMessages();
  sleep(1);
  
  getModels();
  sleep(2);
}

// 测试完成后的清理
export function teardown(data) {
  console.log('负载测试完成');
  console.log(`总错误率: ${errorRate.values.rate * 100}%`);
  console.log(`平均响应时间: ${responseTime.values.avg}ms`);
}

// 使用方法:
// k6 run --out json=results.json load-test.js
// 或
// autocannon -c 10 -d 30 -p 5 http://localhost:3000/health
