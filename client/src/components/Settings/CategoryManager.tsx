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
import { CategoryAvatar, ConfirmDialog, HoverActions } from '../ui';
import CategoryFormDialog from './CategoryFormDialog';

interface CategoryManagerProps {
  categories: Category[];
  onCreate: (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => Promise<boolean>;
  onUpdate: (id: number, data: { name?: string; icon?: string; color?: string }) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

export default function CategoryManager({ categories, onCreate, onUpdate, onDelete }: CategoryManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 新建分类时预置的类型：从支出/收入区按钮分别进入时对应不同类型。
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense');

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const openCreate = (type: 'income' | 'expense') => {
    setEditingCategory(null);
    setDefaultType(type);
    setFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleSubmit = async (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) => {
    const success = editingCategory
      ? await onUpdate(editingCategory.id, {
        name: data.name,
        icon: data.icon,
        color: data.color,
      })
      : await onCreate(data);
    // 失败时保留弹窗与已填内容（错误提示由页面层统一弹出），只有成功才关闭。
    if (!success) return;
    setFormOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = (category: Category) => {
    setDeleteTarget(category);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      const success = await onDelete(deleteTarget.id);
      if (!success) return; // 失败保留确认框，让用户可以重试或取消
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          sx={{ height: 40, flexShrink: 0 }}
          onClick={() => openCreate(cats === expenseCategories ? 'expense' : 'income')}
        >
          新增分类
        </Button>
      </Box>

      <Grid container spacing={2}>
        {cats.map((cat) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
            <Card className="hover-actions-host" sx={{ height: 64 }}>
              <CardContent sx={{ height: '100%', py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 1.25 }}>
                    <Box
                      data-testid={`category-color-${cat.name}`}
                      sx={{
                        width: 4,
                        height: 36,
                        bgcolor: cat.color || 'divider',
                        flexShrink: 0,
                      }}
                    />
                    <CategoryAvatar category={cat} size={32} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 600 }}>{cat.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0, textTransform: 'none' }}>
                        {cat.is_preset ? '预置分类' : '自定义分类'}
                      </Typography>
                    </Box>
                  </Box>
                  {!cat.is_preset && (
                    <HoverActions>
                      <IconButton size="small" onClick={() => handleEdit(cat)} aria-label={`编辑${cat.name}`}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(cat)} aria-label={`删除${cat.name}`}>
                        <DeleteIcon />
                      </IconButton>
                    </HoverActions>
                  )}
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
        defaultType={defaultType}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这个分类？"
        description={
          deleteTarget
            ? `将删除「${deleteTarget.name}」分类。此操作无法恢复。`
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
