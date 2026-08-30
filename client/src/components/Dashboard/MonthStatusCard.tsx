// 本月状态卡：首页右栏的"本月过得怎么样"一瞥——
// 预算执行进度、支出占收入比、记账频次。替代原先两张信息量极低的薄卡。
import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { StatsData } from '../../types';
import { formatCompactAmount, formatWan } from '../../utils/format';
import { ProportionBar, SectionCard } from '../ui';
import { budgetHealth } from '../../utils/budgetHealth';
import { computeBudgetOverview, useBudgetStore } from '../../stores/budgetStore';

interface MonthStatusCardProps {
  stats: StatsData | null;
  /** 业务时区当前月份 YYYY-MM */
  month: string;
}

export default function MonthStatusCard({ stats, month }: MonthStatusCardProps) {
  const status = useBudgetStore((state) => state.status);
  const statusMonth = useBudgetStore((state) => state.statusMonth);
  const budget = useMemo(
    () => (statusMonth === month ? computeBudgetOverview(status, month) : null),
    [status, statusMonth, month],
  );

  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;
  const expenseRatio = totalIncome > 0 ? Math.min(totalExpense / totalIncome, 1) : 0;
  const health = budget?.hasBudget ? budgetHealth(budget.ratio) : null;

  // 本月每日支出序列（供趋势迷你条）
  const dailyExpense = useMemo(() => {
    if (!stats?.dailyStats?.length) return [] as number[];
    const byDate = new Map<string, number>();
    for (const row of stats.dailyStats) {
      if (row.type !== 'expense') continue;
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [stats]);
  const maxDaily = dailyExpense.length ? Math.max(...dailyExpense) : 0;

  return (
    <SectionCard title="本月状态">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* 预算执行 */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              预算执行
            </Typography>
            {budget?.hasBudget ? (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: health === 'over'
                    ? 'error.main'
                    : health === 'caution'
                      ? 'warning.main'
                      : 'success.main',
                }}
              >
                {Math.round(budget.ratio * 100)}%
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                未设置
              </Typography>
            )}
          </Box>
          {budget?.hasBudget ? (
            <>
              <ProportionBar ratio={budget.ratio} />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                已花 {formatCompactAmount(budget.spent)} · 预算 {formatCompactAmount(budget.totalBudget)}
                {health === 'over' && (
                  <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                    {' '}· 超支 {formatWan(budget.spent - budget.totalBudget)}
                  </Box>
                )}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              去预算页设置月度预算，追踪执行进度
            </Typography>
          )}
        </Box>

        {/* 支出占收入比 */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              支出占收入
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: totalIncome === 0
                  ? 'text.disabled'
                  : expenseRatio >= 1
                    ? 'error.main'
                    : expenseRatio >= 0.8
                      ? 'warning.main'
                      : 'success.main',
              }}
            >
              {totalIncome > 0 ? `${Math.round((totalExpense / totalIncome) * 100)}%` : '—'}
            </Typography>
          </Box>
          <ProportionBar ratio={expenseRatio} height={6} />
        </Box>

        {/* 记账频次 */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {stats?.transactionCount ?? 0}
              <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>笔</Box>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>本月记账</Typography>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {stats?.days ?? 0}
              <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>天</Box>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>有记录天数</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              每日支出
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 28 }}>
              {dailyExpense.slice(-14).map((value, index) => (
                <Box
                  key={index}
                  sx={{
                    flex: 1,
                    height: `${maxDaily ? Math.max((value / maxDaily) * 100, 6) : 6}%`,
                    minWidth: 3,
                    bgcolor: 'secondary.main',
                    opacity: 0.75,
                    borderRadius: 0.5,
                  }}
                />
              ))}
              {dailyExpense.length === 0 && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>暂无数据</Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </SectionCard>
  );
}
