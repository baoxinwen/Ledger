// 首页仪表盘：本月 KPI（含环比与迷你趋势）+ 按日分组的最近记录 + 本月状态卡。
import { useEffect } from 'react';
import { Box, Button, Grid } from '@mui/material';
import { Add as AddIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore, buildStatsKey } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useQuickAddStore } from '../stores/quickAddStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useZonedToday } from '../hooks/useZonedToday';
import { StatsCards, RecentTransactions, MonthStatusCard } from '../components/Dashboard';
import { PageHeader } from '../components/ui';
import { formatYearMonth, getMonthRangeForDate } from '../utils/format';

export default function HomePage() {
  const navigate = useNavigate();
  const { recent, stats, statsKey, dataVersion, fetchRecent, fetchStats } = useTransactionStore();
  const fetchStatus = useBudgetStore((state) => state.fetchStatus);
  const openQuickAdd = useQuickAddStore((state) => state.openQuickAdd);
  const { showSnackbar } = useSnackbarStore();
  const timeZone = useSettingsStore((state) => state.settings.time_zone);
  const today = useZonedToday(timeZone);
  const currentMonth = today.substring(0, 7);
  const { startDate, endDate } = getMonthRangeForDate(today);
  // 只有当 store 里的 stats 确实属于"本月"范围时才展示，避免统计页等其他周期数据串台。
  const statsReady = stats !== null && statsKey === buildStatsKey({ start_date: startDate, end_date: endDate });
  const monthStats = statsReady ? stats : null;

  useEffect(() => {
    Promise.all([
      fetchStats({ start_date: startDate, end_date: endDate }),
      fetchRecent(8),
      fetchStatus(currentMonth),
    ]).catch(() => {
      showSnackbar('加载数据失败，请刷新页面重试', 'error');
    });
    // dataVersion 变化（全局记一笔/编辑/删除）时重拉，保证 KPI 与最近记录实时。
  }, [endDate, startDate, currentMonth, dataVersion, fetchRecent, fetchStats, fetchStatus, showSnackbar]);

  return (
    <Box>
      <PageHeader
        eyebrow={formatYearMonth(currentMonth)}
        title="本月概览"
        description="追踪每一笔收支"
        action={(
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openQuickAdd}
            >
              记一笔
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => navigate('/transactions')}
            >
              查看账单
            </Button>
          </Box>
        )}
      />

      {/* KPI 卡：收入/支出/结余 + 环比 + 迷你趋势 */}
      <StatsCards
        totalIncome={monthStats?.totalIncome || 0}
        totalExpense={monthStats?.totalExpense || 0}
        balance={monthStats?.balance || 0}
        stats={monthStats}
      />

      {/* 两栏：最近记录（7）+ 本月状态（5） */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <RecentTransactions transactions={recent} today={today} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <MonthStatusCard stats={monthStats} month={currentMonth} />
        </Grid>
      </Grid>
    </Box>
  );
}
