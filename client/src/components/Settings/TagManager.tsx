// 标签管理组件：负责标签创建和删除，导入来源标签也会显示在这里。
import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import type { Tag } from '../../types';
import { ConfirmDialog, EmptyState, SectionCard } from '../ui';

interface TagManagerProps {
  tags: Tag[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function TagManager({ tags, onCreate, onDelete }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await onCreate(newTagName.trim());
    setNewTagName('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SectionCard title="标签管理" subtitle={`${tags.length} 个标签`}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(240px, 360px) max-content' },
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <TextField
            data-testid="tag-name-field"
            label="新标签名称"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            size="small"
            fullWidth
            sx={{
              '& .MuiInputBase-root': { height: 40 },
            }}
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newTagName.trim()}
            sx={{ height: 40, minWidth: 112, justifySelf: { xs: 'stretch', sm: 'start' } }}
          >
            添加标签
          </Button>
        </Box>

        {tags.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.name}
                sx={{ height: 30 }}
                onDelete={() => setDeleteTarget(tag)}
              />
            ))}
          </Box>
        ) : (
          <EmptyState title="暂无标签" description="导入来源标签和手动标签会显示在这里" />
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这个标签？"
        description={
          deleteTarget
            ? `将删除「${deleteTarget.name}」标签。此操作无法恢复。`
            : undefined
        }
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
