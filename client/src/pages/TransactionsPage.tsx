import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTransactionStore } from '../stores/transactionStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import type { TransactionWithDetails, TransactionFilter } from '../types';
import { transactionApi } from '../api';
import FilterPanel from '../components/FilterPanel';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';

export default function TransactionsPage() {
  const { transactions, total, filter, fetchTransactions, setFilter } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchTags();
  }, []);

  const handleFilterChange = (newFilter: TransactionFilter) => {
    setFilter(newFilter);
    fetchTransactions(newFilter);
  };

  const handleClearFilter = () => {
    const defaultFilter: TransactionFilter = { page: 1, limit: 20 };
    setFilter(defaultFilter);
    fetchTransactions(defaultFilter);
  };

  const handlePageChange = (page: number) => {
    handleFilterChange({ ...filter, page });
  };

  const handleRowsPerPageChange = (limit: number) => {
    handleFilterChange({ ...filter, limit, page: 1 });
  };

  const handleCreate = async (data: any) => {
    await transactionApi.create(data);
    fetchTransactions();
  };

  const handleUpdate = async (data: any) => {
    if (editingTransaction) {
      await transactionApi.update(editingTransaction.id, data);
      fetchTransactions();
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await transactionApi.delete(id);
      fetchTransactions();
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">收支记录</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          新增记录
        </Button>
      </Box>

      <FilterPanel
        filter={filter}
        categories={categories}
        tags={tags}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilter}
      />

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

      <TransactionForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingTransaction ? handleUpdate : handleCreate}
        transaction={editingTransaction}
        categories={categories}
        tags={tags}
        onCreateTag={createTag}
      />
    </Box>
  );
}
