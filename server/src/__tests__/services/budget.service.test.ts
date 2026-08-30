// 预算服务测试：CRUD、月度/年度执行金额计算。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { budgetService } from '../../services/budget.service';
import { categoryService } from '../../services/category.service';
import { transactionService } from '../../services/transaction.service';

describe('BudgetService', () => {
  let expenseId: number;

  beforeEach(() => {
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM categories');

    const cat = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('餐饮', 'expense', '🍽️', '#8A5A61', 1, 0)`
    ).run();
    expenseId = cat.lastInsertRowid as number;
  });

  it('CRUD 基础操作', () => {
    const created = budgetService.create({ category_id: expenseId, amount: 1000, period: 'monthly', start_date: '2026-01-01' });
    expect(budgetService.getById(created.id)?.amount).toBe(1000);

    const updated = budgetService.update(created.id, { amount: 1500 });
    expect(updated?.amount).toBe(1500);

    expect(budgetService.delete(created.id)).toBe(true);
    expect(budgetService.getById(created.id)).toBeUndefined();
  });

  it('预算金额在数据库中以整数分存储并以元返回', () => {
    const created = budgetService.create({ amount: 1234.56, period: 'monthly', start_date: '2026-01-01' });
    expect(created.amount).toBe(1234.56);
    expect(db.prepare('SELECT amount_cents FROM budgets WHERE id = ?').get(created.id)).toEqual({ amount_cents: 123456 });
  });

  it('月度预算统计指定月份支出与结余', () => {
    budgetService.create({ category_id: expenseId, amount: 1000, period: 'monthly', start_date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 400, category_id: expenseId, date: '2026-01-10' });

    const status = budgetService.getBudgetStatus('2026-01');
    expect(status).toHaveLength(1);
    expect(status[0].spent).toBe(400);
    expect(status[0].remaining).toBe(600);
  });

  it('总预算（无分类）统计全部支出', () => {
    budgetService.create({ amount: 2000, period: 'monthly', start_date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 500, category_id: expenseId, date: '2026-01-05' });

    const status = budgetService.getBudgetStatus('2026-01');
    expect(status[0].spent).toBe(500);
    expect(status[0].remaining).toBe(1500);
  });

  it('月度预算只统计当月支出', () => {
    budgetService.create({ amount: 1000, period: 'monthly', start_date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 100, category_id: expenseId, date: '2026-01-15' });
    transactionService.create({ type: 'expense', amount: 200, category_id: expenseId, date: '2026-02-15' });

    expect(budgetService.getBudgetStatus('2026-01')[0].spent).toBe(100);
    expect(budgetService.getBudgetStatus('2026-02')[0].spent).toBe(200);
  });
});
