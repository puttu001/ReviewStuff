const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'reviewstuff_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (${status})`);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // An expired or invalid token must not leave the app in a half-broken state.
  if (res.status === 401 && auth) {
    clearToken();
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    let detail;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = null;
    }
    throw new ApiError(res.status, typeof detail === 'string' ? detail : null);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  googleAuth: (idToken) =>
    request('/auth/google', {
      method: 'POST',
      body: { id_token: idToken },
      auth: false,
    }),

  save: ({ url, text, title, topic }) =>
    request('/save', { method: 'POST', body: { url, text, title, topic } }),

  getItems: (topic) =>
    request(`/items${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`),

  updateItem: (id, { topic }) =>
    request(`/items/${id}`, { method: 'PATCH', body: { topic } }),

  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  getReviewToday: () => request('/review-today'),

  reviewItem: (id, action) =>
    request(`/review/${id}`, { method: 'POST', body: { action } }),
};
