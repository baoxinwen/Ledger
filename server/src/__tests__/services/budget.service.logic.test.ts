// 预算逻辑测试重点保护月度和年度统计范围，避免预算状态跨期计算错误。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { budgetService } from '../../services/budget.service';

describe('BudgetService period-aware status', () => {
  let categoryId: number;

  beforeEach(() => {
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM categories');

    const category = db.prepare(`
      INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
      VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
    `).run();
    categoryId = category.lastInsertRowid as number;
  });

  it('uses the selected month for monthly budgets and the selected year for yearly budgets', () => {
    db.prepare('INSERT INTO budgets (category_id, amount_cents, period, start_date) VALUES (?, ?, ?, ?)')
      .run(categoryId, 100000, 'monthly', '2024-01-01');
    db.prepare('INSERT INTO budgets (category_id, amount_cents, period, start_date) VALUES (?, ?, ?, ?)')
      .run(categoryId, 1200000, 'yearly', '2024-01-01');

    db.prepare('INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)')
      .run('expense', 10000, categoryId, '一月', '2024-01-15');
    db.prepare('INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)')
      .run('expense', 20000, categoryId, '二月', '2024-02-15');

    const statuses = budgetService.getBudgetStatus('2024-01');
    const monthly = statuses.find((status) => status.budget.period === 'monthly');
    const yearly = statuses.find((status) => status.budget.period === 'yearly');

    expect(monthly?.spent).toBe(100);
    expect(yearly?.spent).toBe(300);
  });
});
