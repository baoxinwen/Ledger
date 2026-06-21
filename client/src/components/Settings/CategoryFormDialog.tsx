// 分类表单弹窗：新增和编辑分类共用，保持字段校验一致。
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
} from '@mui/material';
import type { Category } from '../../types';

interface CategoryFormDialogProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSubmit: (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => Promise<void>;
}

export default function CategoryFormDialog({ open, category, onClose, onSubmit }: CategoryFormDialogProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '',
    color: '#1976d2',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        type: category.type,
        icon: category.icon || '',
        color: category.color || '#1976d2',
      });
    } else {
      setForm({
        name: '',
        type: 'expense',
        icon: '',
        color: '#1976d2',
      });
    }
  }, [category?.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ name: '', type: 'expense', icon: '', color: '#1976d2' });
    } catch (err) {
      console.error('Failed to submit category:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{category ? '编辑分类' : '新增分类'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="分类名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            fullWidth
          />

          {!category && (
            <TextField
              select
              label="类型"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
              fullWidth
            >
              <MenuItem value="expense">支出</MenuItem>
              <MenuItem value="income">收入</MenuItem>
            </TextField>
          )}

          <TextField
            label="图标（emoji）"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            fullWidth
          />

          <TextField
            label="颜色"
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!form.name || submitting}
          >
            {submitting ? '保存中...' : (category ? '保存' : '创建')}
          </Button>
      </DialogActions>
    </Dialog>
  );
}
