import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ─────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: handle 401 → refresh ───────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
        processQueue(null, data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  requestOtp: (email) => api.post('/auth/otp/request', { email }),
  verifyOtp: (data) => api.post('/auth/otp/verify', data),
  resetPassword: (data) => api.post('/auth/password/reset', data),
};

// ── Warehouses & Locations ────────────────────────────────────
export const warehouseApi = {
  list: () => api.get('/warehouses'),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
  listLocations: (warehouseId) =>
    api.get('/locations', { params: warehouseId ? { warehouse_id: warehouseId } : {} }),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/locations/${id}`),
};

// ── Products & Categories ─────────────────────────────────────
export const productApi = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  listCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data),
};

// ── Stock ─────────────────────────────────────────────────────
export const stockApi = {
  list: (params) => api.get('/stock', { params }),
  update: (id, data) => api.put(`/stock/${id}`, data),
};

// ── Operations ────────────────────────────────────────────────
export const operationApi = {
  list: (params) => api.get('/operations', { params }),
  get: (id) => api.get(`/operations/${id}`),
  create: (data) => api.post('/operations', data),
  update: (id, data) => api.put(`/operations/${id}`, data),
  validate: (id) => api.post(`/operations/${id}/validate`),
  cancel: (id) => api.post(`/operations/${id}/cancel`),
};

// ── Move History ──────────────────────────────────────────────
export const moveHistoryApi = {
  list: (params) => api.get('/move-history', { params }),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  kpis: () => api.get('/dashboard/kpis'),
};
