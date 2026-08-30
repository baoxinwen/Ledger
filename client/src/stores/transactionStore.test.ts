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

  it('fetchRecent 写入独立 recent 槽位且不修改全局 filter', async () => {
    (transactionApi.getAll as any).mockResolvedValue({ data: { data: [{ id: 1 }], total: 1 } });
    await useTransactionStore.getState().fetchRecent(5);

    expect(transactionApi.getAll).toHaveBeenCalledWith({ page: 1, limit: 5, sort: 'date', order: 'desc' });
    // filter 保持默认，不被首页最近记录覆盖
    expect(useTransactionStore.getState().filter.limit).toBe(20);
    // recent 写入独立槽位，不与列表页共享 transactions
    expect(useTransactionStore.getState().recent).toHaveLength(1);
    expect(useTransactionStore.getState().transactions).toHaveLength(0);
  });

  it('notifyDataChanged 递增 dataVersion', () => {
    const before = useTransactionStore.getState().dataVersion;
    useTransactionStore.getState().notifyDataChanged();
    expect(useTransactionStore.getState().dataVersion).toBe(before + 1);
  });

  it('fetchTransactions 缓存筛选汇总 summary；响应缺失时回落 null', async () => {
    (transactionApi.getAll as any).mockResolvedValue({
      data: { data: [], total: 0, summary: { income: 100, expense: 40, count: 7 } },
    });
    await useTransactionStore.getState().fetchTransactions({ page: 1, limit: 20 });
    expect(useTransactionStore.getState().summary).toEqual({ income: 100, expense: 40, count: 7 });

    (transactionApi.getAll as any).mockResolvedValue({ data: { data: [], total: 0 } });
    await useTransactionStore.getState().fetchTransactions();
    expect(useTransactionStore.getState().summary).toBeNull();
  });

  it('代际守卫：慢请求后到时丢弃过期响应（防筛选快速切换串台）', async () => {
    let resolveSlow: (value: unknown) => void = () => undefined;
    (transactionApi.getAll as any).mockImplementation((filter?: { page?: number }) => {
      if (filter?.page === 1) {
        return new Promise((resolve) => { resolveSlow = resolve; });
      }
      return Promise.resolve({ data: { data: [{ id: 'fast' }], total: 1, summary: { income: 0, expense: 0, count: 1 } } });
    });

    const slowPromise = useTransactionStore.getState().fetchTransactions({ page: 1, limit: 20 });
    await useTransactionStore.getState().fetchTransactions({ page: 2, limit: 20 });
    expect(useTransactionStore.getState().transactions).toEqual([{ id: 'fast' }]);

    resolveSlow({ data: { data: [{ id: 'slow' }], total: 1, summary: { income: 9, expense: 9, count: 9 } } });
    await slowPromise;
    // 慢的 page=1 响应在 page=2 之后到达，必须被丢弃
    expect(useTransactionStore.getState().transactions).toEqual([{ id: 'fast' }]);
    expect(useTransactionStore.getState().filter.page).toBe(2);
  });

  it('fetchStats 写入 statsKey 供页面判断周期归属', async () => {
    (transactionApi.getStats as any).mockResolvedValue({ data: { totalIncome: 1 } });
    await useTransactionStore.getState().fetchStats({ start_date: '2026-08-01', end_date: '2026-08-31' });
    expect(useTransactionStore.getState().statsKey).toBe('2026-08-01|2026-08-31|');
  });

  it('invalidateTransactions 清空列表缓存但不通知版本号', () => {
    useTransactionStore.setState({ transactions: [{ id: 1 } as never], total: 1 });
    const versionBefore = useTransactionStore.getState().dataVersion;
    useTransactionStore.getState().invalidateTransactions();
    expect(useTransactionStore.getState().transactions).toHaveLength(0);
    expect(useTransactionStore.getState().total).toBe(0);
    expect(useTransactionStore.getState().dataVersion).toBe(versionBefore);
  });
});
