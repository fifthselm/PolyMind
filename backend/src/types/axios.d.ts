// axios 类型声明补充
declare module 'axios' {
  export interface AxiosInstance {
    request<T = any>(config: AxiosRequestConfig<T>): Promise<T>;
    get<T = any>(url: string, config?: AxiosRequestConfig<T>): Promise<T>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig<T>): Promise<T>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig<T>): Promise<T>;
    delete<T = any>(url: string, config?: AxiosRequestConfig<T>): Promise<T>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig<T>): Promise<T>;
  }

  export interface AxiosRequestConfig<T = any> {
    url?: string;
    method?: string;
    baseURL?: string;
    transformRequest?: ((data: T, headers?: any) => any) | ((data: T, headers?: any) => any)[];
    transformResponse?: ((data: any) => any)[];
    headers?: any;
    params?: any;
    paramsSerializer?: (params: any) => string;
    data?: T;
    timeout?: number;
    timeoutErrorMessage?: string;
    withCredentials?: boolean;
    adapter?: any;
    responseType?: 'json' | 'arraybuffer' | 'blob' | 'document' | 'text' | 'stream';
    responseEncoding?: string;
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
    onUploadProgress?: (progressEvent: any) => void;
    onDownloadProgress?: (progressEvent: any) => void;
    maxContentLength?: number;
    validateStatus?: ((status: number) => boolean);
    maxBodyLength?: number;
    maxRedirects?: number;
    socketPath?: string;
    httpAgent?: any;
    httpsAgent?: any;
    proxy?: any;
    cancelToken?: CancelToken;
    decompress?: boolean;
    transitional?: any;
  }

  export class AxiosError<T = unknown, D = any> extends Error {
    constructor(
      message: string,
      code?: string,
      config?: AxiosRequestConfig<D>,
      request?: any,
      response?: AxiosResponse<T, D>
    );
    code?: string;
    config?: AxiosRequestConfig<D>;
    request?: any;
    response?: AxiosResponse<T, D>;
    isAxiosError: boolean;
    status?: number;
    toJSON(): object;
  }

  export interface AxiosResponse<T = any, D = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: AxiosRequestConfig<D>;
    request?: any;
  }

  export function create(config?: AxiosRequestConfig): AxiosInstance;
  export default function axios(config?: AxiosRequestConfig): AxiosInstance;
}
