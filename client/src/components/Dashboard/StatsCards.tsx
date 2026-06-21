// 统计卡片组件：首页用紧凑卡片展示收入、支出和结余。
import {
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
} from '@mui/icons-material';
import { formatCompactAmount } from '../../utils/format';

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
      gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      title: '本月支出',
      subtitle: '总支出',
      value: totalExpense,
      icon: <ExpenseIcon />,
      gradient: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      title: '本月结余',
      subtitle: '净收入',
      value: balance,
      icon: <BalanceIcon />,
      gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
      iconBg: 'rgba(201, 168, 76, 0.3)',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 5 }}>
      {cards.map((card, index) => (
        <Card
          key={index}
          sx={{
            height: '100%',
            background: card.gradient,
            color: '#fff',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05))',
            },
          }}
        >
          <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.8, mb: 2, display: 'block' }}>
              {card.title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                mb: 1,
              }}
            >
              {formatCompactAmount(card.value)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {card.icon}
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {card.subtitle}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
