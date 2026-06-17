import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { categoryApi, importExportApi, tagApi } from '../api';
import type { Category } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();
  const [tabValue, setTabValue] = useState(0);

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '',
    color: '#1976d2',
  });

  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  const handleCreateCategory = async () => {
    try {
      await categoryApi.create(categoryForm);
      setCategoryFormOpen(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    try {
      await categoryApi.update(editingCategory.id, {
        name: categoryForm.name,
        icon: categoryForm.icon,
        color: categoryForm.color,
      });
      setCategoryFormOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('确定要删除这个分类吗？')) {
      await categoryApi.delete(id);
      fetchCategories();
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim());
    setNewTagName('');
  };

  const handleDeleteTag = async (id: number) => {
    await tagApi.delete(id);
    fetchTags();
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await importExportApi.export(format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger-export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      let transactions;
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        transactions = data.transactions || data;
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        transactions = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',');
          return {
            date: values[0],
            type: values[1],
            category: values[2],
            amount: parseFloat(values[3]),
            tags: values[4] ? values[4].split(';') : [],
            note: values[5] || '',
          };
        });
      }

      if (transactions) {
        const result = await importExportApi.import(transactions);
        alert(`导入完成: 成功 ${result.data.success} 条, 失败 ${result.data.failed} 条`);
        fetchCategories();
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to import:', error);
      alert('导入失败，请检查文件格式');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      type: 'expense',
      icon: '',
      color: '#1976d2',
    });
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

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

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">支出分类</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              resetCategoryForm();
              setEditingCategory(null);
              setCategoryFormOpen(true);
            }}
          >
            新增分类
          </Button>
        </Box>

        <Grid container spacing={2}>
          {expenseCategories.map((cat) => (
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
                          <IconButton size="small" onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              name: cat.name,
                              type: cat.type,
                              icon: cat.icon || '',
                              color: cat.color || '#1976d2',
                            });
                            setCategoryFormOpen(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)}>
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

        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="h5">收入分类</Typography>
        </Box>

        <Grid container spacing={2}>
          {incomeCategories.map((cat) => (
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
                          <IconButton size="small" onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              name: cat.name,
                              type: cat.type,
                              icon: cat.icon || '',
                              color: cat.color || '#1976d2',
                            });
                            setCategoryFormOpen(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)}>
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
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h5" gutterBottom>标签管理</Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="新标签名称"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            size="small"
          />
          <Button variant="contained" onClick={handleCreateTag} disabled={!newTagName.trim()}>
            添加标签
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              onDelete={() => handleDeleteTag(tag.id)}
            />
          ))}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" gutterBottom>数据导入导出</Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>导出数据</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  将所有收支记录导出为文件
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('json')}
                  >
                    导出 JSON
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('csv')}
                  >
                    导出 CSV
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>导入数据</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  从 JSON 或 CSV 文件导入收支记录
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  选择文件
                  <input
                    type="file"
                    hidden
                    accept=".json,.csv"
                    onChange={handleImport}
                  />
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <Dialog open={categoryFormOpen} onClose={() => setCategoryFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? '编辑分类' : '新增分类'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="分类名称"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              required
              fullWidth
            />

            {!editingCategory && (
              <TextField
                select
                label="类型"
                value={categoryForm.type}
                onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as 'income' | 'expense' })}
                fullWidth
              >
                <MenuItem value="expense">支出</MenuItem>
                <MenuItem value="income">收入</MenuItem>
              </TextField>
            )}

            <TextField
              label="图标（emoji）"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              fullWidth
            />

            <TextField
              label="颜色"
              type="color"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryFormOpen(false)}>取消</Button>
          <Button
            onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
            variant="contained"
            disabled={!categoryForm.name}
          >
            {editingCategory ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
