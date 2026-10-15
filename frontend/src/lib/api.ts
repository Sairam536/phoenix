const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  code: string;
  requestId?: string;
  details?: Array<{ field?: string; message: string }>;

  constructor(message: string, code = 'API_ERROR', requestId?: string, details?: Array<{ field?: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('documind_token') || 'demo-owner-token';
  const orgId = localStorage.getItem('documind_org_id') || '11111111-1111-1111-1111-111111111111';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-Organization-Id': orgId,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle file downloads
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream') || contentType.includes('application/pdf'))) {
    return (await response.text()) as unknown as T;
  }

  const json = await response.json();

  if (!response.ok || json.success === false) {
    const err = json.error || {};
    throw new ApiError(err.message || 'Request failed', err.code, err.requestId, err.details);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => apiRequest<T>(endpoint, { method: 'GET', ...options }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }),
};
