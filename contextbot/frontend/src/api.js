function getDefaultApiBaseUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return 'http://127.0.0.1:8000';
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl()).replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail =
      (isJson && payload && typeof payload === 'object' && payload.detail) ||
      'Request failed.';
    throw new Error(detail);
  }

  return payload;
}

export const api = {
  validateGroqKey(data) {
    return request('/api/validate-groq-key', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  createBot(data) {
    return request('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getPublicBot(slug) {
    return request(`/api/bots/${encodeURIComponent(slug)}`);
  },
  chatWithBot(slug, data) {
    return request(`/api/bots/${encodeURIComponent(slug)}/chat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getManageBot(slug, token) {
    return request(`/api/manage/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`);
  },
  updateManageBot(slug, token, data) {
    return request(`/api/manage/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteManageBot(slug, token) {
    return request(`/api/manage/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  },
};
