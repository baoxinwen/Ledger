// 展示层格式化工具：统一金额、日期和百分比的中文显示规则。
export function formatAmount(amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

/**
 * Format a number as compact currency (no decimals)
 */
export function formatCompactAmount(amount: number): string {
  return formatAmount(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Format a date string to localized format
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Get current month date range
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${lastDay}`,
  };
}

/**
 * Calculate percentage with bounds
 */
export function calculatePercentage(value: number, total: number, max: number = 100): number {
  if (total === 0) return 0;
  return Math.min((value / total) * 100, max);
}
