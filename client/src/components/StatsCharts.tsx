// 统计图表组件：封装 Recharts 展示日趋势和分类占比。
import { useMemo, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, useTheme, useMediaQuery } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
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
import { resolveCategoryDisplayColors } from '../utils/categoryColor';

interface StatsChartsProps {
  stats: StatsData;
}

const formatKAxis = (value: number) => `¥${(value / 1000).toFixed(0)}k`;

interface CategoryChartItem {
  name: string;
  value: number;
  color: string;
  percent?: number;
  isGrouped?: boolean;
}

interface DailyChartItem {
  date: string;
  income: number;
  expense: number;
  net: number;
}

interface MonthlyChartItem {
  month: string;
  income: number;
  expense: number;
}

export default function StatsCharts({ stats }: StatsChartsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const [activePieName, setActivePieName] = useState<string | null>(null);
  const chartGridColor = isDark ? '#252536' : '#e8e2d8';
  const chartAxisColor = isDark ? '#a8a29a' : '#746f66';
  const chartPanelColor = isDark ? '#171720' : '#fbfaf7';
  const incomeColor = isDark ? '#7A8450' : '#5F6F52';
  const expenseColor = isDark ? '#B06D73' : '#8A5A61';

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const categoryData = useMemo(
    () => resolveCategoryDisplayColors(stats.categoryStats.map((item) => ({
      name: item.name,
      value: item.total,
      color: item.color,
    }))),
    [stats.categoryStats]
  );

  const positiveCategoryData = useMemo(
    () => categoryData.filter((item) => item.value > 0),
    [categoryData]
  );
  const totalCategoryAmount = useMemo(
    () => positiveCategoryData.reduce((total, item) => total + item.value, 0),
    [positiveCategoryData]
  );
  const pieData = useMemo<CategoryChartItem[]>(() => {
    const maxSlices = isMobile ? 5 : 8;
    const topItems = positiveCategoryData.slice(0, maxSlices);
    const groupedItems = positiveCategoryData.slice(maxSlices);
    const groupedTotal = groupedItems.reduce((total, item) => total + item.value, 0);
    const groupedColor = groupedTotal > 0
      ? resolveCategoryDisplayColors([...topItems, { name: '其他分类', value: groupedTotal, color: null }])
          .find((item) => item.name === '其他分类')?.color
      : undefined;
    const items = groupedTotal > 0
      ? [
          ...topItems,
          {
            name: '其他分类',
            value: groupedTotal,
            color: groupedColor || '#6B7280',
            isGrouped: true,
          },
        ]
      : topItems;

    return items.map((item) => ({
      ...item,
      percent: totalCategoryAmount > 0 ? item.value / totalCategoryAmount : 0,
    }));
  }, [isMobile, positiveCategoryData, totalCategoryAmount]);

  const highlightedPieItem = activePieName ? pieData.find((item) => item.name === activePieName) : undefined;
  const centerPieItem = highlightedPieItem || pieData[0];
  const activePieIndex = highlightedPieItem ? pieData.findIndex((item) => item.name === highlightedPieItem.name) : -1;

  const dailyData = useMemo<DailyChartItem[]>(() => {
    const byDate = new Map<string, DailyChartItem>();
    stats.dailyStats.forEach((item) => {
      const existing = byDate.get(item.date) || { date: item.date, income: 0, expense: 0, net: 0 };
      if (item.type === 'income') {
        existing.income += item.total;
      }
      if (item.type === 'expense') {
        existing.expense += item.total;
      }
      existing.net = existing.income - existing.expense;
      byDate.set(item.date, existing);
    });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [stats.dailyStats]);

  const monthlyData = useMemo<MonthlyChartItem[]>(() => {
    const byMonth = new Map<string, MonthlyChartItem>();
    stats.dailyStats.forEach((item) => {
      const month = item.date.substring(0, 7);
      const existing = byMonth.get(month) || { month, income: 0, expense: 0 };
      if (item.type === 'income') {
        existing.income += item.total;
      }
      if (item.type === 'expense') {
        existing.expense += item.total;
      }
      byMonth.set(month, existing);
    });
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [stats.dailyStats]);

  const activeDays = dailyData.length;
  const expenseDays = dailyData.filter((item) => item.expense > 0).length;
  const avgDailyExpense = expenseDays > 0 ? stats.totalExpense / expenseDays : 0;
  const savingsRate = stats.totalIncome > 0 ? stats.balance / stats.totalIncome : 0;
  const largestExpenseDay = dailyData.reduce<DailyChartItem | null>(
    (max, item) => (!max || item.expense > max.expense ? item : max),
    null
  );
  const topCategory = positiveCategoryData[0];
  const topCategoryPercent = topCategory && totalCategoryAmount > 0 ? topCategory.value / totalCategoryAmount : 0;
  const metricItems = [
    {
      label: '活跃天数',
      value: `${activeDays} 天`,
      helper: '有收支记录的日期',
      color: 'text.primary',
    },
    {
      label: '日均支出',
      value: formatAmount(avgDailyExpense),
      helper: expenseDays > 0 ? `按 ${expenseDays} 个支出日计算` : '暂无支出日',
      color: 'error.main',
    },
    {
      label: '最高单日支出',
      value: formatAmount(largestExpenseDay?.expense || 0),
      helper: largestExpenseDay?.date || '暂无支出',
      color: 'error.main',
    },
    {
      label: '储蓄率',
      value: `${(savingsRate * 100).toFixed(1)}%`,
      helper: '结余 / 总收入',
      color: stats.balance >= 0 ? 'success.main' : 'error.main',
    },
    {
      label: '最高分类占比',
      value: `${(topCategoryPercent * 100).toFixed(1)}%`,
      helper: topCategory ? topCategory.name : '暂无分类',
      color: 'secondary.main',
    },
  ];

  const tooltipStyle = {
    backgroundColor: isDark ? '#12121a' : '#ffffff',
    border: `1px solid ${isDark ? '#2a2a3c' : '#d9d1c4'}`,
    borderRadius: 2,
    fontSize: '0.8rem',
    fontFamily: '"DM Sans", sans-serif',
    boxShadow: isDark ? '0 12px 28px rgba(0, 0, 0, 0.32)' : '0 12px 28px rgba(26, 26, 46, 0.08)',
  };

  const renderActivePieShape = (props: any) => (
    <Sector
      {...props}
      outerRadius={(props.outerRadius || 0) + 8}
      stroke={theme.palette.secondary.main}
      strokeWidth={2}
    />
  );

  const handlePieActivate = (_: unknown, index: number) => {
    const item = pieData[index];
    if (item) setActivePieName(item.name);
  };

  const handlePieToggle = (_: unknown, index: number) => {
    const item = pieData[index];
    if (item) setActivePieName((current) => (current === item.name ? null : item.name));
  };

  const handlePieLeave = () => {
    if (!isMobile) setActivePieName(null);
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
              分类金额占比
            </Typography>
            {pieData.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 248px' },
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    height: isMobile ? 238 : 300,
                    minWidth: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: chartPanelColor,
                    display: 'flex',
                    alignItems: 'center',
                    '& .recharts-sector, & .recharts-pie-sector': {
                      outline: 'none',
                    },
                    '& .recharts-sector:focus, & .recharts-pie-sector:focus': {
                      outline: 'none',
                    },
                    '& svg *:focus': {
                      outline: 'none',
                    },
                    '& .recharts-surface': {
                      touchAction: 'manipulation',
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={isMobile ? 78 : 100}
                        innerRadius={isMobile ? 48 : 64}
                        fill="#8884d8"
                        dataKey="value"
                        strokeWidth={0}
                        isAnimationActive={false}
                        activeIndex={activePieIndex >= 0 ? activePieIndex : undefined}
                        activeShape={renderActivePieShape}
                        onMouseEnter={handlePieActivate}
                        onClick={handlePieToggle}
                        onMouseLeave={handlePieLeave}
                        rootTabIndex={-1}
                      >
                        {pieData.map((entry) => {
                          const active = !highlightedPieItem || highlightedPieItem.name === entry.name;
                          return (
                            <Cell
                              key={`pie-cell-${entry.name}`}
                              fill={entry.color}
                              opacity={active ? 1 : 0.32}
                              stroke={isDark ? '#12121a' : '#ffffff'}
                              strokeWidth={active ? 2 : 1}
                              style={{ cursor: 'pointer', outline: 'none' }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatAmount(value as number)}
                        contentStyle={tooltipStyle}
                      />
                      <text
                        data-testid="pie-center-name"
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={theme.palette.text.primary}
                        fontSize={isMobile ? 12 : 13}
                        fontWeight={700}
                      >
                        {centerPieItem?.name || '暂无数据'}
                      </text>
                      <text
                        data-testid="pie-center-amount"
                        x="50%"
                        y="54%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={theme.palette.text.primary}
                        fontSize={isMobile ? 11 : 12}
                        fontWeight={600}
                      >
                        {centerPieItem ? formatAmount(centerPieItem.value) : ''}
                      </text>
                      <text
                        data-testid="pie-center-percent"
                        x="50%"
                        y="62%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={theme.palette.text.secondary}
                        fontSize={isMobile ? 10 : 11}
                      >
                        {centerPieItem ? `${((centerPieItem.percent || 0) * 100).toFixed(1)}%` : ''}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Box
                  data-testid="pie-category-legend"
                  sx={{
                    maxHeight: { xs: 168, md: 300 },
                    overflowY: 'auto',
                    pr: 0.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  {pieData.map((item) => {
                    const active = highlightedPieItem?.name === item.name;
                    return (
                      <Box
                        key={item.name}
                        data-testid={`pie-legend-item-${item.name}`}
                        onMouseEnter={() => setActivePieName(item.name)}
                        onMouseLeave={() => {
                          if (!isMobile) setActivePieName(null);
                        }}
                        onClick={() => setActivePieName(active ? null : item.name)}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '4px minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 1,
                          px: 1,
                          py: 0.6,
                          border: '1px solid',
                          borderColor: active ? 'secondary.main' : 'transparent',
                          backgroundColor: active ? 'action.selected' : chartPanelColor,
                          opacity: activePieName && !active ? 0.48 : 1,
                          transition: 'all 0.16s ease',
                          cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <Box
                          data-testid={`pie-legend-swatch-${item.name}`}
                          data-color={item.color}
                          sx={{
                            width: 4,
                            height: 34,
                            bgcolor: item.color,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: active ? 700 : 500, color: 'text.primary' }}
                          >
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0, textTransform: 'none' }}>
                            {((item.percent || 0) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {formatAmount(item.value)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Box sx={{ height: isMobile ? 250 : 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  当前时间范围内暂无可展示的分类金额
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Key Metrics */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
              关键指标
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(5, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              {metricItems.map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: chartPanelColor,
                    px: 1.5,
                    py: 1.25,
                    minHeight: 88,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h6" sx={{ color: item.color, fontWeight: 700, my: 0.5 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0, textTransform: 'none' }}>
                    {item.helper}
                  </Typography>
                </Box>
              ))}
            </Box>
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
                  stroke={chartGridColor}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: chartAxisColor }}
                  tickLine={false}
                  axisLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartAxisColor }}
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
                  stroke={incomeColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: incomeColor }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="支出"
                  stroke={expenseColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: expenseColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Bar Chart - Daily Net Amount */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              每日净额变化
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={dailyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartGridColor}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: chartAxisColor }}
                  tickLine={false}
                  axisLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartAxisColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatKAxis}
                />
                <Tooltip
                  formatter={(value) => formatAmount(value as number)}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="net"
                  name="净额"
                  radius={[2, 2, 0, 0]}
                >
                  {dailyData.map((entry) => (
                    <Cell
                      key={`net-cell-${entry.date}`}
                      fill={entry.net >= 0 ? incomeColor : expenseColor}
                    />
                  ))}
                </Bar>
              </BarChart>
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
                  stroke={chartGridColor}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: chartAxisColor }}
                  tickLine={false}
                  axisLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartAxisColor }}
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
                  fill={incomeColor}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="支出"
                  fill={expenseColor}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Horizontal Bar Chart - Category Ranking */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              分类金额排行
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartGridColor}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: chartAxisColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `¥${(value / 1000).toFixed(1)}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={isMobile ? 60 : 80}
                  tick={{ fontSize: 11, fill: chartAxisColor }}
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
