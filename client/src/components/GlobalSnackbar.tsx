// 全局消息条：消费 snackbar store 中的状态并统一展示反馈。
import { Snackbar, Alert } from '@mui/material';
import { useSnackbarStore } from '../stores/snackbarStore';

export default function GlobalSnackbar() {
  const { open, message, severity, hideSnackbar } = useSnackbarStore();

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={hideSnackbar}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
