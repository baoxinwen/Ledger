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

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
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
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
      setType('expense');
      setAmount('');
      setCategoryId('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedTags([]);
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = () => {
    if (!amount || !categoryId || !date) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      category_id: categoryId,
      note: note || undefined,
      date,
      tag_ids: selectedTags.map((t) => t.id),
    });

    onClose();
  };

  const handleCreateTag = async (name: string) => {
    const newTag = await onCreateTag(name);
    if (newTag) {
      setSelectedTags([...selectedTags, newTag]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{transaction ? '编辑记录' : '新增记录'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, value) => value && setType(value)}
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
            options={tags}
            value={selectedTags}
            onChange={(_, value) => setSelectedTags(value.filter((v): v is Tag => typeof v !== 'string'))}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={typeof option === 'string' ? option : option.name} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="标签" placeholder="选择或创建标签" />
            )}
            freeSolo
            onInputChange={(_, value, reason) => {
              if (reason === 'input' && value) {
                const existing = tags.find((t) => t.name === value);
                if (!existing) {
                  handleCreateTag(value);
                }
              }
            }}
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
