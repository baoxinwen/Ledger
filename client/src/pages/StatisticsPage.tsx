// 统计页：按时间范围拉取汇总数据并渲染趋势、分类图表。
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useTransactionStore } from '../stores/transactionStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import StatsCharts from '../components/StatsCharts';

export default function StatisticsPage() {
  const { stats, loading, fetchStats } = useTransactionStore();
  const { showSnackbar } = useSnackbarStore();
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'month':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = `${now.getFullYear()}-${String((quarter + 1) * 3).padStart(2, '0')}-${new Date(now.getFullYear(), (quarter + 1) * 3, 0).getDate()}`;
        break;
      }
      case 'year':
        start = `${now.getFullYear()}-01-01`;
        end = `${now.getFullYear()}-12-31`;
        break;
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
  }, [period, startDate, endDate, fetchStats]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: 'secondary.main', mb: 1, display: 'block' }}>
          数据分析
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
          统计分析
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          查看您的收支趋势和分类统计
        </Typography>
      </Box>

      {/* Time Period Selector */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Charts */}
      {stats ? (
        <StatsCharts stats={stats} />
      ) : loading ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                加载中...
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" sx={{ color: 'error.main' }}>
                加载失败，请重试
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
