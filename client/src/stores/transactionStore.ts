// 交易 store：缓存列表、统计和筛选条件，供首页、记录页、统计页复用。
import { create } from 'zustand';
import { transactionApi } from '../api';
import type { TransactionWithDetails, TransactionFilter, StatsData } from '../types';

interface TransactionState {
  transactions: TransactionWithDetails[];
  total: number;
  stats: StatsData | null;
  loading: boolean;
  statsLoading: boolean;
  filter: TransactionFilter;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  fetchRecentTransactions: () => Promise<void>;
  fetchStats: (params?: { start_date?: string; end_date?: string }) => Promise<void>;
  setFilter: (filter: TransactionFilter) => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  total: 0,
  stats: null,
  loading: false,
  statsLoading: false,
  filter: { page: 1, limit: 20 },

  fetchTransactions: async (filter?: TransactionFilter) => {
    set({ loading: true });
    try {
      const currentFilter = filter || get().filter;
      const response = await transactionApi.getAll(currentFilter);
      set({
        transactions: response.data.data,
        total: response.data.total,
        filter: currentFilter,
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error; // 交由调用方统一提示，避免页面级 .catch 变成死代码
    } finally {
      set({ loading: false });
    }
  },

  fetchRecentTransactions: async () => {
    try {
      const response = await transactionApi.getAll({ page: 1, limit: 5, sort: 'date', order: 'desc' });
      set({ transactions: response.data.data, total: response.data.total });
    } catch (error) {
      console.error('Failed to fetch recent transactions:', error);
      throw error;
    }
  },

  fetchStats: async (params?: { start_date?: string; end_date?: string }) => {
    set({ statsLoading: true });
    try {
      const response = await transactionApi.getStats(params || {});
      set({ stats: response.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw error;
    } finally {
      set({ statsLoading: false });
    }
  },

  setFilter: (filter: TransactionFilter) => {
    set({ filter });
  },
}));
