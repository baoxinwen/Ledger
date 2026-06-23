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
    <Box sx={{ mt: cats === incomeCategories ? 4 : 0 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {cats.length} 个分类
          </Typography>
        </Box>
        {cats === expenseCategories && (
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            sx={{ height: 40, flexShrink: 0 }}
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
            <Card sx={{ height: 72 }}>
              <CardContent sx={{ height: '100%', py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 1.25 }}>
                    <Box
                      data-testid={`category-color-${cat.name}`}
                      sx={{
                        width: 4,
                        height: 40,
                        bgcolor: cat.color || 'divider',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="h5" sx={{ width: 30, textAlign: 'center', flexShrink: 0 }}>{cat.icon || '•'}</Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 600 }}>{cat.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0, textTransform: 'none' }}>
                        {cat.is_preset ? '预置分类' : '自定义分类'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: 72, display: 'flex', justifyContent: 'flex-end' }}>
                    {!cat.is_preset && (
                      <>
                        <IconButton size="small" onClick={() => handleEdit(cat)} aria-label={`编辑${cat.name}`}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(cat.id)} aria-label={`删除${cat.name}`}>
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
    </Box>
  );

  return (
    <Box>
      {renderCategoryGrid('支出分类', expenseCategories)}
      {renderCategoryGrid('收入分类', incomeCategories)}

      <CategoryFormDialog
        open={formOpen}
        category={editingCategory}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
