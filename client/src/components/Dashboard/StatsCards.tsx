// 统计卡片组件：首页用紧凑卡片展示收入、支出和结余。
import { Box } from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
} from '@mui/icons-material';
import { formatCompactAmount } from '../../utils/format';
import { MetricCard } from '../ui';

interface StatsCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export default function StatsCards({ totalIncome = 0, totalExpense = 0, balance = 0 }: StatsCardsProps) {
  const cards = [
    {
      title: '本月收入',
      subtitle: '总收入',
      value: totalIncome,
      icon: <IncomeIcon />,
      tone: 'income' as const,
      testId: 'home-income-card',
    },
    {
      title: '本月支出',
      subtitle: '总支出',
      value: totalExpense,
      icon: <ExpenseIcon />,
      tone: 'expense' as const,
      testId: 'home-expense-card',
    },
    {
      title: '本月结余',
      subtitle: '净收入',
      value: balance,
      icon: <BalanceIcon />,
      tone: balance >= 0 ? 'gold' as const : 'warning' as const,
      testId: 'home-balance-card',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5, mb: 4 }}>
      {cards.map((card, index) => (
        <MetricCard
          key={index}
          label={card.title}
          value={formatCompactAmount(card.value)}
          helper={card.subtitle}
          icon={card.icon}
          tone={card.tone}
          testId={card.testId}
        />
      ))}
    </Box>
  );
}
