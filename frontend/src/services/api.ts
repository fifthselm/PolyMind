import axios, { AxiosInstance, AxiosError } from 'axios';
import { getToken, clearAuthToken } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加Token
    this.client.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器 - 处理错误
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token过期，清除登录状态
          clearAuthToken();
          // 使用自定义错误标记，让组件处理重定向
          (error as unknown as Record<string, unknown>).shouldRedirectToLogin = true;
        }
        return Promise.reject(error);
      }
    );
  }

  // 认证相关
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: { email: string; username: string; password: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateUser(data: { username?: string; email?: string; avatarUrl?: string }) {
    const response = await this.client.put('/auth/me', data);
    return response.data;
  }

  // 房间相关
  async getRooms() {
    const response = await this.client.get('/rooms');
    return response.data;
  }

  async getRoom(roomId: string) {
    const response = await this.client.get(`/rooms/${roomId}`);
    return response.data;
  }

  async createRoom(data: { name: string; description?: string; maxMembers?: number }) {
    const response = await this.client.post('/rooms', data);
    return response.data;
  }

  async updateRoom(roomId: string, data: Partial<{ name: string; description: string; maxMembers: number }>) {
    const response = await this.client.put(`/rooms/${roomId}`, data);
    return response.data;
  }

  async leaveRoom(roomId: string) {
    const response = await this.client.post(`/rooms/${roomId}/leave`);
    return response.data;
  }

  async getRoomMembers(roomId: string) {
    const response = await this.client.get(`/rooms/${roomId}/members`);
    return response.data;
  }

  async addRoomMember(roomId: string, data: { memberType: 'human' | 'ai'; userId?: string; aiModelId?: string; aiPrompt?: string }) {
    const response = await this.client.post(`/rooms/${roomId}/members`, data);
    return response.data;
  }

  // 消息相关
  async getMessages(roomId: string, page = 1, limit = 50) {
    const response = await this.client.get(`/rooms/${roomId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  }

  async sendMessage(roomId: string, data: { content: string; contentType?: string; replyToId?: string; mentions?: string[]; mode?: 'normal' | 'search' | 'deep_think' }) {
    const response = await this.client.post(`/rooms/${roomId}/messages`, data);
    return response.data;
  }

  async editMessage(roomId: string, messageId: string, content: string) {
    const response = await this.client.put(`/rooms/${roomId}/messages/${messageId}`, { content });
    return response.data;
  }

  async deleteMessage(roomId: string, messageId: string) {
    const response = await this.client.delete(`/rooms/${roomId}/messages/${messageId}`);
    return response.data;
  }

  // AI模型相关
  async getModels() {
    const response = await this.client.get('/models');
    return response.data;
  }

  async getModel(modelId: string) {
    const response = await this.client.get(`/models/${modelId}`);
    return response.data;
  }

  async createModel(data: {
    provider: string;
    modelName: string;
    displayName: string;
    apiEndpoint?: string;
    apiKey?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    const response = await this.client.post('/models', data);
    return response.data;
  }

  async updateModel(modelId: string, data: Partial<{
    displayName: string;
    apiEndpoint: string;
    apiKey: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    isActive: boolean;
  }>) {
    const response = await this.client.put(`/models/${modelId}`, data);
    return response.data;
  }

  async deleteModel(modelId: string) {
    const response = await this.client.delete(`/models/${modelId}`);
    return response.data;
  }

  async testModel(modelId: string) {
    const response = await this.client.post(`/models/${modelId}/test`);
    return response.data;
  }

  async getAvailableModels(data: { provider: string; apiKey: string; apiEndpoint?: string }) {
    const response = await this.client.post('/models/available', data);
    return response.data;
  }

  // 密码重置
  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    console.log('[API] resetPassword called with token:', token.substring(0, 20) + '...');
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }

  // 删除房间成员
  async removeRoomMember(roomId: string, memberId: string) {
    const response = await this.client.delete(`/rooms/${roomId}/members/${memberId}`);
    return response.data;
  }
}

export const api = new ApiService();
