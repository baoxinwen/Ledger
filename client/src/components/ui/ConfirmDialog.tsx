import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  loadingText?: string;
  /**
   * 强确认关键字：提供后必须精确输入该关键字才能点击确认，
   * 用于恢复备份等不可逆操作，防止误触或弹窗弹出瞬间的回车误确认。
   */
  confirmKeyword?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '删除',
  cancelText = '取消',
  loading = false,
  loadingText = '处理中...',
  confirmKeyword,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [keywordInput, setKeywordInput] = useState('');

  // 弹窗每次打开时清空输入，避免上一次的输入残留直接解锁确认按钮。
  useEffect(() => {
    if (open) setKeywordInput('');
  }, [open]);

  const keywordSatisfied = !confirmKeyword || keywordInput === confirmKeyword;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: '4px solid',
          borderTopColor: 'error.main',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              color: 'error.main',
              bgcolor: isDark ? 'rgba(229, 56, 59, 0.14)' : 'rgba(155, 34, 38, 0.08)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(229, 56, 59, 0.26)' : 'rgba(155, 34, 38, 0.16)',
              flexShrink: 0,
            }}
          >
            <WarningIcon fontSize="small" />
          </Box>
          <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      {(description || confirmKeyword) && (
        <DialogContent sx={{ pt: 0 }}>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              {description}
            </Typography>
          )}
          {confirmKeyword && (
            <TextField
              autoFocus
              fullWidth
              size="small"
              margin="normal"
              label={`输入 ${confirmKeyword} 以确认`}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              error={keywordInput.length > 0 && keywordInput !== confirmKeyword}
            />
          )}
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading || !keywordSatisfied}
          sx={{
            bgcolor: 'error.main',
            color: '#fff',
            '&:hover': {
              bgcolor: 'error.dark',
            },
          }}
        >
          {loading ? loadingText : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
