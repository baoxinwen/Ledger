// 统计图表组件：概览 → 每日趋势（双轴）→ 分类占比/排行 → 标签排行/关键指标 → 月度对比。
// 月度对比使用独立的近 6 个月序列（StatisticsPage 通过独立请求获取），不受上方时间范围影响。
import { useMemo, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup, useTheme, useMediaQuery } from '@mui/material';
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
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import type { StatsData } from '../types';
import { resolveCategoryDisplayColors } from '../utils/categoryColor';
import { formatWan } from '../utils/format';
import { EASE_OUT, FONT_SANS, FONT_SERIF, NUMERIC_TEXT, getTokens } from '../theme';

export interface MonthlySeriesItem {
  month: string;
  income: number;
  expense: number;
}

interface StatsChartsProps {
  stats: StatsData;
  /** 近 6 个月收支序列（独立请求聚合）；null 表示加载中 */
  monthlySeries?: MonthlySeriesItem[] | null;
}

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

export default function StatsCharts({ stats, monthlySeries = null }: StatsChartsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const tokens = getTokens(theme.palette.mode);
  const [activePieName, setActivePieName] = useState<string | null>(null);
  const [tagType, setTagType] = useState<'income' | 'expense'>('expense');
  const {
    chartGrid, chartAxis, chartPanel, chartIncome, chartExpense, tooltipBg, divider,
  } = tokens;

  const formatAmount = (amount: number) => formatWan(amount);

  // 占比环图与排行只统计支出分类：中心默认文案是"总支出"，混入收入会让
  // 占比分母（收支合计）与中心金额互相矛盾（历史遗留问题，2026-08 审查确认）。
  const categoryData = useMemo(
    () => resolveCategoryDisplayColors(stats.categoryStats
      .filter((item) => item.type === 'expense')
      .map((item) => ({
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

  // Donut 中心：默认显示总支出（整体口径），hover/点击图例后切换到对应分类。
  const highlightedPieItem = activePieName ? pieData.find((item) => item.name === activePieName) : undefined;
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

  const avgExpense = stats.days > 0 ? stats.totalExpense / stats.days : 0;

  const savingsRate = stats.totalIncome > 0 ? stats.balance / stats.totalIncome : 0;
  const largestExpenseDay = dailyData.reduce<DailyChartItem | null>(
    (max, item) => (!max || item.expense > max.expense ? item : max),
    null
  );
  const metricItems = [
    {
      label: '交易笔数',
      value: `${stats.transactionCount} 笔`,
      helper: percentageChangeLabel(stats.changes.transactionCount),
      color: 'text.primary',
    },
    {
      label: '统计天数',
      value: `${stats.days} 天`,
      helper: '按所选自然日计算',
      color: 'text.primary',
    },
    {
      label: '自然日日均收入',
      value: formatAmount(stats.dailyAverages.income),
      helper: `${formatAmount(stats.totalIncome)} / ${stats.days} 天`,
      color: 'success.main',
    },
    {
      label: '自然日日均支出',
      value: formatAmount(stats.dailyAverages.expense),
      helper: `${formatAmount(stats.totalExpense)} / ${stats.days} 天`,
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
  ];
  const selectedTagStats = stats.tagStats[tagType];
  const hasTransactions = stats.transactionCount > 0;

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    border: `1px solid ${divider}`,
    borderRadius: 2,
    fontSize: '0.8rem',
    fontFamily: FONT_SANS,
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

  // ── 空态：不挂载任何图表 ──
  if (!hasTransactions) {
    return (
      <Card>
        <CardContent>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
            数据图表
          </Typography>
          <Box
            sx={{
              minHeight: 132,
              border: '1px dashed',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              px: 2,
              py: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
              所选时间范围内没有交易记录
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
              更换时间范围，或先添加一笔收入或支出
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Row 1: 收支概览（全宽三栏 + 语义色环比） */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2.5, display: 'block' }}>
              收支概览
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: { xs: 2.5, sm: 0 },
              }}
            >
              <OverviewItem
                label="总收入"
                value={stats.totalIncome}
                change={stats.changes.income}
                changeGoodWhenUp
                valueColor="success.main"
                dividerLeft={false}
              />
              <OverviewItem
                label="总支出"
                value={stats.totalExpense}
                change={stats.changes.expense}
                changeGoodWhenUp={false}
                valueColor="error.main"
                dividerLeft
              />
              <OverviewItem
                label="结余"
                value={stats.balance}
                change={stats.changes.balance}
                changeGoodWhenUp
                valueColor={stats.balance >= 0 ? 'success.main' : 'error.main'}
                changeIsAmount
                dividerLeft
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Row 2: 每日收支趋势（双 Y 轴 + 日均支出参考线） */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              每日收支趋势
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 340}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: chartAxis }}
                  tickLine={false}
                  axisLine={{ stroke: chartGrid }}
                />
                <YAxis
                  yAxisId="income"
                  orientation="left"
                  tick={{ fontSize: 11, fill: chartIncome }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatWan}
                  width={56}
                />
                <YAxis
                  yAxisId="expense"
                  orientation="right"
                  tick={{ fontSize: 11, fill: chartExpense }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatWan}
                  width={56}
                />
                <Tooltip
                  formatter={(value) => formatAmount(value as number)}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  iconSize={8}
                  formatter={(value) => <Typography component="span" sx={{ fontSize: '0.75rem' }}>{value}</Typography>}
                />
                {avgExpense > 0 && (
                  <ReferenceLine
                    yAxisId="expense"
                    y={avgExpense}
                    stroke={chartExpense}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{ value: `日均 ${formatWan(avgExpense)}`, position: 'insideTopRight', fontSize: 10, fill: chartAxis }}
                  />
                )}
                <Line
                  yAxisId="income"
                  type="monotone"
                  dataKey="income"
                  name="收入"
                  stroke={chartIncome}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartIncome }}
                />
                <Line
                  yAxisId="expense"
                  type="monotone"
                  dataKey="expense"
                  name="支出"
                  stroke={chartExpense}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartExpense }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Row 3: 分类金额占比 + 分类金额排行 */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              分类金额占比
            </Typography>
            {pieData.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box
                  sx={{
                    height: isMobile ? 238 : 264,
                    minWidth: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: chartPanel,
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
                        outerRadius={isMobile ? 78 : 96}
                        innerRadius={isMobile ? 48 : 62}
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
                      {/* 中心默认显示总支出，hover 切换单项 */}
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
                        {highlightedPieItem?.name || '总支出'}
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
                        {formatAmount(highlightedPieItem ? highlightedPieItem.value : stats.totalExpense)}
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
                        {highlightedPieItem
                          ? `${((highlightedPieItem.percent || 0) * 100).toFixed(1)}%`
                          : `${stats.totalIncome > 0 ? ((stats.totalExpense / stats.totalIncome) * 100).toFixed(0) : '—'}% 收入`}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Box
                  data-testid="pie-category-legend"
                  sx={{
                    maxHeight: 220,
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
                          backgroundColor: active ? 'action.selected' : chartPanel,
                          opacity: activePieName && !active ? 0.48 : 1,
                          transition: `background-color 160ms ${EASE_OUT}, border-color 160ms ${EASE_OUT}, opacity 160ms ${EASE_OUT}`,
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
              <Box sx={{ minHeight: 132, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  当前时间范围内暂无可展示的分类金额
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              分类金额排行
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 340}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: chartAxis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatWan}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={isMobile ? 60 : 80}
                  tick={{ fontSize: 11, fill: chartAxis }}
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

      {/* Row 4: 标签金额排行 + 关键指标 */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>标签金额排行</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  多标签交易会在每个标签下计入完整金额，占比总和可能超过 100%
                </Typography>
              </Box>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={tagType}
                onChange={(_, value: 'income' | 'expense' | null) => value && setTagType(value)}
              >
                <ToggleButton value="expense" aria-label="支出标签">支出</ToggleButton>
                <ToggleButton value="income" aria-label="收入标签">收入</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {selectedTagStats.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 1 }}>
                {selectedTagStats.slice(0, 8).map((item, index) => (
                  <Box
                    key={item.id}
                    sx={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', gap: 1.25, alignItems: 'center', px: 1.5, py: 1.25, border: '1px solid', borderColor: 'divider', bgcolor: chartPanel }}
                  >
                    <Typography variant="caption" color="text.secondary">{index + 1}</Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.count} 笔 · {item.percentage.toFixed(2)}%</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: tagType === 'income' ? 'success.main' : 'error.main', whiteSpace: 'nowrap' }}>
                      {formatAmount(item.total)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">当前范围内暂无{tagType === 'income' ? '收入' : '支出'}标签数据</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
              关键指标
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
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
                    bgcolor: chartPanel,
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
                  <Typography variant="h6" sx={{ color: item.color, fontWeight: 700, my: 0.5, ...NUMERIC_TEXT }}>
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

      {/* Row 5: 每日净额变化 + 近 6 个月月度对比 */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
              每日净额变化
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: chartAxis }}
                  tickLine={false}
                  axisLine={{ stroke: chartGrid }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartAxis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatWan}
                  width={56}
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
                      fill={entry.net >= 0 ? chartIncome : chartExpense}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 3 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                月度收支对比
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0 }}>
                近 6 个月
              </Typography>
            </Box>
            {(monthlySeries?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <BarChart data={monthlySeries ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: chartAxis }}
                    tickLine={false}
                    axisLine={{ stroke: chartGrid }}
                    tickFormatter={(month: string) => month.substring(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartAxis }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatWan}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value) => formatAmount(value as number)}
                    labelFormatter={(month) => formatMonthLabel(String(month))}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    iconSize={8}
                    formatter={(value) => <Typography component="span" sx={{ fontSize: '0.75rem' }}>{value}</Typography>}
                  />
                  <Bar
                    dataKey="income"
                    name="收入"
                    fill={chartIncome}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="支出"
                    fill={chartExpense}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : monthlySeries === null ? (
              <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>加载月度数据…</Typography>
              </Box>
            ) : (
              // 成功路径必然有 6 个月的元素，空数组只可能是加载失败
              <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>月度数据加载失败，请重试</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// 概览三栏项：大数字 + 环比（语义色：涨是好事/坏事由指标决定；结余环比按金额）。
function OverviewItem({
  label,
  value,
  change,
  changeGoodWhenUp,
  valueColor,
  changeIsAmount = false,
  dividerLeft,
}: {
  label: string;
  value: number;
  change: number | null;
  changeGoodWhenUp: boolean;
  valueColor: string;
  changeIsAmount?: boolean;
  dividerLeft: boolean;
}) {
  const changeText = changeIsAmount
    ? balanceChangeLabel(change)
    : percentageChangeLabel(change);
  const changeColor = change === null
    ? 'text.secondary'
    : changeGoodWhenUp === change > 0
      ? 'success.main'
      : 'error.main';

  return (
    <Box
      sx={{
        minWidth: 0,
        pl: { sm: dividerLeft ? 3 : 0 },
        pt: { xs: dividerLeft ? 2 : 0, sm: 0 },
        borderLeft: { sm: dividerLeft ? '1px solid' : 0 },
        borderTop: { xs: dividerLeft ? '1px solid' : 0, sm: 0 },
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontFamily: FONT_SERIF,
          color: valueColor,
          ...NUMERIC_TEXT,
        }}
      >
        {formatWan(value)}
      </Typography>
      <Typography variant="caption" sx={{ color: changeColor, fontWeight: 600 }}>
        {changeText}
      </Typography>
    </Box>
  );
}

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  return `${year}年${Number(monthPart)}月`;
}

function percentageChangeLabel(value: number | null): string {
  if (value === null) return '上期为 0';
  const sign = value > 0 ? '+' : '';
  return `较上期 ${sign}${value.toFixed(1)}%`;
}

function balanceChangeLabel(value: number | null): string {
  if (value === null) return '暂无上期对比';
  return `较上期 ${value > 0 ? '+' : ''}${formatWan(value)}`;
}
