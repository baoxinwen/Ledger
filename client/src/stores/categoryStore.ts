// 分类 store：提供分类列表缓存和刷新能力。
import { create } from 'zustand';
import { categoryApi } from '../api';
import type { Category } from '../types';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  fetchCategories: (type?: 'income' | 'expense') => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,

  fetchCategories: async (type?: 'income' | 'expense') => {
    set({ loading: true });
    try {
      const response = await categoryApi.getAll(type);
      set({ categories: response.data });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
