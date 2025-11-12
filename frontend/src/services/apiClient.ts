/**
 * Axios client configuration
 *
 * Features:
 * - Base URL configuration
 * - Request/response interceptors
 * - Error handling with user-friendly messages
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Create Axios instance with configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,  // 5 seconds timeout (sufficient for localhost)
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor (add logging)
 */
apiClient.interceptors.request.use(
  (config) => {
    const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
    if (debugMode) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error(`[API Request Error] ${error.message}`);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor (handle errors)
 */
apiClient.interceptors.response.use(
  (response) => {
    const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
    if (debugMode) {
      console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);
    }
    return response;
  },
  (error: AxiosError) => {
    // Error handling will be done in components using UI store
    // Here we just log the error and pass it through

    const url = error.config?.url || 'unknown';

    // 1. Network error (backend service not running)
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      console.error(`[API Error] Backend service connection failed: ${url}`);
      return Promise.reject(new Error(`后端服务连接失败 (${API_BASE_URL})`));
    }

    // 2. Timeout error
    if (error.code === 'ECONNABORTED') {
      console.error(`[API Error] Request timeout: ${url}`);
      return Promise.reject(new Error('请求超时，请检查后端服务'));
    }

    // 3. HTTP error (backend returns 4xx/5xx)
    if (error.response) {
      const status = error.response.status;
      const detail = (error.response.data as any)?.detail || '未知错误';

      console.error(
        `[API Error] HTTP ${status} - ${url}\n` +
        `Response: ${JSON.stringify(error.response.data)}`
      );

      switch (status) {
        case 400:
          return Promise.reject(new Error(`请求参数错误: ${detail}`));
        case 404:
          return Promise.reject(new Error(`接口不存在: ${url}`));
        case 500:
          return Promise.reject(new Error('后端服务内部错误，请查看后端日志'));
        default:
          return Promise.reject(new Error(`请求失败 (HTTP ${status}): ${detail}`));
      }
    }

    // 4. Unknown error
    console.error(`[API Error] Unknown error: ${error.message}`);
    return Promise.reject(new Error(`未知错误: ${error.message}`));
  }
);

export default apiClient;
