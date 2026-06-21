// 分类管理组件：负责分类列表、创建、编辑和删除交互。
import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { Category } from '../../types';
import CategoryFormDialog from './CategoryFormDialog';

interface CategoryManagerProps {
  categories: Category[];
  onCreate: (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => Promise<void>;
  onUpdate: (id: number, data: { name?: string; icon?: string; color?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function CategoryManager({ categories, onCreate, onUpdate, onDelete }: CategoryManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleSubmit = async (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => {
    try {
      if (editingCategory) {
        const { type: _type, ...updateData } = data;
        await onUpdate(editingCategory.id, updateData);
      } else {
        await onCreate(data);
      }
      setFormOpen(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Category operation failed:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这个分类吗？')) {
      try {
        await onDelete(id);
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };

  const renderCategoryGrid = (title: string, cats: Category[]) => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, mt: cats === incomeCategories ? 4 : 0 }}>
        <Typography variant="h5">{title}</Typography>
        {cats === expenseCategories && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingCategory(null);
              setFormOpen(true);
            }}
          >
            新增分类
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {cats.map((cat) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ mr: 1 }}>{cat.icon}</Typography>
                    <Typography>{cat.name}</Typography>
                  </Box>
                  <Box>
                    {!cat.is_preset && (
                      <>
                        <IconButton size="small" onClick={() => handleEdit(cat)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(cat.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );

  return (
    <Box>
      {renderCategoryGrid('支出分类', expenseCategories)}
      {renderCategoryGrid('收入分类', incomeCategories)}

      <CategoryFormDialog
        open={formOpen}
        category={editingCategory}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
