// 预算健康度：由已用比例推导三档状态（供进度条配色与状态徽章共用）。
export type BudgetHealth = 'normal' | 'caution' | 'over';

export function budgetHealth(ratio: number): BudgetHealth {
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'caution';
  return 'normal';
}
