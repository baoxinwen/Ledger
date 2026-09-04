// 预算 store：缓存预算列表与指定月份的预算执行状态，首页与预算页共用。
import { create } from 'zustand';
import { budgetApi } from '../api';
import type { Budget, BudgetStatus } from '../types';

export interface BudgetOverview {
  totalBudget: number;
  spent: number;
  /** spent / totalBudget，无预算时为 0 */
  ratio: number;
  hasBudget: boolean;
}

/**
 * 汇总口径与 BudgetsPage 一致：
 * 优先使用"总预算"（category_id 为空）作为总额度，避免与分类预算重复计数；
 * 没有总预算时按月度分类预算求和。年度预算是全年口径，不参与月度加总。
 * 只统计已生效的月度预算（start_date 月份 <= 查询月份），未来的预算不计入。
 */
export function computeBudgetOverview(status: BudgetStatus[], month?: string): BudgetOverview {
  const isEffective = (row: BudgetStatus) => !month || row.budget.start_date.substring(0, 7) <= month;
  const monthlyRows = status.filter((row) => row.budget.period === 'monthly' && isEffective(row));
  const totalBudgetRow = monthlyRows.find((row) => row.budget.category_id === null);
  if (totalBudgetRow) {
    return {
      totalBudget: totalBudgetRow.budget.amount,
      spent: totalBudgetRow.spent,
      ratio: totalBudgetRow.budget.amount > 0 ? totalBudgetRow.spent / totalBudgetRow.budget.amount : 0,
      hasBudget: true,
    };
  }
  const categoryRows = monthlyRows.filter((row) => row.budget.category_id !== null);
  const totalBudget = categoryRows.reduce((sum, row) => sum + row.budget.amount, 0);
  // 无总预算时已花费取分类预算覆盖范围的实际支出和
  const spent = categoryRows.reduce((sum, row) => sum + row.spent, 0);
  return {
    totalBudget,
    spent,
    ratio: totalBudget > 0 ? spent / totalBudget : 0,
    hasBudget: categoryRows.length > 0,
  };
}

interface BudgetState {
  budgets: Budget[];
  status: BudgetStatus[];
  statusMonth: string | null;
  loading: boolean;
  statusLoading: boolean;
  fetchBudgets: () => Promise<void>;
  fetchStatus: (month: string) => Promise<void>;
  createBudget: (data: Parameters<typeof budgetApi.create>[0]) => Promise<Budget | null>;
  updateBudget: (id: number, data: Parameters<typeof budgetApi.update>[1]) => Promise<boolean>;
  deleteBudget: (id: number) => Promise<boolean>;
}

// 写操作成功后同步重拉列表与当前月份状态（若有缓存月份）。
// 重拉失败不向上抛：写操作本身已成功，页面数据靠 dataVersion/下次挂载自愈，
// 否则 refetch 的网络抖动会被误报成"保存失败"诱导用户重复提交。
async function refetchBudgetData(get: () => BudgetState): Promise<void> {
  const tasks: Promise<void>[] = [get().fetchBudgets()];
  const month = get().statusMonth;
  if (month) tasks.push(get().fetchStatus(month));
  await Promise.allSettled(tasks).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') console.warn('预算数据重拉失败（写操作已成功）:', result.reason);
    }
  });
}

// 请求代际计数：与 transactionStore 相同的模式，旧响应后到直接丢弃，
// 防止预算列表/月度状态被慢请求的过期结果覆盖。
let budgetsRequestId = 0;
let statusRequestId = 0;

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  status: [],
  statusMonth: null,
  loading: false,
  statusLoading: false,

  fetchBudgets: async () => {
    const requestId = ++budgetsRequestId;
    set({ loading: true });
    try {
      const response = await budgetApi.getAll();
      if (requestId !== budgetsRequestId) return; // 已有更新的请求，丢弃过期响应
      set({ budgets: response.data });
    } finally {
      if (requestId === budgetsRequestId) set({ loading: false });
    }
  },

  fetchStatus: async (month: string) => {
    const requestId = ++statusRequestId;
    set({ statusLoading: true });
    try {
      const response = await budgetApi.getStatus(month);
      if (requestId !== statusRequestId) return;
      set({ status: response.data, statusMonth: month });
    } finally {
      if (requestId === statusRequestId) set({ statusLoading: false });
    }
  },

  createBudget: async (data) => {
    try {
      const response = await budgetApi.create(data);
      await refetchBudgetData(get);
      return response.data;
    } catch {
      return null;
    }
  },

  updateBudget: async (id, data) => {
    try {
      await budgetApi.update(id, data);
      await refetchBudgetData(get);
      return true;
    } catch {
      return false;
    }
  },

  deleteBudget: async (id) => {
    try {
      await budgetApi.delete(id);
      await refetchBudgetData(get);
      return true;
    } catch {
      return false;
    }
  },
}));
