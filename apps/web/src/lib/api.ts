import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send httpOnly cookies
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor — attach token from memory if present ────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.__accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor — handle 401 / token refresh ───────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/auth/refresh', {});
        const newToken = response.data?.data?.accessToken;

        if (typeof window !== 'undefined') {
          window.__accessToken = newToken;
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.__accessToken = undefined;
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Global type augmentation
declare global {
  interface Window {
    __accessToken?: string;
  }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh', {}),
  me: () => api.get('/auth/me'),
};

export const ticketsApi = {
  findAll: (params: Record<string, unknown>) => api.get('/tickets', { params }),
  stats: () => api.get('/tickets/stats'),
  todayFollowUps: () => api.get('/tickets/today-follow-ups'),
  findOne: (id: string) => api.get(`/tickets/${id}`),
  aging: (id: string) => api.get(`/tickets/${id}/aging`),
  create: (data: unknown) => api.post('/tickets', data),
  update: (id: string, data: unknown) => api.patch(`/tickets/${id}`, data),
  assign: (id: string, data: unknown) => api.patch(`/tickets/${id}/assign`, data),
  convert: (id: string, data: unknown) => api.post(`/tickets/${id}/convert`, data),
  addNote: (id: string, data: unknown) => api.post(`/tickets/${id}/notes`, data),
  createFollowUp: (id: string, data: unknown) => api.post(`/tickets/${id}/follow-ups`, data),
  updateFollowUp: (id: string, fid: string, data: unknown) =>
    api.patch(`/tickets/${id}/follow-ups/${fid}`, data),
  checkDuplicate: (phone: string) => api.get(`/tickets/duplicates/${phone}`),
};

export const customersApi = {
  findAll: (params: Record<string, unknown>) => api.get('/customers', { params }),
  findOne: (id: string) => api.get(`/customers/${id}`),
  update: (id: string, data: unknown) => api.patch(`/customers/${id}`, data),
  getOrders: (id: string) => api.get(`/customers/${id}/orders`),
  getTimeline: (id: string) => api.get(`/customers/${id}/timeline`),
};

export const quotationsApi = {
  findAll: (params: Record<string, unknown>) => api.get('/quotations', { params }),
  findOne: (id: string) => api.get(`/quotations/${id}`),
  create: (data: unknown) => api.post('/quotations', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/quotations/${id}/status`, { status }),
};

export const ordersApi = {
  findAll: (params: Record<string, unknown>) => api.get('/orders', { params }),
  findOne: (id: string) => api.get(`/orders/${id}`),
  create: (data: unknown) => api.post('/orders', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  getTimeline: (id: string) => api.get(`/orders/${id}/timeline`),
  myOrders: () => api.get('/orders/my'),
};

export const usersApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/users', { params }),
  salespersons: () => api.get('/users/salespersons'),
  findOne: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
  toggleActive: (id: string, active: boolean) =>
    api.patch(`/users/${id}/${active ? 'activate' : 'deactivate'}`),
};

export const designSpecsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/design-specs', { params }),
  findOne: (id: string) => api.get(`/design-specs/${id}`),
  create: (data: unknown) => api.post('/design-specs', data),
  update: (id: string, data: unknown) => api.patch(`/design-specs/${id}`, data),
  updateStatus: (id: string, data: { status: string; revisionNotes?: string }) =>
    api.patch(`/design-specs/${id}/status`, data),
  createQuotation: (id: string, data: unknown) =>
    api.post(`/design-specs/${id}/create-quotation`, data),
  myQueue: () => api.get('/design-specs/my'),
  pending: () => api.get('/design-specs/pending'),
};

export const proposalsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/proposals', { params }),
  stats: () => api.get('/proposals/stats'),
  findOne: (id: string) => api.get(`/proposals/${id}`),
  update: (id: string, data: unknown) => api.patch(`/proposals/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/proposals/${id}/status`, { status, notes }),
};

export const opportunitiesApi = {
  // kept for backward compat but now delegates to tickets
  pipeline: () => api.get('/tickets', { params: { status: 'new,contacted,site_inspection,design_review,quoted' } }),
  findAll: (params?: Record<string, unknown>) => api.get('/tickets', { params }),
  findOne: (id: string) => api.get(`/tickets/${id}`),
};
