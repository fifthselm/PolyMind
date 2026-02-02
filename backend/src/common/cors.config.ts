/**
 * CORS配置工具
 * 统一处理HTTP和WebSocket的CORS验证
 */

// 允许的localhost开发端口
export const ALLOWED_LOCALHOST_PORTS = [5173, 3000, 4173, 8080];

/**
 * 验证origin是否允许
 * @param origin - 请求的origin
 * @returns boolean - 是否允许
 */
export function isOriginAllowed(origin: string): boolean {
  // 允许配置的来源
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
  
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // 允许特定的localhost开发端口
  const localhostMatch = origin.match(/^http:\/\/localhost:(\d+)$/);
  if (localhostMatch) {
    const port = parseInt(localhostMatch[1], 10);
    if (ALLOWED_LOCALHOST_PORTS.includes(port)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取CORS配置选项
 * @returns CorsOptions - NestJS CORS配置
 */
export function getCorsOptions() {
  return {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // 允许无 origin 的请求 (如移动端应用)
      if (!origin) return callback(null, true);
      
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}
