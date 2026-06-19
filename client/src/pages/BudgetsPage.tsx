import { useEffect, useState } from 'react';
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
  useTheme,
  useMediaQuery,
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
import type { Budget, BudgetStatus } from '../types';
import { formatAmount, calculatePercentage } from '../utils/format';

/** 预算管理页面 */
export default function BudgetsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const { showSnackbar } = useSnackbarStore();
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 表单数据
  const [formData, setFormData] = useState({
    category_id: '' as number | '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    start_date: new Date().toISOString().substring(0, 7) + '-01',
  });

  // 当前月份，用于查询预算状态
  const currentMonth = new Date().toISOString().substring(0, 7);

  useEffect(() => {
    fetchCategories();
    loadBudgets();
  }, []);

  /** 加载预算列表和状态 */
  const loadBudgets = async () => {
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
  };

  /** 提交预算表单（新增/编辑） */
  const handleSubmit = async () => {
    try {
      const data = {
        category_id: formData.category_id || undefined,
        amount: parseFloat(formData.amount),
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

  /** 删除预算 */
  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这个预算吗？')) {
      try {
        await budgetApi.delete(id);
        showSnackbar('预算删除成功', 'success');
        loadBudgets();
      } catch (error) {
        console.error('删除预算失败:', error);
        showSnackbar('删除预算失败', 'error');
      }
    }
  };

  /** 重置表单 */
  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      period: 'monthly',
      start_date: new Date().toISOString().substring(0, 7) + '-01',
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
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="caption"
          sx={{ color: 'secondary.main', mb: 1, display: 'block' }}
        >
          预算管理
        </Typography>
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          gap: isMobile ? 2 : 0,
        }}>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                mb: 0.5,
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              预算概览
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {currentMonth} 月度预算执行情况
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setEditingBudget(null);
              setFormOpen(true);
            }}
            fullWidth={isMobile}
          >
            新增预算
          </Button>
        </Box>
      </Box>

      {/* 总览卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
            color: '#fff',
            border: 'none',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ opacity: 0.8, fontSize: '0.875rem' }}>
                    总预算
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, mt: 1 }}>
                    {formatAmount(totalBudget)}
                  </Typography>
                </Box>
                <BudgetIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            background: hasOverBudget
              ? 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)'
              : 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
            color: '#fff',
            border: 'none',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ opacity: 0.8, fontSize: '0.875rem' }}>
                    已花费
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, mt: 1 }}>
                    {formatAmount(totalSpent)}
                  </Typography>
                </Box>
                <SpentIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            background: totalRemaining >= 0
              ? 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)'
              : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: '#fff',
            border: 'none',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ opacity: 0.8, fontSize: '0.875rem' }}>
                    {totalRemaining >= 0 ? '剩余预算' : '超支金额'}
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, mt: 1 }}>
                    {formatAmount(Math.abs(totalRemaining))}
                  </Typography>
                </Box>
                {hasOverBudget ? (
                  <WarningIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                ) : (
                  <RemainingIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                )}
              </Box>
            </CardContent>
          </Card>
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
                      <IconButton size="small" onClick={() => handleEdit(status.budget)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(status.budget.id)}>
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
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <BudgetIcon sx={{ fontSize: 64, color: 'divider', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  暂无预算
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  点击上方按钮创建您的第一个预算
                </Typography>
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
              </CardContent>
            </Card>
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
    </Box>
  );
}
