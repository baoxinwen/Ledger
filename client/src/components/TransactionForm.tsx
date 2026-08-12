// 交易表单：复用在新增和编辑场景，并把常用字段写入表单记忆 store。
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Chip,
  Autocomplete,
} from '@mui/material';
import type { TransactionWithDetails, Category, Tag } from '../types';
import { useFormMemoryStore } from '../stores/formMemoryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { useZonedToday } from '../hooks/useZonedToday';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  transaction?: TransactionWithDetails | null;
  categories: Category[];
  tags: Tag[];
  onCreateTag: (name: string) => Promise<Tag | null>;
}

export default function TransactionForm({
  open,
  onClose,
  onSubmit,
  transaction,
  categories,
  tags,
  onCreateTag,
}: TransactionFormProps) {
  const { transactionForm, setTransactionForm } = useFormMemoryStore();
  const timeZone = useSettingsStore((state) => state.settings.time_zone);
  const today = useZonedToday(timeZone);
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const [type, setType] = useState<'income' | 'expense'>(transactionForm.type);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>(transactionForm.category_id || '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(transactionForm.date || today);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategoryId(transaction.category_id);
      setNote(transaction.note || '');
      setDate(transaction.date);
      setSelectedTags(transaction.tags);
    } else {
      setType(transactionForm.type);
      setAmount('');
      setCategoryId(transactionForm.category_id || '');
      setNote('');
      setDate(transactionForm.date || today);
      setSelectedTags([]);
    }
  }, [today, transaction, transactionForm.category_id, transactionForm.date, transactionForm.type]);

  const filteredCategories = categories.filter((c) => c.type === type);

  // 切换收支类型后，若当前选中的分类不属于新类型则清空，避免“收入交易配支出分类”这类错配提交。
  const handleTypeChange = (value: 'income' | 'expense') => {
    setType(value);
    const stillValid = categories.some((c) => c.type === value && c.id === categoryId);
    if (!stillValid) setCategoryId('');
  };

  const handleSubmit = async () => {
    if (!amount || !categoryId || !date) return;
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      showSnackbar('请输入有效的非负金额', 'error');
      return;
    }

    await onSubmit({
      type,
      amount: parsedAmount,
      category_id: categoryId,
      note: note || undefined,
      date,
      tag_ids: selectedTags.map((t) => t.id),
    });

    // Save form memory for next use
    setTransactionForm({
      type,
      category_id: categoryId,
      date,
    });

    onClose();
  };

  // 仅在用户提交（选择已有标签或回车创建新标签）时按完整名称解析标签，
  // 避免 MUI Autocomplete 的 onInputChange 逐键触发导致垃圾标签入库。
  const handleTagChange = async (value: Array<string | Tag>) => {
    const nextTags: Tag[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) continue;
        const existing = tags.find((tag) => tag.name === name);
        const tag = existing || await onCreateTag(name);
        if (tag) nextTags.push(tag);
      } else {
        nextTags.push(item);
      }
    }
    setSelectedTags(nextTags);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{transaction ? '编辑记录' : '新增记录'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, value) => value && handleTypeChange(value)}
            fullWidth
          >
            <ToggleButton value="expense">支出</ToggleButton>
            <ToggleButton value="income">收入</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="金额"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
          />

          <TextField
            select
            label="分类"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            required
            fullWidth
          >
            {filteredCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            multiple
            freeSolo
            options={tags}
            value={selectedTags}
            onChange={(_, value) => {
              void handleTagChange(value);
            }}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={typeof option === 'string' ? option : option.name} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="标签" placeholder="选择或创建标签" />
            )}
          />

          <TextField
            label="备注"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          <TextField
            label="日期"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!amount || !categoryId || !date}>
          {transaction ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
