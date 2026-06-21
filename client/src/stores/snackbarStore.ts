// 全局 Snackbar store：让任意页面都能触发统一的反馈提示。
import { create } from 'zustand';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
  hideSnackbar: () => void;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  open: false,
  message: '',
  severity: 'info',

  showSnackbar: (message: string, severity: SnackbarSeverity = 'info') => {
    set({ open: true, message, severity });
  },

  hideSnackbar: () => {
    set({ open: false });
  },
}));
