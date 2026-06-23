// 设置页：集中管理分类、标签以及数据导入导出。
import { useEffect, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { categoryApi, tagApi } from '../api';
import { CategoryManager, TagManager, ImportExportManager, PreferenceManager } from '../components/Settings';
import { PageHeader } from '../components/ui';

export default function SettingsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  const handleCreateCategory = async (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => {
    try {
      await categoryApi.create(data);
      fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async (id: number, data: { name?: string; icon?: string; color?: string }) => {
    try {
      await categoryApi.update(id, data);
      fetchCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await categoryApi.delete(id);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      await createTag(name);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleDeleteTag = async (id: number) => {
    try {
      await tagApi.delete(id);
      fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
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
          <PreferenceManager />
        )}
      </Box>
    </Box>
  );
}
