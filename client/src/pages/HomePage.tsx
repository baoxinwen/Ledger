// 首页仪表盘：汇总收支统计、最近交易和常用入口。
import { useEffect } from 'react';
import {
  Box,
  Grid,
} from '@mui/material';
import { useTransactionStore } from '../stores/transactionStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useZonedToday } from '../hooks/useZonedToday';
import { StatsCards, RecentTransactions, QuickActions } from '../components/Dashboard';
import { PageHeader } from '../components/ui';
import { formatYearMonth, getMonthRangeForDate } from '../utils/format';

export default function HomePage() {
  const { transactions, stats, fetchTransactions, fetchStats } = useTransactionStore();
  const { showSnackbar } = useSnackbarStore();
  const timeZone = useSettingsStore((state) => state.settings.time_zone);
  const today = useZonedToday(timeZone);
  const currentMonth = today.substring(0, 7);
  const { startDate, endDate } = getMonthRangeForDate(today);

  useEffect(() => {
    Promise.all([
      fetchStats({ start_date: startDate, end_date: endDate }),
      fetchTransactions({ page: 1, limit: 5, sort: 'date', order: 'desc' }),
    ]).catch(() => {
      showSnackbar('加载数据失败，请刷新页面重试', 'error');
    });
  }, [endDate, fetchStats, fetchTransactions, showSnackbar, startDate]);

  return (
    <Box>
      <PageHeader
        eyebrow={formatYearMonth(currentMonth)}
        title="本月概览"
        description="追踪您的每一笔收支，让财务管理变得简单而优雅"
      />

      {/* Stats Cards */}
      <StatsCards
        totalIncome={stats?.totalIncome || 0}
        totalExpense={stats?.totalExpense || 0}
        balance={stats?.balance || 0}
      />

      {/* Two Column Layout */}
      <Grid container spacing={3}>
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
