import { useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
} from '@mui/material';
import { useTransactionStore } from '../stores/transactionStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { StatsCards, RecentTransactions, QuickActions } from '../components/Dashboard';
import { getCurrentMonthRange } from '../utils/format';

export default function HomePage() {
  const { transactions, stats, fetchTransactions, fetchStats } = useTransactionStore();
  const { showSnackbar } = useSnackbarStore();

  useEffect(() => {
    const { startDate, endDate } = getCurrentMonthRange();
    Promise.all([
      fetchStats({ start_date: startDate, end_date: endDate }),
      fetchTransactions({ page: 1, limit: 5, sort: 'date', order: 'desc' }),
    ]).catch(() => {
      showSnackbar('加载数据失败，请刷新页面重试', 'error');
    });
  }, [fetchStats, fetchTransactions]);

  return (
    <Box>
      {/* Hero Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="caption"
          sx={{ color: 'secondary.main', mb: 1, display: 'block' }}
        >
          {new Date().getFullYear()}年{new Date().getMonth() + 1}月
        </Typography>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            mb: 1,
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          本月概览
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 480 }}>
          追踪您的每一笔收支，让财务管理变得简单而优雅
        </Typography>
      </Box>

      {/* Stats Cards */}
      <StatsCards
        totalIncome={stats?.totalIncome || 0}
        totalExpense={stats?.totalExpense || 0}
        balance={stats?.balance || 0}
      />

      {/* Two Column Layout */}
      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid size={{ xs: 12, md: 4 }}>
          <QuickActions
            totalIncome={stats?.totalIncome || 0}
            totalExpense={stats?.totalExpense || 0}
          />
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <RecentTransactions transactions={transactions} />
        </Grid>
      </Grid>
    </Box>
  );
}
