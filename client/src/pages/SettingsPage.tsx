// 设置页：集中管理分类、标签以及数据导入导出。
import { useEffect, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useSnackbarStore } from '../stores/snackbarStore';
import { categoryApi, tagApi, getApiErrorMessage } from '../api';
import { BackupRestoreManager, CategoryManager, TagManager, ImportExportManager, PreferenceManager } from '../components/Settings';
import { PageHeader } from '../components/ui';

export default function SettingsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();
  const invalidateTransactions = useTransactionStore((state) => state.invalidateTransactions);
  const { showSnackbar } = useSnackbarStore();
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  // 写操作统一返回 boolean：true 才让弹窗关闭/输入清空；失败时在此层弹出后端错误信息，
  // 组件保留表单状态（修复此前三层吞错导致的"假成功"）。
  const handleCreateCategory = async (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }): Promise<boolean> => {
    try {
      await categoryApi.create(data);
      fetchCategories();
      return true;
    } catch (error) {
      showSnackbar(getApiErrorMessage(error, '创建分类失败，请重试'), 'error');
      console.error('Failed to create category:', error);
      return false;
    }
  };

  const handleUpdateCategory = async (id: number, data: { name?: string; icon?: string; color?: string }): Promise<boolean> => {
    try {
      await categoryApi.update(id, data);
      fetchCategories();
      return true;
    } catch (error) {
      showSnackbar(getApiErrorMessage(error, '更新分类失败，请重试'), 'error');
      console.error('Failed to update category:', error);
      return false;
    }
  };

  const handleDeleteCategory = async (id: number): Promise<boolean> => {
    try {
      await categoryApi.delete(id);
      fetchCategories();
      return true;
    } catch (error) {
      showSnackbar(getApiErrorMessage(error, '删除分类失败，请重试'), 'error');
      console.error('Failed to delete category:', error);
      return false;
    }
  };

  const handleCreateTag = async (name: string): Promise<boolean> => {
    const tag = await createTag(name);
    if (!tag) {
      showSnackbar('创建标签失败，请重试', 'error');
      return false;
    }
    return true;
  };

  const handleDeleteTag = async (id: number): Promise<boolean> => {
    try {
      await tagApi.delete(id);
      fetchTags();
      // 已删标签仍嵌在缓存的交易列表里，不失效会导致编辑携带死 tag_id 提交而 500。
      invalidateTransactions();
      return true;
    } catch (error) {
      showSnackbar(getApiErrorMessage(error, '删除标签失败，请重试'), 'error');
      console.error('Failed to delete tag:', error);
      return false;
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="应用设置"
        title="设置"
        description="管理分类、标签、数据备份和个人偏好"
      />

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 44,
          '& .MuiTab-root': {
            minHeight: 44,
            px: 2,
          },
        }}
      >
        <Tab label="分类管理" />
        <Tab label="标签管理" />
        <Tab label="数据导入导出" />
        <Tab label="备份与恢复" />
        <Tab label="偏好设置" />
      </Tabs>

      <Box sx={{ pt: 0.5 }}>
        {tabValue === 0 && (
          <CategoryManager
            categories={categories}
            onCreate={handleCreateCategory}
            onUpdate={handleUpdateCategory}
            onDelete={handleDeleteCategory}
          />
        )}

        {tabValue === 1 && (
          <TagManager
            tags={tags}
            onCreate={handleCreateTag}
            onDelete={handleDeleteTag}
          />
        )}

        {tabValue === 2 && (
          <ImportExportManager
            onImportComplete={() => {
              fetchCategories();
              fetchTags();
            }}
          />
        )}

        {tabValue === 3 && (
          <BackupRestoreManager />
        )}

        {tabValue === 4 && (
          <PreferenceManager />
        )}
      </Box>
    </Box>
  );
}
