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
import { suggestCategoryFormColor } from '../../utils/categoryColor';

interface CategoryFormDialogProps {
  open: boolean;
  category: Category | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => Promise<void>;
}

export default function CategoryFormDialog({ open, category, categories, onClose, onSubmit }: CategoryFormDialogProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '',
    color: '#5F6F52',
  });
  const [submitting, setSubmitting] = useState(false);
  const [colorTouched, setColorTouched] = useState(false);

  useEffect(() => {
    setColorTouched(false);
    if (category) {
      setForm({
        name: category.name,
        type: category.type,
        icon: category.icon || '',
        color: category.color || suggestCategoryFormColor(category.type, category.name, categories),
      });
    } else {
      const type = 'expense';
      setForm({
        name: '',
        type,
        icon: '',
        color: suggestCategoryFormColor(type, '', categories),
      });
    }
  }, [category?.id, categories, open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ name: '', type: 'expense', icon: '', color: suggestCategoryFormColor('expense', '', categories) });
      setColorTouched(false);
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
            onChange={(e) => {
              const name = e.target.value;
              setForm({
                ...form,
                name,
                color: category || colorTouched ? form.color : suggestCategoryFormColor(form.type, name, categories),
              });
            }}
            required
            fullWidth
          />

          {!category && (
            <TextField
              select
              label="类型"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as 'income' | 'expense';
                setForm({
                  ...form,
                  type,
                  color: colorTouched ? form.color : suggestCategoryFormColor(type, form.name, categories),
                });
              }}
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
            onChange={(e) => {
              setColorTouched(true);
              setForm({ ...form, color: e.target.value });
            }}
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
