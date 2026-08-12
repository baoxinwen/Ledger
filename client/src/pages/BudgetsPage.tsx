// 预算页：管理月度/年度预算，并展示每个预算的执行状态。
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance as BudgetIcon,
  TrendingDown as SpentIcon,
  Savings as RemainingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { budgetApi } from '../api';
import { useCategoryStore } from '../stores/categoryStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useZonedToday } from '../hooks/useZonedToday';
import type { Budget, BudgetStatus } from '../types';
import { formatAmount, calculatePercentage } from '../utils/format';
import { ConfirmDialog, EmptyState, MetricCard, PageHeader } from '../components/ui';

/** 预算管理页面 */
export default function BudgetsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const { showSnackbar } = useSnackbarStore();
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const timeZone = useSettingsStore((state) => state.settings.time_zone);
  const today = useZonedToday(timeZone);
  const currentMonth = today.substring(0, 7);
  const currentMonthStartDate = `${currentMonth}-01`;

  // 表单数据
  const [formData, setFormData] = useState({
    category_id: '' as number | '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    start_date: currentMonthStartDate,
  });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /** 加载预算列表和状态 */
  const loadBudgets = useCallback(async () => {
    try {
      const [, statusRes] = await Promise.all([
        budgetApi.getAll(),
        budgetApi.getStatus(currentMonth),
      ]);
      setBudgetStatuses(statusRes.data);
    } catch (error) {
      console.error('加载预算失败:', error);
      showSnackbar('加载预算数据失败', 'error');
    }
  }, [currentMonth, showSnackbar]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  /** 提交预算表单（新增/编辑） */
  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showSnackbar('请输入有效的预算金额（大于 0）', 'error');
      return;
    }
    try {
      const data = {
        category_id: formData.category_id || undefined,
        amount,
        period: formData.period,
        start_date: formData.start_date,
      };

      if (editingBudget) {
        await budgetApi.update(editingBudget.id, data);
        showSnackbar('预算更新成功', 'success');
      } else {
        await budgetApi.create(data);
        showSnackbar('预算创建成功', 'success');
      }

      setFormOpen(false);
      setEditingBudget(null);
      resetForm();
      loadBudgets();
    } catch (error) {
      console.error('保存预算失败:', error);
      showSnackbar('保存预算失败，请重试', 'error');
    }
  };

  /** 编辑预算 */
  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id || '',
      amount: String(budget.amount),
      period: budget.period,
      start_date: budget.start_date,
    });
    setFormOpen(true);
  };

  /** 打开预算删除确认弹窗，真正删除在确认按钮里执行。 */
  const handleDelete = (status: BudgetStatus) => {
    setDeleteTarget(status);
  };

  /** 确认删除预算 */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await budgetApi.delete(deleteTarget.budget.id);
      showSnackbar('预算删除成功', 'success');
      setDeleteTarget(null);
      loadBudgets();
    } catch (error) {
      console.error('删除预算失败:', error);
      showSnackbar('删除预算失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /** 重置表单 */
  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      period: 'monthly',
      start_date: currentMonthStartDate,
    });
  };

  /** 计算总预算统计 */
  const totalBudget = budgetStatuses.reduce((sum, s) => sum + s.budget.amount, 0);
  const totalSpent = budgetStatuses.reduce((sum, s) => sum + s.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPercentage = calculatePercentage(totalSpent, totalBudget);
  const hasOverBudget = budgetStatuses.some((s) => s.spent > s.budget.amount);

  /** 获取分类名称 */
  const getCategoryName = (budget: Budget) => {
    if (!budget.category_id) return '总预算';
    const category = categories.find((c) => c.id === budget.category_id);
    return category ? `${category.icon} ${category.name}` : '未知分类';
  };

  return (
    <Box>
      <PageHeader
        eyebrow="预算管理"
        title="预算概览"
        description={`${currentMonth} 月度预算执行情况`}
        action={(
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setEditingBudget(null);
              setFormOpen(true);
            }}
            fullWidth
          >
            新增预算
          </Button>
        )}
      />

      {/* 总览卡片 */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            testId="budget-total-card"
            label="总预算"
            value={formatAmount(totalBudget)}
            helper="当前周期预算额度"
            icon={<BudgetIcon />}
            tone="gold"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            testId="budget-spent-card"
            label="已花费"
            value={formatAmount(totalSpent)}
            helper={hasOverBudget ? '存在超支预算' : '仍在预算范围内'}
            icon={<SpentIcon />}
            tone={hasOverBudget ? 'expense' : 'neutral'}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            testId="budget-remaining-card"
            label={totalRemaining >= 0 ? '剩余预算' : '超支金额'}
            value={formatAmount(Math.abs(totalRemaining))}
            helper={`${totalPercentage.toFixed(1)}% 已使用`}
            icon={hasOverBudget ? <WarningIcon /> : <RemainingIcon />}
            tone={totalRemaining >= 0 ? 'income' : 'expense'}
          />
        </Grid>
      </Grid>

      {/* 总体进度条 */}
      {budgetStatuses.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                总体使用情况
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(totalPercentage, 100)}
              color={totalPercentage > 100 ? 'error' : 'primary'}
              sx={{ height: 12, borderRadius: 6 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                已使用 {formatAmount(totalSpent)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                总预算 {formatAmount(totalBudget)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 分类预算列表 */}
      <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Playfair Display", serif' }}>
        分类预算
      </Typography>

      <Grid container spacing={3}>
        {budgetStatuses.map((status) => {
          const percentage = calculatePercentage(status.spent, status.budget.amount);
          const isOverBudget = status.spent > status.budget.amount;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={status.budget.id}>
              <Card sx={{
                border: isOverBudget ? '2px solid' : '1px solid',
                borderColor: isOverBudget ? 'error.main' : 'divider',
              }}>
                <CardContent>
                  {/* 标题栏 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {getCategoryName(status.budget)}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {status.budget.period === 'monthly' ? '月度预算' : '年度预算'}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" aria-label={`编辑${getCategoryName(status.budget)}预算`} onClick={() => handleEdit(status.budget)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(status)} aria-label={`删除${getCategoryName(status.budget)}预算`}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* 进度条 */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        已花费
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatAmount(status.spent)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(percentage, 100)}
                      color={isOverBudget ? 'error' : percentage > 80 ? 'warning' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        预算 {formatAmount(status.budget.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>

                  {/* 状态标签 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={isOverBudget
                        ? `超支 ${formatAmount(Math.abs(status.remaining))}`
                        : `剩余 ${formatAmount(status.remaining)}`
                      }
                      color={isOverBudget ? 'error' : 'success'}
                      size="small"
                      variant="outlined"
                    />
                    {isOverBudget && (
                      <Chip
                        icon={<WarningIcon />}
                        label="超支预警"
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {/* 空状态 */}
        {budgetStatuses.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <EmptyState
              icon={<BudgetIcon sx={{ fontSize: 56 }} />}
              title="暂无预算"
              description="点击上方按钮创建您的第一个预算"
              action={(
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetForm();
                    setEditingBudget(null);
                    setFormOpen(true);
                  }}
                >
                  创建预算
                </Button>
              )}
            />
          </Grid>
        )}
      </Grid>

      {/* 预算表单对话框 */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBudget ? '编辑预算' : '新增预算'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* 分类选择 */}
            <TextField
              select
              label="预算分类"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : '' })}
              fullWidth
              helperText="留空表示总预算，选择分类表示该分类的预算"
            >
              <MenuItem value="">总预算</MenuItem>
              {categories.filter((c) => c.type === 'expense').map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </MenuItem>
              ))}
            </TextField>

            {/* 预算金额 */}
            <TextField
              label="预算金额"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              fullWidth
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
              }}
            />

            {/* 预算周期 */}
            <TextField
              select
              label="预算周期"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'yearly' })}
              fullWidth
            >
              <MenuItem value="monthly">月度预算</MenuItem>
              <MenuItem value="yearly">年度预算</MenuItem>
            </TextField>

            {/* 开始日期 */}
            <TextField
              label="开始日期"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.amount}>
            {editingBudget ? '保存修改' : '创建预算'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这个预算？"
        description={
          deleteTarget
            ? `将删除「${getCategoryName(deleteTarget.budget)}」预算。此操作无法恢复。`
            : undefined
        }
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
}
