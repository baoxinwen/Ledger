// 交易 store：缓存列表、最近记录、统计和筛选条件，供首页、记录页、统计页复用。
import { create } from 'zustand';
import { transactionApi } from '../api';
import type { TransactionWithDetails, TransactionFilter, StatsData } from '../types';

// 统计数据的范围标识：与请求参数一一对应，页面据此判断当前 stats 是否属于自己的查询周期，
// 避免跨页复用时把首页的"本月"数据当成其他周期渲染。
export function buildStatsKey(params?: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }): string {
  return `${params?.start_date ?? ''}|${params?.end_date ?? ''}|${params?.type ?? ''}`;
}

interface TransactionState {
  transactions: TransactionWithDetails[];
  total: number;
  /** 首页最近记录独立槽位：不再与列表页共享 transactions，避免互相覆盖 */
  recent: TransactionWithDetails[];
  stats: StatsData | null;
  statsKey: string;
  loading: boolean;
  recentLoading: boolean;
  statsLoading: boolean;
  filter: TransactionFilter;
  /** 任一写入操作（增删改/导入/撤销）后自增，页面依赖它触发重拉 */
  dataVersion: number;
  summary: { income: number; expense: number; count: number } | null;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  fetchRecent: (limit?: number) => Promise<void>;
  fetchStats: (params?: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }) => Promise<void>;
  setFilter: (filter: TransactionFilter) => void;
  invalidateTransactions: () => void;
  /** 写操作后调用：版本号 +1，通知依赖页面重拉数据 */
  notifyDataChanged: () => void;
}

// 请求代际计数：响应返回时代数已前进说明有更新的请求发出，过期响应直接丢弃，
// 防止慢请求后到覆盖新结果（快速切换筛选/周期时列表或图表显示错乱）。
let listRequestId = 0;
let recentRequestId = 0;
let statsRequestId = 0;

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  total: 0,
  recent: [],
  stats: null,
  statsKey: '',
  loading: false,
  recentLoading: false,
  statsLoading: false,
  filter: { page: 1, limit: 20 },
  dataVersion: 0,
  summary: null,

  fetchTransactions: async (filter?: TransactionFilter) => {
    const requestId = ++listRequestId;
    set({ loading: true });
    try {
      const currentFilter = filter || get().filter;
      const response = await transactionApi.getAll(currentFilter);
      if (requestId !== listRequestId) return; // 已有更新的请求，丢弃过期响应
      set({
        transactions: response.data.data,
        total: response.data.total,
        filter: currentFilter,
        summary: response.data.summary ?? null,
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error; // 交由调用方统一提示，避免页面级 .catch 变成死代码
    } finally {
      if (requestId === listRequestId) set({ loading: false });
    }
  },

  fetchRecent: async (limit = 8) => {
    const requestId = ++recentRequestId;
    set({ recentLoading: true });
    try {
      const response = await transactionApi.getAll({ page: 1, limit, sort: 'date', order: 'desc' });
      if (requestId !== recentRequestId) return;
      set({ recent: response.data.data });
    } catch (error) {
      console.error('Failed to fetch recent transactions:', error);
      throw error;
    } finally {
      if (requestId === recentRequestId) set({ recentLoading: false });
    }
  },

  fetchStats: async (params?: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }) => {
    const requestId = ++statsRequestId;
    const key = buildStatsKey(params);
    set({ statsLoading: true });
    try {
      const response = await transactionApi.getStats(params || {});
      if (requestId !== statsRequestId) return;
      set({ stats: response.data, statsKey: key });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw error;
    } finally {
      if (requestId === statsRequestId) set({ statsLoading: false });
    }
  },

  setFilter: (filter: TransactionFilter) => {
    set({ filter });
  },

  // 使缓存的交易列表失效（如标签被删除后其内嵌 tags 数据已过期），页面下次挂载会重新拉取。
  invalidateTransactions: () => {
    set({ transactions: [], total: 0 });
  },

  notifyDataChanged: () => {
    set((state) => ({ dataVersion: state.dataVersion + 1 }));
  },
}));
