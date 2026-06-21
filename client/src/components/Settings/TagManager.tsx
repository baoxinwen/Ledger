// 标签管理组件：负责标签创建和删除，导入来源标签也会显示在这里。
import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import type { Tag } from '../../types';

interface TagManagerProps {
  tags: Tag[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function TagManager({ tags, onCreate, onDelete }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await onCreate(newTagName.trim());
    setNewTagName('');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>标签管理</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="新标签名称"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={handleCreate} disabled={!newTagName.trim()}>
          添加标签
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            label={tag.name}
            onDelete={async () => {
              if (window.confirm('确定要删除这个标签吗？')) {
                try {
                  await onDelete(tag.id);
                } catch (error) {
                  console.error('Failed to delete tag:', error);
                }
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
