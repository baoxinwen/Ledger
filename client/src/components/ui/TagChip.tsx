// 标签 chip：全站统一的标签展示（列表行、详情抽屉、表单回显）。
import { Chip } from '@mui/material';

interface TagChipProps {
  label: string;
  onDelete?: () => void;
  /** 零使用的弱化态（标签管理页） */
  muted?: boolean;
}

export default function TagChip({ label, onDelete, muted }: TagChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      onDelete={onDelete}
      sx={{
        height: 20,
        fontSize: '0.65rem',
        bgcolor: muted ? 'action.hover' : 'subcard',
        border: '1px solid',
        borderColor: muted ? 'transparent' : 'divider',
        color: muted ? 'text.disabled' : 'text.secondary',
        '& .MuiChip-deleteIcon': { fontSize: 13, color: 'text.disabled' },
      }}
    />
  );
}
