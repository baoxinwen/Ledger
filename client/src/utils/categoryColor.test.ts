// 客户端分类颜色工具测试：展示色聚合与新建表单默认色建议。
import { describe, it, expect } from 'vitest';
import { resolveCategoryDisplayColors, suggestCategoryFormColor } from './categoryColor';
import type { Category } from '../types';

describe('client categoryColor', () => {
  it('resolveCategoryDisplayColors 保留有效存储色，并为无色的项建议唯一色', () => {
    const resolved = resolveCategoryDisplayColors([
      { name: '餐饮', color: '#8A5A61' },
      { name: '交通', color: null },
      { name: '工资', color: '#5F6F52' },
    ]);

    expect(resolved[0].color).toBe('#8A5A61');
    expect(resolved[1].color).toMatch(/^#[0-9A-F]{6}$/);
    expect(resolved[2].color).toBe('#5F6F52');
    // 三个颜色互不重复
    expect(new Set(resolved.map((item) => item.color)).size).toBe(3);
  });

  it('resolveCategoryDisplayColors 对重复存储色做去重替换', () => {
    const resolved = resolveCategoryDisplayColors([
      { name: '餐饮', color: '#8A5A61' },
      { name: '外卖', color: '#8A5A61' },
    ]);
    expect(resolved[0].color).toBe('#8A5A61');
    expect(resolved[1].color).not.toBe('#8A5A61');
  });

  it('suggestCategoryFormColor 避开已用色', () => {
    const categories: Category[] = [
      { id: 1, name: '餐饮', type: 'expense', color: '#8A5A61', icon: '', is_preset: 0, sort_order: 0 },
      { id: 2, name: '交通', type: 'expense', color: '#5D737E', icon: '', is_preset: 0, sort_order: 1 },
    ];
    const suggested = suggestCategoryFormColor('expense', '宠物', categories);
    expect(suggested).toMatch(/^#[0-9A-F]{6}$/);
    expect(suggested).not.toBe('#8A5A61');
    expect(suggested).not.toBe('#5D737E');
  });
});
