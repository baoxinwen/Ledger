// 全局快速记账弹窗：挂在 App 层，任何页面（侧边栏按钮/移动 FAB/首页）都能一键记一笔。
// 成功后通过 dataVersion 通知列表/首页/统计重拉数据。
import { useEffect } from 'react';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { useQuickAddStore } from '../stores/quickAddStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { transactionApi, getApiErrorMessage } from '../api';
import TransactionForm from './TransactionForm';

export default function GlobalQuickAdd() {
  const { open, closeQuickAdd } = useQuickAddStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();
  const notifyDataChanged = useTransactionStore((s) => s.notifyDataChanged);
  const showSnackbar = useSnackbarStore((s) => s.showSnackbar);

  useEffect(() => {
    if (!open) return;
    fetchCategories();
    fetchTags();
  }, [open, fetchCategories, fetchTags]);

  const handleCreate = async (data: Parameters<typeof transactionApi.create>[0]): Promise<boolean> => {
    try {
      await transactionApi.create(data);
      showSnackbar('记账成功', 'success');
      // 只广播 dataVersion：各页面（首页/记录页/统计页/预算页）自行按需重拉，
      // 这里不直接 fetchTransactions，避免与页面级监听重复请求。
      notifyDataChanged();
      return true;
    } catch (err) {
      showSnackbar(getApiErrorMessage(err, '创建记录失败，请重试'), 'error');
      console.error('Failed to create transaction:', err);
      return false;
    }
  };

  return (
    <TransactionForm
      open={open}
      onClose={closeQuickAdd}
      onSubmit={handleCreate}
      transaction={null}
      categories={categories}
      tags={tags}
      onCreateTag={createTag}
    />
  );
}
