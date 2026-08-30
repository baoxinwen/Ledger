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
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

export default function TagManager({ tags, onCreate, onDelete }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      // 失败时保留输入框内容（错误提示由页面层统一弹出），只有成功才清空。
      const success = await onCreate(name);
      if (success) setNewTagName('');
    } finally {
      setCreating(false);
    }
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
            disabled={!newTagName.trim() || creating}
            sx={{ height: 40, minWidth: 112, justifySelf: { xs: 'stretch', sm: 'start' } }}
          >
            添加标签
          </Button>
        </Box>

        {tags.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag) => {
              const usage = tag.usage_count ?? 0;
              return (
                <Chip
                  key={tag.id}
                  label={usage > 0 ? `${tag.name} × ${usage}` : `${tag.name} · 未使用`}
                  onDelete={() => setDeleteTarget(tag)}
                  // 零使用标签弱化显示，提示可清理
                  sx={usage === 0
                    ? { height: 30, color: 'text.disabled', bgcolor: 'action.hover' }
                    : { height: 30 }}
                />
              );
            })}
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
