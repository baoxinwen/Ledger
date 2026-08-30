// 分类服务测试：创建、查询、预置保护、颜色建议与删除约束。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { categoryService } from '../../services/category.service';
import { EDITORIAL_CATEGORY_PALETTE } from '../../utils/categoryColor';

describe('CategoryService', () => {
  beforeEach(() => {
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM categories');
  });

  it('create 生成自定义分类并自动建议颜色', () => {
    const category = categoryService.create({ name: '宠物', type: 'expense' });
    expect(category.id).toBeGreaterThan(0);
    expect(category.is_preset).toBe(0);
    expect(EDITORIAL_CATEGORY_PALETTE).toContain(category.color);
  });

  it('getAll 按类型过滤', () => {
    categoryService.create({ name: '宠物', type: 'expense' });
    categoryService.create({ name: '房租收入', type: 'income' });

    expect(categoryService.getAll('expense')).toHaveLength(1);
    expect(categoryService.getAll('income')).toHaveLength(1);
    expect(categoryService.getAll()).toHaveLength(2);
  });

  it('getByNameAndType 精确匹配', () => {
    categoryService.create({ name: '宠物', type: 'expense' });
    expect(categoryService.getByNameAndType('宠物', 'expense')?.name).toBe('宠物');
    expect(categoryService.getByNameAndType('宠物', 'income')).toBeUndefined();
  });

  it('create 拒绝同类型下的重复名称，不同类型允许同名', () => {
    categoryService.create({ name: '宠物', type: 'expense' });
    expect(() => categoryService.create({ name: '宠物', type: 'expense' })).toThrow('同名分类');
    expect(() => categoryService.create({ name: '宠物', type: 'income' })).not.toThrow();
  });

  it('update 重命名撞名被拒绝，保留自身原名允许', () => {
    const first = categoryService.create({ name: '甲', type: 'expense' });
    const second = categoryService.create({ name: '乙', type: 'expense' });
    expect(() => categoryService.update(second.id, { name: '甲' })).toThrow('同名分类');
    expect(categoryService.update(first.id, { name: '甲' })?.name).toBe('甲');
  });

  it('update 只允许修改自定义分类', () => {
    const custom = categoryService.create({ name: '宠物', type: 'expense' });
    const updated = categoryService.update(custom.id, { name: '宠物用品' });
    expect(updated?.name).toBe('宠物用品');

    // 预置分类不可改
    const preset = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('餐饮', 'expense', '🍽️', '#8A5A61', 1, 0)`
    ).run();
    expect(categoryService.update(preset.lastInsertRowid as number, { name: '改名' })).toBeNull();
  });

  it('delete 拒绝删除预置分类与有交易/预算引用的分类', () => {
    const preset = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('餐饮', 'expense', '🍽️', '#8A5A61', 1, 0)`
    ).run();
    expect(categoryService.delete(preset.lastInsertRowid as number)).toBe(false);

    const custom = categoryService.create({ name: '宠物', type: 'expense' });
    db.prepare('INSERT INTO transactions (type, amount_cents, category_id, date) VALUES (?, ?, ?, ?)').run(
      'expense', 1000, custom.id, '2026-01-01'
    );
    expect(() => categoryService.delete(custom.id)).toThrow('已有交易记录');

    // 未被引用的自定义分类可删除
    const free = categoryService.create({ name: '闲置', type: 'expense' });
    expect(categoryService.delete(free.id)).toBe(true);
    expect(categoryService.getById(free.id)).toBeUndefined();
  });

  it('连续创建分类颜色尽量不重复', () => {
    const colors = new Set<string>();
    for (let index = 0; index < 8; index++) {
      const category = categoryService.create({ name: `分类${index}`, type: 'expense' });
      colors.add(category.color!);
    }
    // 调色板 24 色足够前 8 个不重复
    expect(colors.size).toBe(8);
  });
});
