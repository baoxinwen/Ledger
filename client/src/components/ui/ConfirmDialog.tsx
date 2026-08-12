import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
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
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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

      {description && (
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            {description}
          </Typography>
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            bgcolor: 'error.main',
            color: '#fff',
            '&:hover': {
              bgcolor: 'error.dark',
            },
          }}
        >
          {loading ? '删除中...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
