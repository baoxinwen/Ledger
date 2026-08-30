// 统计卡片组件：首页三张 KPI 卡（收入/支出/结余），带环比 delta 与本月每日迷你趋势。
import { useMemo } from 'react';
import { Box } from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
} from '@mui/icons-material';
import type { StatsData } from '../../types';
import { formatCompactAmount } from '../../utils/format';
import { MetricCard, Sparkline } from '../ui';

interface StatsCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  /** 本月统计（取 changes 环比与 dailyStats 迷你趋势）；无数据时 delta 不显示 */
  stats?: StatsData | null;
}

// 从 dailyStats（按 date/type 拆行的序列）聚出按日升序的收入/支出序列。
// 自定义 hook 形态：useMemo 必须在 React 函数/hook 内调用（修复 rules-of-hooks 违规）。
function useDailySeries(stats: StatsData | null | undefined) {
  return useMemo(() => {
    if (!stats?.dailyStats?.length) return { income: [] as number[], expense: [] as number[] };
    const byDate = new Map<string, { income: number; expense: number }>();
    for (const row of stats.dailyStats) {
      const entry = byDate.get(row.date) ?? { income: 0, expense: 0 };
      if (row.type === 'income') entry.income += row.total;
      else entry.expense += row.total;
      byDate.set(row.date, entry);
    }
    const dates = [...byDate.keys()].sort();
    return {
      income: dates.map((date) => byDate.get(date)!.income),
      expense: dates.map((date) => byDate.get(date)!.expense),
    };
  }, [stats]);
}

export default function StatsCards({ totalIncome = 0, totalExpense = 0, balance = 0, stats }: StatsCardsProps) {
  const { income: incomeSeries, expense: expenseSeries } = useDailySeries(stats);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
      <IncomeCard totalIncome={totalIncome} delta={stats?.changes?.income ?? undefined} series={incomeSeries} />
      <ExpenseCard totalExpense={totalExpense} delta={stats?.changes?.expense ?? undefined} series={expenseSeries} />
      <BalanceCard balance={balance} delta={stats?.changes?.balance ?? undefined} dailyCount={stats?.days} count={stats?.transactionCount} />
    </Box>
  );
}

function IncomeCard({ totalIncome, delta, series }: { totalIncome: number; delta?: number | null; series: number[] }) {
  return (
    <MetricCard
      label="本月收入"
      value={formatCompactAmount(totalIncome)}
      icon={<IncomeIcon />}
      tone="income"
      testId="home-income-card"
      delta={delta}
      deltaPositiveIsGood
      media={series.length > 1 ? <Sparkline values={series} width={72} height={22} /> : undefined}
    />
  );
}

function ExpenseCard({ totalExpense, delta, series }: { totalExpense: number; delta?: number | null; series: number[] }) {
  return (
    <MetricCard
      label="本月支出"
      value={formatCompactAmount(totalExpense)}
      icon={<ExpenseIcon />}
      tone="expense"
      testId="home-expense-card"
      delta={delta}
      deltaPositiveIsGood={false}
      media={series.length > 1 ? <Sparkline values={series} width={72} height={22} /> : undefined}
    />
  );
}

function BalanceCard({ balance, delta, dailyCount, count }: {
  balance: number;
  delta?: number | null;
  dailyCount?: number;
  count?: number;
}) {
  return (
    <Box sx={{ gridColumn: { xs: 'span 2', md: 'auto' } }}>
      <MetricCard
        label="本月结余"
        value={formatCompactAmount(balance)}
        icon={<BalanceIcon />}
        tone={balance >= 0 ? 'gold' : 'expense'}
        testId="home-balance-card"
        delta={delta}
        deltaPositiveIsGood
        helper={dailyCount ? `${count ?? 0} 笔 · ${dailyCount} 天` : undefined}
      />
    </Box>
  );
}
