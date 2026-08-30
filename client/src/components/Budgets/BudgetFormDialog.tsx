// 预算表单对话框：新增/编辑预算（分类、金额、周期、开始日期）。
// 从 BudgetsPage 内联表单抽出， onSubmit: Promise<boolean> 契约与其他表单一致。
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Box,
} from '@mui/material';
import type { Budget, Category } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';
import { useZonedToday } from '../../hooks/useZonedToday';

interface BudgetFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** 提交成功 resolve(true)，失败 resolve(false)——失败时弹窗保持打开 */
  onSubmit: (data: {
    category_id?: number;
    amount: number;
    period: 'monthly' | 'yearly';
    start_date: string;
  }) => Promise<boolean>;
  budget?: Budget | null;
  categories: Category[];
}

export default function BudgetFormDialog({
  open,
  onClose,
  onSubmit,
  budget,
  categories,
}: BudgetFormDialogProps) {
  const timeZone = useSettingsStore((state) => state.settings.time_zone);
  const today = useZonedToday(timeZone);
  const currentMonthStartDate = `${today.substring(0, 7)}-01`;

  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(currentMonthStartDate);
  const [amountError, setAmountError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (budget) {
      setCategoryId(budget.category_id || '');
      setAmount(String(budget.amount));
      setPeriod(budget.period);
      setStartDate(budget.start_date);
    } else {
      setCategoryId('');
      setAmount('');
      setPeriod('monthly');
      setStartDate(currentMonthStartDate);
    }
    setAmountError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, open]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError('请输入大于 0 的金额');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const success = await onSubmit({
        category_id: categoryId || undefined,
        amount: parsedAmount,
        period,
        start_date: startDate,
      });
      if (success) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{budget ? '编辑预算' : '新增预算'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            select
            label="预算分类"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
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

          <TextField
            label="预算金额"
            type="number"
            inputMode="decimal"
            inputProps={{ min: '0', step: '0.01' }}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError('');
            }}
            required
            fullWidth
            error={Boolean(amountError)}
            helperText={amountError}
            InputProps={{ startAdornment: <Box component="span" sx={{ mr: 1 }}>¥</Box> }}
          />

          <TextField
            select
            label="预算周期"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'monthly' | 'yearly')}
            fullWidth
          >
            <MenuItem value="monthly">月度预算</MenuItem>
            <MenuItem value="yearly">年度预算</MenuItem>
          </TextField>

          <TextField
            label="开始日期"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>取消</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!amount || submitting}>
          {submitting ? '保存中…' : budget ? '保存修改' : '创建预算'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
