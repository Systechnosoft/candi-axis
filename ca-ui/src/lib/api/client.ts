import { createClient } from '@/lib/supabase-browser';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const getHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (typeof window !== 'undefined') {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (err) {
      console.error('Failed to get auth session for API client', err);
    }
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    let message = 'An error occurred';
    let errJson: any = null;
    try {
      errJson = JSON.parse(text);
      message = errJson.message || errJson.error || message;
    } catch {
      message = text || message;
    }
    
    // Create an error object with status and data
    const error = new Error(message) as any;
    error.status = res.status;
    error.data = errJson;
    throw error;
  }
  
  const text = await res.text();
  return {
    data: text ? JSON.parse(text) : null,
  };
};

export const apiClient = {
  get: async <T = any>(url: string, config?: { headers?: Record<string, string>; params?: Record<string, any> }) => {
    const baseHeaders = await getHeaders();
    const headers = { ...baseHeaders, ...(config?.headers || {}) };
    
    let finalUrl = `${getBaseUrl()}${url}`;
    if (config?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, val);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalUrl += `?${queryString}`;
      }
    }
    
    const res = await fetch(finalUrl, {
      method: 'GET',
      headers,
    });
    return handleResponse(res) as Promise<{ data: T }>;
  },

  post: async <T = any>(url: string, data?: unknown, config?: { headers?: Record<string, string> }) => {
    const baseHeaders = await getHeaders();
    const headers = { ...baseHeaders, ...(config?.headers || {}) };
    
    let body: any;
    if (data instanceof FormData) {
      // Fetch automatically sets content-type with boundary when body is FormData
      delete headers['Content-Type'];
      body = data;
    } else if (data !== undefined) {
      body = JSON.stringify(data);
    }
    
    const finalUrl = `${getBaseUrl()}${url}`;
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body,
    });
    return handleResponse(res) as Promise<{ data: T }>;
  },

  put: async <T = any>(url: string, data?: unknown, config?: { headers?: Record<string, string> }) => {
    const baseHeaders = await getHeaders();
    const headers = { ...baseHeaders, ...(config?.headers || {}) };
    
    let body: any;
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      body = data;
    } else if (data !== undefined) {
      body = JSON.stringify(data);
    }
    
    const finalUrl = `${getBaseUrl()}${url}`;
    const res = await fetch(finalUrl, {
      method: 'PUT',
      headers,
      body,
    });
    return handleResponse(res) as Promise<{ data: T }>;
  },

  patch: async <T = any>(url: string, data?: unknown, config?: { headers?: Record<string, string> }) => {
    const baseHeaders = await getHeaders();
    const headers = { ...baseHeaders, ...(config?.headers || {}) };
    
    let body: any;
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      body = data;
    } else if (data !== undefined) {
      body = JSON.stringify(data);
    }
    
    const finalUrl = `${getBaseUrl()}${url}`;
    const res = await fetch(finalUrl, {
      method: 'PATCH',
      headers,
      body,
    });
    return handleResponse(res) as Promise<{ data: T }>;
  },

  delete: async <T = any>(url: string, config?: { headers?: Record<string, string> }) => {
    const baseHeaders = await getHeaders();
    const headers = { ...baseHeaders, ...(config?.headers || {}) };
    
    const finalUrl = `${getBaseUrl()}${url}`;
    const res = await fetch(finalUrl, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res) as Promise<{ data: T }>;
  },
};
