function resolveApiUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return `${window.location.protocol}//${hostname}:3001`;
    }
  }

  if (fromEnv && !fromEnv.includes("run.app")) {
    return fromEnv.replace(/\/+$/, "");
  }

  return "https://midlex-new.onrender.com";
}

export function getApiBaseUrl() {
  return resolveApiUrl();
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<T> {
  let API_URL = resolveApiUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('midlex_token') : null;
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, 2500));
      return apiFetch<T>(endpoint, options, retries - 1);
    }

    const fallbackUrl = (process.env.NEXT_PUBLIC_API_URL?.trim() || "https://midlex-new.onrender.com").replace(/\/+$/, "");
    if (API_URL !== fallbackUrl) {
      try {
        API_URL = fallbackUrl;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch (fallbackErr) {
        throw new Error(
          "Unable to connect to server. The server was idle and is starting up — please wait a moment and try again.",
        );
      }
    } else {
      throw new Error(
        "Unable to connect to server. The server was idle and is starting up — please wait a moment and try again.",
      );
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    let message = 'API request failed';
    if (typeof data === 'object' && data) {
      message = 'message' in data ? String(data.message) : 'error' in data ? String(data.error) : message;
    } else if (data) {
      message = data;
    }

    if (typeof window !== 'undefined') {
      console.warn(`[apiFetch HTTP ${response.status}] ${API_URL}${endpoint}: ${message}`);
      if (response.status === 401) {
        localStorage.removeItem('midlex_token');
        localStorage.removeItem('midlex_user');
        if (window.location.pathname.startsWith('/dashboard')) {
          window.location.href = '/login';
        }
      }
    }

    throw new Error(message);
  }

  return data as T;
}
