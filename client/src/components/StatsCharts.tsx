import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import type { StatsData } from '../types';

interface StatsChartsProps {
  stats: StatsData;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BDC3C7'];

export default function StatsCharts({ stats }: StatsChartsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const categoryData = stats.categoryStats.map((item, index) => ({
    name: item.name,
    value: item.total,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const dailyData = stats.dailyStats.reduce((acc, item) => {
    const existing = acc.find((d) => d.date === item.date);
    if (existing) {
      existing[item.type] = item.total;
    } else {
      acc.push({ date: item.date, [item.type]: item.total });
    }
    return acc;
  }, [] as any[]);

  const monthlyData = stats.dailyStats.reduce((acc, item) => {
    const month = item.date.substring(0, 7);
    const existing = acc.find((d) => d.month === month);
    if (existing) {
      existing[item.type] = (existing[item.type] || 0) + item.total;
    } else {
      acc.push({ month, [item.type]: item.total });
    }
    return acc;
  }, [] as any[]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              支出分类占比
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatAmount(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              收支概览
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography color="success.main" variant="h4">
                  {formatAmount(stats.totalIncome)}
                </Typography>
                <Typography color="text.secondary">总收入</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography color="error.main" variant="h4">
                  {formatAmount(stats.totalExpense)}
                </Typography>
                <Typography color="text.secondary">总支出</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography color="primary.main" variant="h4">
                  {formatAmount(stats.balance)}
                </Typography>
                <Typography color="text.secondary">结余</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              每日收支趋势
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="income" name="收入" stroke="#4CAF50" />
                <Line type="monotone" dataKey="expense" name="支出" stroke="#F44336" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              月度收支对比
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="#4CAF50" />
                <Bar dataKey="expense" name="支出" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              分类支出排行
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Bar dataKey="value" fill="#8884d8">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
