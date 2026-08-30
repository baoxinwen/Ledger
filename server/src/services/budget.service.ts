// 预算服务负责预算持久化和月度/年度预算执行金额计算。
import db from '../database';
import { Budget } from '../types';
import { fromCents, toCents } from '../utils/amount';

export class BudgetService {
  getAll(): Budget[] {
    return db.prepare('SELECT *, amount_cents / 100.0 AS amount FROM budgets ORDER BY start_date DESC').all() as Budget[];
  }

  getById(id: number): Budget | undefined {
    return db.prepare('SELECT *, amount_cents / 100.0 AS amount FROM budgets WHERE id = ?').get(id) as Budget | undefined;
  }

  create(data: { category_id?: number; amount: number; period: 'monthly' | 'yearly'; start_date: string }): Budget {
    const result = db.prepare(
      'INSERT INTO budgets (category_id, amount_cents, period, start_date) VALUES (?, ?, ?, ?)'
    ).run(data.category_id || null, toCents(data.amount), data.period, data.start_date);

    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: { category_id?: number; amount?: number; period?: 'monthly' | 'yearly'; start_date?: string }): Budget | null {
    const existing = this.getById(id);
    if (!existing) return null;

    if (data.category_id !== undefined) {
      db.prepare('UPDATE budgets SET category_id = ? WHERE id = ?').run(data.category_id, id);
    }
    if (data.amount !== undefined) {
      db.prepare('UPDATE budgets SET amount_cents = ? WHERE id = ?').run(toCents(data.amount), id);
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
    const queryYear = month.substring(0, 4);

    return budgets.map(budget => {
      const isYearly = budget.period === 'yearly';
      // 年度预算归属 start_date 所在自然年，而不是查询月份所在年，避免跨年误报。
      const budgetYear = budget.start_date.substring(0, 4);
      const { startDate, endDate } = isYearly
        ? { startDate: `${budgetYear}-01-01`, endDate: `${budgetYear}-12-31` }
        : getMonthRange(month);
      let spent = 0;

      // 年度预算只在其所属自然年内生效：查询其他年份时不计入该预算的支出。
      // 月度预算只在其 start_date 月份及之后生效：未来生效的预算在当前月 spent=0，
      // 行仍返回（用户可在预算页看到并管理），但绝不参与当月超支计算。
      const monthlyEffective = !isYearly && budget.start_date.substring(0, 7) <= month;
      if (isYearly ? queryYear === budgetYear : monthlyEffective) {
        if (budget.category_id) {
          const result = db.prepare(`
            SELECT COALESCE(SUM(amount_cents), 0) as total
            FROM transactions
            WHERE category_id = ? AND type = 'expense' AND date >= ? AND date <= ?
          `).get(budget.category_id, startDate, endDate) as { total: number };
          spent = result.total;
        } else {
          const result = db.prepare(`
            SELECT COALESCE(SUM(amount_cents), 0) as total
            FROM transactions
            WHERE type = 'expense' AND date >= ? AND date <= ?
          `).get(startDate, endDate) as { total: number };
          spent = result.total;
        }
      }

      const spentAmount = fromCents(spent);
      return {
        budget,
        spent: spentAmount,
        remaining: fromCents(toCents(budget.amount) - spent),
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
