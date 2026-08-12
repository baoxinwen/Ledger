// API 客户端集中封装所有后端请求，页面和 store 不直接拼接接口地址。
import axios from 'axios';
import type {
  TransactionFilter,
  TransactionWithDetails,
  Category,
  Tag,
  StatsData,
  Budget,
  BudgetStatus,
  AppSettings,
  ImportFileSource,
  ImportResult,
  AuthUser,
  AuthStatus,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// 供 authStore 注册 401 拦截器（登录过期时自动回到登录页）。
export { api as http };

export const authApi = {
  me: () =>
    api.get<AuthStatus>('/auth/me'),
  setup: (data: { token: string; username: string; password: string }) =>
    api.post<{ user: AuthUser }>('/auth/setup', data),
  login: (data: { username: string; password: string }) =>
    api.post<{ user: AuthUser }>('/auth/login', data),
  logout: () =>
    api.post<{ ok: boolean }>('/auth/logout'),
};

export const transactionApi = {
  getAll: (filter: TransactionFilter = {}) =>
    api.get<{ data: TransactionWithDetails[]; total: number }>('/transactions', { params: filter }),
  create: (data: { type: 'income' | 'expense'; amount: number; category_id: number; note?: string; date: string; tag_ids?: number[] }) =>
    api.post<TransactionWithDetails>('/transactions', data),
  update: (id: number, data: Partial<TransactionWithDetails>) =>
    api.put<TransactionWithDetails>(`/transactions/${id}`, data),
  delete: (id: number) =>
    api.delete(`/transactions/${id}`),
  getStats: (params: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }) =>
    api.get<StatsData>('/transactions/stats', { params }),
};

export const categoryApi = {
  getAll: (type?: 'income' | 'expense') =>
    api.get<Category[]>('/categories', { params: { type } }),
  create: (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) =>
    api.post<Category>('/categories', data),
  update: (id: number, data: { name?: string; icon?: string; color?: string }) =>
    api.put<Category>(`/categories/${id}`, data),
  delete: (id: number) =>
    api.delete(`/categories/${id}`),
};

export const tagApi = {
  getAll: () =>
    api.get<Tag[]>('/tags'),
  create: (name: string) =>
    api.post<Tag>('/tags', { name }),
  delete: (id: number) =>
    api.delete(`/tags/${id}`),
};

export const budgetApi = {
  getAll: () =>
    api.get<Budget[]>('/budgets'),
  getStatus: (month: string) =>
    api.get<BudgetStatus[]>('/budgets/status', { params: { month } }),
  create: (data: { category_id?: number; amount: number; period: 'monthly' | 'yearly'; start_date: string }) =>
    api.post<Budget>('/budgets', data),
  update: (id: number, data: Partial<Budget>) =>
    api.put<Budget>(`/budgets/${id}`, data),
  delete: (id: number) =>
    api.delete(`/budgets/${id}`),
};

export const settingsApi = {
  get: () =>
    api.get<AppSettings>('/settings'),
  update: (data: Partial<AppSettings>) =>
    api.put<AppSettings>('/settings', data),
};

export const importExportApi = {
  export: (format: 'json' | 'csv') =>
    api.get('/export', { params: { format }, responseType: 'blob' }),
  import: (transactions: unknown[]) =>
    api.post<ImportResult>('/import', { transactions }),
  importFile: (file: File, source: ImportFileSource) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    return api.post<ImportResult>('/import/file', formData);
  },
};
