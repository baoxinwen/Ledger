import { useEffect, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, TextField } from '@mui/material';
import { useTransactionStore } from '../stores/transactionStore';
import StatsCharts from '../components/StatsCharts';

export default function StatisticsPage() {
  const { stats, fetchStats } = useTransactionStore();
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'month':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = `${now.getFullYear()}-${String((quarter + 1) * 3).padStart(2, '0')}-31`;
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
      fetchStats({ start_date: start, end_date: end });
    }
  }, [period, startDate, endDate, fetchStats]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        统计分析
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, value) => value && setPeriod(value)}
        >
          <ToggleButton value="month">本月</ToggleButton>
          <ToggleButton value="quarter">本季</ToggleButton>
          <ToggleButton value="year">本年</ToggleButton>
          <ToggleButton value="custom">自定义</ToggleButton>
        </ToggleButtonGroup>

        {period === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="date"
              label="开始日期"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              type="date"
              label="结束日期"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>
        )}
      </Box>

      {stats ? (
        <StatsCharts stats={stats} />
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          加载中...
        </Typography>
      )}
    </Box>
  );
}
