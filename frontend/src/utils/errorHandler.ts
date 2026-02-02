/**
 * API错误处理工具
 * 统一处理API错误，包括401未授权重定向
 */

import { clearAuthToken } from '../stores/authStore';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  shouldRedirectToLogin?: boolean;
}

/**
 * 处理API错误
 * @param error - 错误对象
 * @param navigate - React Router的navigate函数
 * @param message - Antd的message实例
 * @param defaultMessage - 默认错误消息
 * @returns void
 */
export function handleApiError(
  error: unknown,
  navigate: (path: string) => void,
  message: { error: (msg: string) => void },
  defaultMessage: string
): void {
  const apiError = error as ApiError;
  
  // 处理401未授权
  if (apiError.shouldRedirectToLogin || apiError.response?.status === 401) {
    clearAuthToken();
    navigate('/login');
    message.error('登录已过期，请重新登录');
    return;
  }
  
  // 显示错误消息
  message.error(apiError.response?.data?.message || defaultMessage);
}
