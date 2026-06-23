// 预算服务负责预算持久化和月度/年度预算执行金额计算。
import db from '../database';
import { Budget } from '../types';

export class BudgetService {
  getAll(): Budget[] {
    return db.prepare('SELECT * FROM budgets ORDER BY start_date DESC').all() as Budget[];
  }

  getById(id: number): Budget | undefined {
    return db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | undefined;
  }

  create(data: { category_id?: number; amount: number; period: 'monthly' | 'yearly'; start_date: string }): Budget {
    const result = db.prepare(
      'INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)'
    ).run(data.category_id || null, data.amount, data.period, data.start_date);

    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: { category_id?: number; amount?: number; period?: 'monthly' | 'yearly'; start_date?: string }): Budget | null {
    const existing = this.getById(id);
    if (!existing) return null;

    if (data.category_id !== undefined) {
      db.prepare('UPDATE budgets SET category_id = ? WHERE id = ?').run(data.category_id, id);
    }
    if (data.amount !== undefined) {
      db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(data.amount, id);
    }
    if (data.period) {
      db.prepare('UPDATE budgets SET period = ? WHERE id = ?').run(data.period, id);
    }
    if (data.start_date) {
      db.prepare('UPDATE budgets SET start_date = ? WHERE id = ?').run(data.start_date, id);
    }

    return this.getById(id) ?? null;
  }

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getBudgetStatus(month: string): { budget: Budget; spent: number; remaining: number }[] {
    const budgets = this.getAll();
    const year = month.substring(0, 4);

    return budgets.map(budget => {
      const { startDate, endDate } = budget.period === 'yearly'
        ? { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
        : getMonthRange(month);
      let spent = 0;

      if (budget.category_id) {
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE category_id = ? AND type = 'expense' AND date >= ? AND date <= ?
        `).get(budget.category_id, startDate, endDate) as { total: number };
        spent = result.total;
      } else {
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE type = 'expense' AND date >= ? AND date <= ?
        `).get(startDate, endDate) as { total: number };
        spent = result.total;
      }

      return {
        budget,
        spent,
        remaining: budget.amount - spent,
      };
    });
  }
}

function getMonthRange(month: string): { startDate: string; endDate: string } {
  const [year, monthPart] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthPart, 0)).getUTCDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export const budgetService = new BudgetService();
