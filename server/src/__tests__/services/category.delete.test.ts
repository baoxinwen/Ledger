// 分类删除约束测试：被交易或预算引用的分类不能删除，且给出明确原因（而非外键错误误导）。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { categoryService } from '../../services/category.service';
import { budgetService } from '../../services/budget.service';

describe('CategoryService.delete', () => {
  beforeEach(() => {
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM categories');
  });

  it('删除被预算引用的分类时给出明确错误', () => {
    const category = categoryService.create({ name: '餐饮', type: 'expense' });
    budgetService.create({ category_id: category.id, amount: 1000, period: 'monthly', start_date: '2026-08-01' });

    expect(() => categoryService.delete(category.id)).toThrow('已被预算使用');
    // 分类仍在
    expect(categoryService.getById(category.id)).toBeDefined();
  });

  it('删除有交易记录的分类时给出明确错误', () => {
    const category = categoryService.create({ name: '交通', type: 'expense' });
    db.prepare('INSERT INTO transactions (type, amount, category_id, date) VALUES (?, ?, ?, ?)').run(
      'expense', 10, category.id, '2026-08-01'
    );

    expect(() => categoryService.delete(category.id)).toThrow('已有交易记录');
    expect(categoryService.getById(category.id)).toBeDefined();
  });

  it('未被引用的自定义分类可以删除', () => {
    const category = categoryService.create({ name: '宠物', type: 'expense' });
    expect(categoryService.delete(category.id)).toBe(true);
    expect(categoryService.getById(category.id)).toBeUndefined();
  });
});
