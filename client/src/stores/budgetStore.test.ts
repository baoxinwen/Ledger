// budgetStore 纯函数测试：月度概览汇总口径（审查修复的回归守护）。
// 关键语义：年度总预算不参与月度口径；未生效（start_date 在未来）的月度预算不计入。
import { describe, expect, it } from 'vitest';
import { computeBudgetOverview } from './budgetStore';
import type { BudgetStatus } from '../types';

function row(partial: {
  category_id: number | null;
  period: 'monthly' | 'yearly';
  start_date: string;
  amount: number;
  spent: number;
}): BudgetStatus {
  return {
    budget: {
      id: Math.floor(Math.random() * 100000),
      category_id: partial.category_id,
      period: partial.period,
      start_date: partial.start_date,
      amount: partial.amount,
    },
    spent: partial.spent,
    remaining: partial.amount - partial.spent,
  };
}

describe('computeBudgetOverview', () => {
  it('优先使用已生效的月度总预算，不叠加分类预算', () => {
    const overview = computeBudgetOverview([
      row({ category_id: null, period: 'monthly', start_date: '2026-01-01', amount: 8000, spent: 4000 }),
      row({ category_id: 1, period: 'monthly', start_date: '2026-01-01', amount: 2000, spent: 1500 }),
    ], '2026-08');
    expect(overview).toEqual({ totalBudget: 8000, spent: 4000, ratio: 0.5, hasBudget: true });
  });

  it('年度总预算不参与月度口径（审查 P1：此前会被错当本月预算）', () => {
    const overview = computeBudgetOverview([
      row({ category_id: null, period: 'yearly', start_date: '2026-01-01', amount: 100000, spent: 60000 }),
      row({ category_id: 1, period: 'monthly', start_date: '2026-01-01', amount: 2000, spent: 1500 }),
    ], '2026-08');
    expect(overview.totalBudget).toBe(2000);
    expect(overview.spent).toBe(1500);
  });

  it('未生效（未来月份）的月度预算不计入汇总', () => {
    const overview = computeBudgetOverview([
      row({ category_id: null, period: 'monthly', start_date: '2026-01-01', amount: 8000, spent: 4000 }),
      row({ category_id: 2, period: 'monthly', start_date: '2026-09-01', amount: 9999, spent: 0 }),
    ], '2026-08');
    expect(overview.totalBudget).toBe(8000);
  });

  it('没有总预算时汇总月度分类预算；完全没有预算时 hasBudget=false', () => {
    const overview = computeBudgetOverview([
      row({ category_id: 1, period: 'monthly', start_date: '2026-01-01', amount: 1000, spent: 200 }),
      row({ category_id: 2, period: 'monthly', start_date: '2026-01-01', amount: 500, spent: 100 }),
    ], '2026-08');
    expect(overview.totalBudget).toBe(1500);
    expect(overview.spent).toBe(300);
    expect(overview.hasBudget).toBe(true);

    expect(computeBudgetOverview([], '2026-08').hasBudget).toBe(false);
  });
});
