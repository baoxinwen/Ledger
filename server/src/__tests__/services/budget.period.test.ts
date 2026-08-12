// 预算周期归属测试：年度预算应归属其 start_date 所在自然年，跨年查询不计入该预算支出。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { budgetService } from '../../services/budget.service';

describe('BudgetService period attribution', () => {
  let expenseId: number;

  beforeEach(() => {
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM categories');

    const cat = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('餐饮', 'expense', '🍽️', '#8A5A61', 1, 0)`
    ).run();
    expenseId = cat.lastInsertRowid as number;
  });

  it('年度预算只归属 start_date 所在年，查询其他年份时支出为 0', () => {
    budgetService.create({ category_id: expenseId, amount: 12000, period: 'yearly', start_date: '2025-03-01' });
    db.prepare('INSERT INTO transactions (type, amount, category_id, date) VALUES (?, ?, ?, ?)').run(
      'expense', 1000, expenseId, '2025-06-01'
    );
    db.prepare('INSERT INTO transactions (type, amount, category_id, date) VALUES (?, ?, ?, ?)').run(
      'expense', 2000, expenseId, '2026-01-15'
    );

    const status2025 = budgetService.getBudgetStatus('2025-07');
    const status2026 = budgetService.getBudgetStatus('2026-03');

    expect(status2025).toHaveLength(1);
    expect(status2025[0].spent).toBe(1000);
    // 2026 年不属于 2025 年的年度预算周期，支出应为 0（修复前会误算为 2000）。
    expect(status2026[0].spent).toBe(0);
  });
});
