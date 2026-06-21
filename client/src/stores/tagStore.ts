// 标签 store：提供标签列表、创建和刷新能力。
import { create } from 'zustand';
import { tagApi } from '../api';
import type { Tag } from '../types';

interface TagState {
  tags: Tag[];
  loading: boolean;
  fetchTags: () => Promise<void>;
  createTag: (name: string) => Promise<Tag | null>;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  loading: false,

  fetchTags: async () => {
    set({ loading: true });
    try {
      const response = await tagApi.getAll();
      set({ tags: response.data });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      set({ loading: false });
    }
  },

  createTag: async (name: string) => {
    try {
      const response = await tagApi.create(name);
      set((state) => ({ tags: [...state.tags, response.data] }));
      return response.data;
    } catch (error) {
      console.error('Failed to create tag:', error);
      return null;
    }
  },
}));
