// 全局快速记账开关：侧边栏按钮、移动端 FAB、首页「记一笔」统一走这里，
// 替代原先通过 route state（openCreate）跨页传递的打开方式。
import { create } from 'zustand';

interface QuickAddState {
  open: boolean;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  open: false,
  openQuickAdd: () => set({ open: true }),
  closeQuickAdd: () => set({ open: false }),
}));
