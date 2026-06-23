// 分类颜色工具测试保护颜色修复边界：预置同步主题色，手动颜色不能被误覆盖。
import {
  EDITORIAL_CATEGORY_PALETTE,
  normalizeHexColor,
  repairCategoryColors,
  suggestCategoryColor,
} from '../../utils/categoryColor';

describe('categoryColor utils', () => {
  it('normalizes hex colors before comparing and storing', () => {
    expect(normalizeHexColor('#abc')).toBe('#AABBCC');
    expect(normalizeHexColor('2ecc71')).toBe('#2ECC71');
    expect(normalizeHexColor('not-a-color')).toBeUndefined();
  });

  it('updates preset colors and keeps explicit custom colors while repairing legacy defaults', () => {
    const updates = repairCategoryColors([
      { id: 1, name: '餐饮', type: 'expense', color: '#FF6B6B', is_preset: 1 },
      { id: 2, name: '手动颜色', type: 'expense', color: '#123456', is_preset: 0 },
      { id: 3, name: '历史灰色', type: 'expense', color: '#BDC3C7', is_preset: 0 },
      { id: 4, name: '空颜色', type: 'expense', color: null, is_preset: 0 },
      { id: 5, name: '历史绿色', type: 'income', color: '#2ECC71', is_preset: 0 },
    ]);

    expect(updates.get(1)).toBe('#8A5A61');
    expect(updates.has(2)).toBe(false);
    expect(updates.get(3)).toMatch(/^#[0-9A-F]{6}$/);
    expect(updates.get(4)).toMatch(/^#[0-9A-F]{6}$/);
    expect(updates.get(5)).toMatch(/^#[0-9A-F]{6}$/);
    expect(updates.get(3)).not.toBe('#BDC3C7');
    expect(updates.get(5)).not.toBe('#2ECC71');
    expect(updates.get(3)).not.toBe(updates.get(4));
    expect(EDITORIAL_CATEGORY_PALETTE).toContain(updates.get(3));
    expect(EDITORIAL_CATEGORY_PALETTE).toContain(updates.get(4));
    expect(EDITORIAL_CATEGORY_PALETTE).toContain(updates.get(5));
  });

  it('suggests stable unused colors for new categories of the same type', () => {
    const first = suggestCategoryColor('expense', '商户消费', []);
    const second = suggestCategoryColor('expense', '餐饮美食', [
      { name: '商户消费', type: 'expense', color: first },
    ]);

    expect(first).toMatch(/^#[0-9A-F]{6}$/);
    expect(second).toMatch(/^#[0-9A-F]{6}$/);
    expect(second).not.toBe(first);
  });
});
