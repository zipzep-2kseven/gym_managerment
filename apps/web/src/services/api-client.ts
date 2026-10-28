import type { PageResult } from '../types/gym.types';
import { ApiResponse, ApiErrorPayload, ApiErrorDetail } from '../types/auth.types.js';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ApiErrorDetail[] | null | undefined;

  constructor(statusCode: number, code: string, message: string, details?: ApiErrorDetail[] | null) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private readonly baseUrl: string;

  constructor() {
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    // Ensure base URL ends without trailing slash and includes /api/v1 prefix
    const sanitizedBase = rawBaseUrl.replace(/\/+$/, '');
    this.baseUrl = sanitizedBase.endsWith('/api/v1') ? sanitizedBase : `${sanitizedBase}/api/v1`;
  }

  /**
   * Performs an HTTP request with JSON serialization, standard error parsing,
   * and credentials: 'include' for HttpOnly cookie transport.
   * Strictly NO JavaScript access to JWT or client-side token storage.
   */
  async request<T>(path: string, options: RequestInit = {}, envelope = false): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...options,
      headers,
      // CRITICAL: credentials: 'include' instructs the browser to send and receive
      // the HttpOnly auth_token cookie across all API requests without JS exposure.
      credentials: 'include',
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkError: any) {
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        networkError?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
      );
    }

    // Try parsing response as JSON
    let json: ApiResponse<T> | null = null;
    const rawText = await response.text();
    if (rawText) {
      try {
        json = JSON.parse(rawText) as ApiResponse<T>;
      } catch {
        // Non-JSON response
        if (!response.ok) {
          throw new ApiClientError(
            response.status,
            'HTTP_ERROR',
            `Yêu cầu thất bại với mã lỗi HTTP ${response.status}.`
          );
        }
      }
    }

    // Handle standard envelope response
    if (json) {
      if (json.success === false) {
        const errPayload: ApiErrorPayload = json.error;
        throw new ApiClientError(
          response.status,
          errPayload.code || 'UNKNOWN_ERROR',
          errPayload.message || 'Đã xảy ra lỗi không xác định.',
          errPayload.details
        );
      }

      return envelope ? json as unknown as T : json.data;
    }

    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        'HTTP_ERROR',
        `Yêu cầu thất bại với mã lỗi HTTP ${response.status}.`
      );
    }

    return undefined as unknown as T;
  }

  list<T>(path: string, options?: RequestOptions): Promise<PageResult<T>> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options?.params ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    return this.request<PageResult<T>>(`${path}?${params}`, { ...options, method: 'GET' }, true);
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    let finalPath = path;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(options.params)) {
        if (val !== undefined) searchParams.append(key, String(val));
      }
      const query = searchParams.toString();
      if (query) {
        finalPath = `${finalPath}${finalPath.includes('?') ? '&' : '?'}${query}`;
      }
    }

    return this.request<T>(finalPath, {
      ...options,
      method: 'GET',
    });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
