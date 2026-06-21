// 交易 store：缓存列表、统计和筛选条件，供首页、记录页、统计页复用。
import { create } from 'zustand';
import { transactionApi } from '../api';
import type { TransactionWithDetails, TransactionFilter, StatsData } from '../types';

interface TransactionState {
  transactions: TransactionWithDetails[];
  total: number;
  stats: StatsData | null;
  loading: boolean;
  filter: TransactionFilter;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  fetchStats: (params?: { start_date?: string; end_date?: string }) => Promise<void>;
  setFilter: (filter: TransactionFilter) => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  total: 0,
  stats: null,
  loading: false,
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
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async (params?: { start_date?: string; end_date?: string }) => {
    try {
      const response = await transactionApi.getStats(params || {});
      set({ stats: response.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  setFilter: (filter: TransactionFilter) => {
    set({ filter });
  },
}));
