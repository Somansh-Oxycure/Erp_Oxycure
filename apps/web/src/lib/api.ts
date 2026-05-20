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
        // Redirect to login with session-expired reason
        if (typeof window !== 'undefined') {
          window.__accessToken = undefined;
          window.location.href = '/login?reason=session_expired';
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
  findOne: (id: string) => api.get(`/tickets/${id}`),
  aging: (id: string) => api.get(`/tickets/${id}/aging`),
  create: (data: unknown) => api.post('/tickets', data),
  update: (id: string, data: unknown) => api.patch(`/tickets/${id}`, data),
  assign: (id: string, data: unknown) => api.patch(`/tickets/${id}/assign`, data),
  convert: (id: string, data: unknown) => api.post(`/tickets/${id}/convert`, data),
  addNote: (id: string, data: unknown) => api.post(`/tickets/${id}/notes`, data),
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

export const proposalsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/proposals', { params }),
  stats: () => api.get('/proposals/stats'),
  todayFollowUps: () => api.get('/proposals/today-follow-ups'),
  findOne: (id: string) => api.get(`/proposals/${id}`),
  update: (id: string, data: unknown) => api.patch(`/proposals/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/proposals/${id}/status`, { status, notes }),
  createFollowUp: (id: string, data: unknown) => api.post(`/proposals/${id}/follow-ups`, data),
  updateFollowUp: (id: string, fid: string, data: unknown) =>
    api.patch(`/proposals/${id}/follow-ups/${fid}`, data),
  addNote: (id: string, content: string) =>
    api.post(`/proposals/${id}/notes`, { content }),
  uploadDocument: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/proposals/${id}/document`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  generateDocument: (data: unknown) =>
    api.post('/proposals/generate', data, { responseType: 'arraybuffer' }),
  generateAndSave: (id: string, data: unknown) =>
    api.post(`/proposals/${id}/generate`, data, { responseType: 'arraybuffer' }),
};

export const opportunitiesApi = {
  // kept for backward compat but now delegates to tickets
  pipeline: () => api.get('/tickets', { params: { status: 'new,contacted,site_inspection,design_review,quoted' } }),
  findAll: (params?: Record<string, unknown>) => api.get('/tickets', { params }),
  findOne: (id: string) => api.get(`/tickets/${id}`),
  promoteFromLead: (data: { leadId: string; stage: string }) => api.post(`/leads/${data.leadId}/promote`, { stage: data.stage }),
  updateStage: (id: string, data: { stage: string; lostReason?: string }) => api.patch(`/tickets/${id}/stage`, data),
};

export const leadsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/leads', { params }),
  findOne: (id: string) => api.get(`/leads/${id}`),
  create: (data: unknown) => api.post('/leads', data),
  update: (id: string, data: unknown) => api.patch(`/leads/${id}`, data),
  checkDuplicate: (phone: string) => api.get(`/leads/duplicates/${phone}`),
  stats: () => api.get('/leads/stats'),
};

export const unitsApi = {
  findAll: (all = false) => api.get('/units', { params: all ? { all: 'true' } : {} }),
  findOne: (id: string) => api.get(`/units/${id}`),
  create: (data: { name: string; description?: string; price?: number }) =>
    api.post('/units', data),
  update: (id: string, data: { name?: string; description?: string; price?: number; isActive?: boolean }) =>
    api.patch(`/units/${id}`, data),
};

export const boqTemplatesApi = {
  findAll: (all = false) => api.get('/boq-templates', { params: all ? { all: 'true' } : {} }),
  findOne: (id: string) => api.get(`/boq-templates/${id}`),
  create: (data: unknown) => api.post('/boq-templates', data),
  update: (id: string, data: unknown) => api.patch(`/boq-templates/${id}`, data),
  deactivate: (id: string) => api.patch(`/boq-templates/${id}/deactivate`),
  reactivate: (id: string) => api.patch(`/boq-templates/${id}/reactivate`),
};

export const boqApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/boqs', { params }),
  findOne: (id: string) => api.get(`/boqs/${id}`),
  findByProposal: (proposalId: string) => api.get('/boqs', { params: { proposalId } }),
  create: (data: unknown) => api.post('/boqs', data),
  update: (id: string, data: unknown) => api.patch(`/boqs/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/boqs/${id}/status`, { status }),
  remove: (id: string) => api.delete(`/boqs/${id}`),
};

export const productsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/products', { params }),
  findOne: (id: string) => api.get(`/products/${id}`),
  brands: () => api.get('/products/brands'),
  categories: () => api.get('/products/categories'),
  create: (data: unknown) => api.post('/products', data),
  update: (id: string, data: unknown) => api.patch(`/products/${id}`, data),
  duplicate: (id: string) => api.post(`/products/${id}/duplicate`),
  remove: (id: string) => api.delete(`/products/${id}`),
  exportCsv: () => api.get('/products/export', { responseType: 'blob' }),
  importCsv: (formData: FormData) =>
    api.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const productCategoriesApi = {
  findAll: () => api.get('/product-categories'),
  findFlat: () => api.get('/product-categories/flat'),
  findOne: (id: string) => api.get(`/product-categories/${id}`),
  create: (data: unknown) => api.post('/product-categories', data),
  update: (id: string, data: unknown) => api.patch(`/product-categories/${id}`, data),
  remove: (id: string) => api.delete(`/product-categories/${id}`),
};

// ============================================================
// PHASE 2 — STOCK, SUPPLIERS, PURCHASE ORDERS, ALERTS
// ============================================================

export const stockApi = {
  findAll: (params?: Record<string, string>) =>
    api.get('/stock', { params }),
  getStats: () => api.get('/stock/stats'),
  findOne: (productId: string) => api.get(`/stock/${productId}`),
  getTransactions: (productId: string) => api.get(`/stock/${productId}/transactions`),
  setOpening: (productId: string, data: { qty: number; unitCost?: number }) =>
    api.post(`/stock/${productId}/opening`, data),
  adjust: (productId: string, data: { type: 'add' | 'remove'; qty: number; unitCost?: number; notes?: string }) =>
    api.post(`/stock/${productId}/adjust`, data),
  exportCsv: () => api.get('/stock/export', { responseType: 'blob' }),
  importCsv: (formData: FormData) =>
    api.post('/stock/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const suppliersApi = {
  findAll: (search?: string) => api.get('/suppliers', { params: search ? { search } : {} }),
  findOne: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: unknown) => api.post('/suppliers', data),
  update: (id: string, data: unknown) => api.patch(`/suppliers/${id}`, data),
  remove: (id: string) => api.delete(`/suppliers/${id}`),
  uploadCancelledCheque: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/suppliers/${id}/upload-cheque`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  linkProduct: (supplierId: string, data: unknown) => api.post(`/suppliers/${supplierId}/link-product`, data),
  unlinkProduct: (supplierId: string, productId: string) =>
    api.delete(`/suppliers/${supplierId}/products/${productId}`),
};

export const purchaseOrdersApi = {
  findAll: (params?: { status?: string; search?: string }) =>
    api.get('/purchase-orders', { params }),
  findOne: (id: string) => api.get(`/purchase-orders/${id}`),
  create: (data: unknown) => api.post('/purchase-orders', data),
  update: (id: string, data: unknown) => api.patch(`/purchase-orders/${id}`, data),
  markSent: (id: string) => api.patch(`/purchase-orders/${id}/send`, {}),
  cancel: (id: string) => api.patch(`/purchase-orders/${id}/cancel`, {}),
  receiveGoods: (id: string, data: unknown) => api.post(`/purchase-orders/${id}/receive`, data),
};

export const alertsApi = {
  findLogs: (status?: string) => api.get('/alerts', { params: status ? { status } : {} }),
  findOpen: () => api.get('/alerts/open'),
  getOpenCount: () => api.get('/alerts/count'),
  acknowledge: (id: string) => api.patch(`/alerts/${id}/acknowledge`, {}),
  resolve: (id: string) => api.patch(`/alerts/${id}/resolve`, {}),
  findRules: (active?: boolean) =>
    api.get('/alerts/rules', { params: active !== undefined ? { active } : {} }),
  findOneRule: (id: string) => api.get(`/alerts/rules/${id}`),
  createRule: (data: unknown) => api.post('/alerts/rules', data),
  updateRule: (id: string, data: unknown) => api.patch(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
};

export const stockTransfersApi = {
  findAll: (params?: Record<string, string>) => api.get('/stock-transfers', { params }),
  getStats: () => api.get('/stock-transfers/stats'),
  findOne: (id: string) => api.get(`/stock-transfers/${id}`),
  create: (data: unknown) => api.post('/stock-transfers', data),
  confirm: (id: string) => api.patch(`/stock-transfers/${id}/confirm`, {}),
  cancel: (id: string) => api.patch(`/stock-transfers/${id}/cancel`, {}),
};

export const backupApi = {
  /** List all exportable table keys */
  listTables: () => api.get('/backup/tables'),

  /** Download a JSON backup for the given table keys (empty = all) */
  exportData: (keys: string[]) =>
    api.get('/backup/export', {
      params: keys.length ? { tables: keys.join(',') } : {},
      responseType: 'blob',
    }),

  /** Upload a JSON backup file and restore it */
  restoreData: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/backup/restore', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Truncate selected tables (irreversible) */
  clearTables: (keys: string[]) => api.post('/backup/clear', { keys }),
};

