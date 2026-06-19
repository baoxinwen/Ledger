import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { categoryApi, tagApi } from '../api';
import { CategoryManager, TagManager, ImportExportManager } from '../components/Settings';

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
      <Typography variant="h4" gutterBottom>
        设置
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="分类管理" />
        <Tab label="标签管理" />
        <Tab label="数据导入导出" />
      </Tabs>

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
    </Box>
  );
}
