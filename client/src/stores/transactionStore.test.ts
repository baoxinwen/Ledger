// 交易 store 测试：列表/统计拉取、filter 记录、错误重新抛出。
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  transactionApi: {
    getAll: vi.fn(),
    getStats: vi.fn(),
  },
}));

import { useTransactionStore } from './transactionStore';
import { transactionApi } from '../api';

describe('transactionStore', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      transactions: [],
      total: 0,
      stats: null,
      loading: false,
      statsLoading: false,
      filter: { page: 1, limit: 20 },
    });
    vi.clearAllMocks();
  });

  it('fetchTransactions 更新列表、总数与 filter', async () => {
    (transactionApi.getAll as any).mockResolvedValue({ data: { data: [{ id: 1 }], total: 1 } });
    await useTransactionStore.getState().fetchTransactions({ page: 1, limit: 20 });

    expect(useTransactionStore.getState().transactions).toHaveLength(1);
    expect(useTransactionStore.getState().total).toBe(1);
    expect(useTransactionStore.getState().filter.limit).toBe(20);
  });

  it('fetchStats 更新统计', async () => {
    (transactionApi.getStats as any).mockResolvedValue({
      data: { totalIncome: 100, totalExpense: 50, balance: 50, categoryStats: [], dailyStats: [] },
    });
    await useTransactionStore.getState().fetchStats({});
    expect(useTransactionStore.getState().stats?.totalIncome).toBe(100);
    expect(useTransactionStore.getState().statsLoading).toBe(false);
  });

  it('fetchTransactions 失败时重新抛出（供页面统一提示）', async () => {
    (transactionApi.getAll as any).mockRejectedValue(new Error('network'));
    await expect(useTransactionStore.getState().fetchTransactions()).rejects.toThrow('network');
  });

  it('fetchRecentTransactions 不修改全局 filter', async () => {
    (transactionApi.getAll as any).mockResolvedValue({ data: { data: [{ id: 1 }], total: 1 } });
    await useTransactionStore.getState().fetchRecentTransactions();

    expect(transactionApi.getAll).toHaveBeenCalledWith({ page: 1, limit: 5, sort: 'date', order: 'desc' });
    // filter 保持默认，不被首页最近 5 条覆盖
    expect(useTransactionStore.getState().filter.limit).toBe(20);
  });
});
