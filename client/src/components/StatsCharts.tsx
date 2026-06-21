// 统计图表组件：封装 Recharts 展示日趋势和分类占比。
import { Box, Grid, Card, CardContent, Typography, useTheme, useMediaQuery } from '@mui/material';
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

const COLORS = [
  '#c9a84c', // Gold
  '#2d6a4f', // Forest
  '#9b2226', // Crimson
  '#0f4c75', // Navy
  '#e36414', // Amber
  '#6a4c93', // Plum
  '#1a936f', // Emerald
  '#114b5f', // Teal
  '#f4a261', // Sandy
];

const formatKAxis = (value: number) => `¥${(value / 1000).toFixed(0)}k`;

export default function StatsCharts({ stats }: StatsChartsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const tooltipStyle = {
    backgroundColor: isDark ? '#12121a' : '#ffffff',
    border: `1px solid ${isDark ? '#1f1f2e' : '#e5e2db'}`,
    borderRadius: 2,
    fontSize: '0.8rem',
    fontFamily: '"DM Sans", sans-serif',
  };

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              收支概览
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'success.main', mb: 0.5, display: 'block' }}>
                  总收入
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    color: 'success.main',
                  }}
                >
                  {formatAmount(stats.totalIncome)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'error.main', mb: 0.5, display: 'block' }}>
                  总支出
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    color: 'error.main',
                  }}
                >
                  {formatAmount(stats.totalExpense)}
                </Typography>
              </Box>
              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ color: 'secondary.main', mb: 0.5, display: 'block' }}>
                  结余
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    color: stats.balance >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatAmount(stats.balance)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Pie Chart */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              分类支出占比
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={isMobile ? undefined : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={isMobile ? 80 : 100}
                  innerRadius={isMobile ? 40 : 50}
                  fill="#8884d8"
                  dataKey="value"
                  strokeWidth={0}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatAmount(value as number)}
                  contentStyle={tooltipStyle}
                />
                {isMobile && (
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconSize={8}
                    formatter={(value) => <Typography component="span" sx={{ fontSize: '0.7rem' }}>{value}</Typography>}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Line Chart - Daily Trends */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              每日收支趋势
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
              <LineChart data={dailyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#1f1f2e' : '#e5e2db'}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? '#1f1f2e' : '#e5e2db' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatKAxis}
                />
                <Tooltip
                  formatter={(value) => formatAmount(value as number)}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  iconSize={8}
                   formatter={(value) => <Typography component="span" sx={{ fontSize: '0.75rem' }}>{value}</Typography>}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="收入"
                  stroke="#2d6a4f"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#2d6a4f' }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="支出"
                  stroke="#9b2226"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#9b2226' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Bar Chart - Monthly Comparison */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              月度收支对比
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#1f1f2e' : '#e5e2db'}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? '#1f1f2e' : '#e5e2db' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatKAxis}
                />
                <Tooltip
                  formatter={(value) => formatAmount(value as number)}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  iconSize={8}
                   formatter={(value) => <Typography component="span" sx={{ fontSize: '0.75rem' }}>{value}</Typography>}
                />
                <Bar
                  dataKey="income"
                  name="收入"
                  fill="#2d6a4f"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="支出"
                  fill="#9b2226"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Horizontal Bar Chart - Category Ranking */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              分类支出排行
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#1f1f2e' : '#e5e2db'}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `¥${(value / 1000).toFixed(1)}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={isMobile ? 60 : 80}
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => formatAmount(value as number)}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 2, 2, 0]}
                >
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
