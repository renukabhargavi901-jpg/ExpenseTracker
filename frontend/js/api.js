/**
 * api.js — Shared API client
 * Attaches JWT token automatically to every request.
 * Exported as global `api` object.
 */
const api = (() => {
  const BASE = '';  // same origin

  function getToken() {
    return localStorage.getItem('et_token') || '';
  }

  function headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async function request(method, url, body = null) {
    const opts = { method, headers: headers(), credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + url, opts);
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }));

    // Auto-logout on 401
    if (res.status === 401) {
      localStorage.removeItem('et_token');
      localStorage.removeItem('et_user');
      const currentPage = window.location.pathname;
      if (!currentPage.includes('login') && !currentPage.includes('signup') && !currentPage.endsWith('/')) {
        window.location.href = 'login.html';
      }
    }
    return data;
  }

  return {
    get:    (url)       => request('GET',    url),
    post:   (url, body) => request('POST',   url, body),
    put:    (url, body) => request('PUT',    url, body),
    delete: (url)       => request('DELETE', url),
  };
})();
