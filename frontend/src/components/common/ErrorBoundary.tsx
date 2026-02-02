import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * React 错误边界组件
 * 捕获子组件中的 JavaScript 错误，显示友好的错误页面
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary 捕获错误:', error, errorInfo);
    // 可以在这里将错误上报到监控服务
    this.reportError(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // TODO: 集成错误监控服务（如 Sentry）
    console.error('错误上报:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="出错了"
          subTitle="抱歉，页面遇到了意外错误，请尝试刷新页面或联系管理员。"
          extra={[
            <Button key="refresh" type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>,
            <Button key="retry" onClick={this.handleRetry}>
              重试
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * 异步错误处理 Hook
 * 用于处理异步操作中的错误
 */
export const useAsyncError = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: Error) => {
    setError(err);
    console.error('异步操作错误:', err);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

/**
 * Promise 错误处理包装器
 * 自动捕获 Promise 错误并调用回调
 */
export const handlePromise = <T extends unknown>(
  promise: Promise<T>,
  onSuccess: (data: T) => void,
  onError?: (error: Error) => void
): void => {
  promise.then(onSuccess).catch((error: Error) => {
    console.error('Promise 错误:', error);
    onError?.(error);
  });
};

/**
 * 可选值安全获取
 * 避免空指针错误
 */
export const safeGet = <T extends unknown>(
  value: T | null | undefined,
  defaultValue: T
): T => {
  return value ?? defaultValue;
};

/**
 * 数组安全访问
 * 避免数组越界
 */
export const safeArrayAccess = <T extends unknown>(
  array: T[] | null | undefined,
  index: number,
  defaultValue: T
): T => {
  if (!array || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
};

/**
 * 对象安全属性访问
 * 避免深层对象属性访问错误
 */
export const safeObjectGet = <T extends unknown>(
  obj: Record<string, unknown> | null | undefined,
  path: string,
  defaultValue: T
): T => {
  if (!obj) {
    return defaultValue;
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return (current as T) ?? defaultValue;
};
