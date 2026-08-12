// 收支记录页：组合筛选器、分页列表和新增/编辑弹窗。
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import type { TransactionWithDetails, TransactionFilter } from '../types';
import { transactionApi } from '../api';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import { ConfirmDialog, PageHeader } from '../components/ui';

export default function TransactionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { transactions, total, filter, fetchTransactions, setFilter } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [keywordInput, setKeywordInput] = useState(filter.keyword || '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 始终持有最新 filter，供防抖回调读取，避免闭包捕获过期筛选条件（如在防抖窗口内切换了类型/分类）。
  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  const { showSnackbar } = useSnackbarStore();

  useEffect(() => {
    fetchTransactions({}).catch(() => showSnackbar('加载记录失败，请重试', 'error'));
    fetchCategories();
    fetchTags();
  }, []);

  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (!state?.openCreate) return;

    setEditingTransaction(null);
    setFormOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  // Debounce keyword search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      const latestFilter = filterRef.current;
      if (keywordInput !== (latestFilter.keyword || '')) {
        handleFilterChange({ ...latestFilter, keyword: keywordInput || undefined, page: 1 });
      }
    }, 400);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [keywordInput]);

  const handleFilterChange = useCallback((newFilter: TransactionFilter) => {
    setFilter(newFilter);
    fetchTransactions(newFilter).catch(() => showSnackbar('加载记录失败，请重试', 'error'));
  }, [setFilter, fetchTransactions, showSnackbar]);

  const handleClearFilter = () => {
    const defaultFilter: TransactionFilter = { page: 1, limit: 20 };
    setFilter(defaultFilter);
    setKeywordInput('');
    fetchTransactions(defaultFilter).catch(() => showSnackbar('加载记录失败，请重试', 'error'));
  };

  const handlePageChange = (page: number) => {
    handleFilterChange({ ...filter, page });
  };

  const handleRowsPerPageChange = (limit: number) => {
    handleFilterChange({ ...filter, limit, page: 1 });
  };

  const handleCreate = async (data: any) => {
    try {
      await transactionApi.create(data);
      showSnackbar('记录创建成功', 'success');
      await fetchTransactions();
    } catch (err) {
      showSnackbar('创建记录失败，请重试', 'error');
      console.error('Failed to create transaction:', err);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingTransaction) return;
    try {
      await transactionApi.update(editingTransaction.id, data);
      showSnackbar('记录更新成功', 'success');
      await fetchTransactions();
    } catch (err) {
      showSnackbar('更新记录失败，请重试', 'error');
      console.error('Failed to update transaction:', err);
    }
  };

  const handleDelete = (transaction: TransactionWithDetails) => {
    setDeleteTarget(transaction);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await transactionApi.delete(deleteTarget.id);
      showSnackbar('记录删除成功', 'success');
      setDeleteTarget(null);
      await fetchTransactions();
    } catch (err) {
      showSnackbar('删除记录失败，请重试', 'error');
      console.error('Failed to delete transaction:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingTransaction(null);
  };

  const hasFilters = filter.type || filter.category_id != null || filter.tag_id != null ||
    filter.start_date || filter.end_date || filter.keyword ||
    filter.min_amount != null || filter.max_amount != null;

  const hasAmountError = filter.min_amount != null && filter.max_amount != null &&
    filter.min_amount > filter.max_amount;

  return (
    <Box>
      <PageHeader
        eyebrow="财务记录"
        title="收支记录"
        meta={`共 ${total} 条记录`}
        action={(
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
            fullWidth
          >
            新增记录
          </Button>
        )}
      />

      <Grid container spacing={3}>
        {/* Left Sidebar - Filters */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{
              position: { md: 'sticky' },
              top: { md: 80 },
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
                筛选条件
              </Typography>

              {/* Search */}
              <TextField
                fullWidth
                size="small"
                placeholder="搜索备注..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Type Filter */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  类型
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label="全部"
                    size="small"
                    variant={!filter.type ? 'filled' : 'outlined'}
                    color={!filter.type ? 'primary' : 'default'}
                    onClick={() => handleFilterChange({ ...filter, type: undefined, page: 1 })}
                    sx={{ flex: 1 }}
                  />
                  <Chip
                    label="支出"
                    size="small"
                    variant={filter.type === 'expense' ? 'filled' : 'outlined'}
                    color={filter.type === 'expense' ? 'error' : 'default'}
                    onClick={() => handleFilterChange({ ...filter, type: 'expense', page: 1 })}
                    sx={{ flex: 1 }}
                  />
                  <Chip
                    label="收入"
                    size="small"
                    variant={filter.type === 'income' ? 'filled' : 'outlined'}
                    color={filter.type === 'income' ? 'success' : 'default'}
                    onClick={() => handleFilterChange({ ...filter, type: 'income', page: 1 })}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>

              {/* Category Filter */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  分类
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={filter.category_id ?? ''}
                  onChange={(e) => handleFilterChange({ ...filter, category_id: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                >
                  <MenuItem value="">全部分类</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Tag Filter */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  标签
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={filter.tag_id ?? ''}
                  onChange={(e) => handleFilterChange({ ...filter, tag_id: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                >
                  <MenuItem value="">全部标签</MenuItem>
                  {tags.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Date Range */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  日期范围
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  label="开始日期"
                  value={filter.start_date || ''}
                  onChange={(e) => handleFilterChange({ ...filter, start_date: e.target.value || undefined, page: 1 })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  label="结束日期"
                  value={filter.end_date || ''}
                  onChange={(e) => handleFilterChange({ ...filter, end_date: e.target.value || undefined, page: 1 })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              {/* Amount Range */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  金额范围
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    type="number"
                    size="small"
                    placeholder="最小"
                    value={filter.min_amount ?? ''}
                    onChange={(e) => handleFilterChange({ ...filter, min_amount: e.target.value !== '' ? Number(e.target.value) : undefined, page: 1 })}
                    fullWidth
                    error={hasAmountError}
                  />
                  <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                  <TextField
                    type="number"
                    size="small"
                    placeholder="最大"
                    value={filter.max_amount ?? ''}
                    onChange={(e) => handleFilterChange({ ...filter, max_amount: e.target.value !== '' ? Number(e.target.value) : undefined, page: 1 })}
                    fullWidth
                    error={hasAmountError}
                  />
                </Box>
                {hasAmountError && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    最小值不能大于最大值
                  </Typography>
                )}
              </Box>

              {/* Clear Filters */}
              {hasFilters && (
                <Button
                  fullWidth
                  onClick={handleClearFilter}
                  sx={{ color: 'text.secondary' }}
                >
                  清除所有筛选
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right - Transaction List */}
        <Grid size={{ xs: 12, md: 9 }}>
          <TransactionList
            transactions={transactions}
            total={total}
            page={filter.page || 1}
            rowsPerPage={filter.limit || 20}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Grid>
      </Grid>

      <TransactionForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingTransaction ? handleUpdate : handleCreate}
        transaction={editingTransaction}
        categories={categories}
        tags={tags}
        onCreateTag={createTag}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这条记录？"
        description={
          deleteTarget
            ? `将删除「${deleteTarget.note || deleteTarget.category.name}」这条记录。此操作无法恢复。`
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
