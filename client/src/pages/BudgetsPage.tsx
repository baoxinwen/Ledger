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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { budgetApi } from '../api';
import { useCategoryStore } from '../stores/categoryStore';
import type { Budget, BudgetStatus } from '../types';
import BudgetCard from '../components/BudgetCard';

export default function BudgetsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    category_id: '' as number | '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    start_date: new Date().toISOString().substring(0, 7) + '-01',
  });

  const currentMonth = new Date().toISOString().substring(0, 7);

  useEffect(() => {
    fetchCategories();
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const [, statusRes] = await Promise.all([
        budgetApi.getAll(),
        budgetApi.getStatus(currentMonth),
      ]);
      setBudgetStatuses(statusRes.data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

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
      } else {
        await budgetApi.create(data);
      }

      setFormOpen(false);
      setEditingBudget(null);
      resetForm();
      loadBudgets();
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

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

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这个预算吗？')) {
      await budgetApi.delete(id);
      loadBudgets();
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      period: 'monthly',
      start_date: new Date().toISOString().substring(0, 7) + '-01',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">预算管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setEditingBudget(null);
            setFormOpen(true);
          }}
        >
          新增预算
        </Button>
      </Box>

      <Grid container spacing={3}>
        {budgetStatuses.map((status) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={status.budget.id}>
            <BudgetCard
              budgetStatus={status}
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Grid>
        ))}
        {budgetStatuses.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              暂无预算，点击上方按钮创建
            </Typography>
          </Grid>
        )}
      </Grid>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBudget ? '编辑预算' : '新增预算'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="分类（留空为总预算）"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : '' })}
              fullWidth
            >
              <MenuItem value="">总预算</MenuItem>
              {categories.filter((c) => c.type === 'expense').map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="预算金额"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              fullWidth
            />

            <TextField
              select
              label="周期"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'yearly' })}
              fullWidth
            >
              <MenuItem value="monthly">月度</MenuItem>
              <MenuItem value="yearly">年度</MenuItem>
            </TextField>

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
            {editingBudget ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
