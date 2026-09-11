const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  let token = localStorage.getItem('yusr_token');
  const refreshToken = localStorage.getItem('yusr_refresh');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401 (if we have a refresh token)
  if (res.status === 401 && refreshToken && !path.includes('/auth/refresh')) {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('yusr_token', refreshData.token);
        if (refreshData.refreshToken) {
          localStorage.setItem('yusr_refresh', refreshData.refreshToken);
        }
        // Retry original request with new token
        headers.Authorization = `Bearer ${refreshData.token}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
      } else {
        // Refresh failed — force logout
        localStorage.removeItem('yusr_token');
        localStorage.removeItem('yusr_refresh');
        window.location.href = '/login';
        throw new Error('الجلسة منتهية');
      }
    } catch {
      localStorage.removeItem('yusr_token');
      localStorage.removeItem('yusr_refresh');
      throw new Error('الجلسة منتهية');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ غير متوقع');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, body) => request(path, { method: 'POST', body }),
};
