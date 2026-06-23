// 统计页：按时间范围拉取汇总数据并渲染趋势、分类图表。
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useTransactionStore } from '../stores/transactionStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useZonedToday } from '../hooks/useZonedToday';
import StatsCharts from '../components/StatsCharts';
import { getMonthRangeForDate, getQuarterRangeForDate, getYearRangeForDate } from '../utils/format';
import { PageHeader, SectionCard } from '../components/ui';

export default function StatisticsPage() {
  const { stats, loading, fetchStats } = useTransactionStore();
  const { showSnackbar } = useSnackbarStore();
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const timeZone = useSettingsStore((state) => state.settings.time_zone);
  const today = useZonedToday(timeZone);

  useEffect(() => {
    let start = '';
    let end = '';

    switch (period) {
      case 'month': {
        const range = getMonthRangeForDate(today);
        start = range.startDate;
        end = range.endDate;
        break;
      }
      case 'quarter': {
        const range = getQuarterRangeForDate(today);
        start = range.startDate;
        end = range.endDate;
        break;
      }
      case 'year': {
        const range = getYearRangeForDate(today);
        start = range.startDate;
        end = range.endDate;
        break;
      }
      case 'custom':
        start = startDate;
        end = endDate;
        break;
    }

    if (start && end) {
      fetchStats({ start_date: start, end_date: end }).catch(() => {
        showSnackbar('加载统计数据失败', 'error');
      });
    }
  }, [period, startDate, endDate, today, fetchStats, showSnackbar]);

  return (
    <Box>
      <PageHeader
        eyebrow="数据分析"
        title="统计分析"
        description="查看您的收支趋势和分类统计"
      />

      {/* Time Period Selector */}
      <SectionCard cardSx={{ mb: 4 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: 2,
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 80 }}>
              时间范围
            </Typography>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, value) => value && setPeriod(value)}
              size="small"
            >
              <ToggleButton value="month">本月</ToggleButton>
              <ToggleButton value="quarter">本季</ToggleButton>
              <ToggleButton value="year">本年</ToggleButton>
              <ToggleButton value="custom">自定义</ToggleButton>
            </ToggleButtonGroup>

            {period === 'custom' && (
              <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                <TextField
                  type="date"
                  size="small"
                  label="开始日期"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth={isMobile}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="结束日期"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth={isMobile}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
              </Box>
            )}
          </Box>
      </SectionCard>

      {/* Charts */}
      {stats ? (
        <StatsCharts stats={stats} />
      ) : loading ? (
        <SectionCard>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                加载中...
              </Typography>
            </Box>
        </SectionCard>
      ) : (
        <SectionCard>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" sx={{ color: 'error.main' }}>
                加载失败，请重试
              </Typography>
            </Box>
        </SectionCard>
      )}
    </Box>
  );
}
