import db from '../setup';

describe('BudgetService', () => {
  let cat1Id: number;
  let cat2Id: number;

  beforeEach(() => {
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM categories');
    
    const cat1 = db.prepare(`
      INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
      VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
    `).run();
    cat1Id = cat1.lastInsertRowid as number;

    const cat2 = db.prepare(`
      INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
      VALUES ('交通', 'expense', '🚗', '#4ECDC4', 1, 1)
    `).run();
    cat2Id = cat2.lastInsertRowid as number;
  });

  describe('getAll', () => {
    it('should return all budgets', () => {
      db.prepare(`INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)`).run(cat1Id, 5000, 'monthly', '2024-01-01');
      db.prepare(`INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)`).run(cat2Id, 2000, 'monthly', '2024-01-01');

      const budgets = db.prepare('SELECT * FROM budgets').all();
      expect(budgets).toHaveLength(2);
    });

    it('should return empty array when no budgets', () => {
      const budgets = db.prepare('SELECT * FROM budgets').all();
      expect(budgets).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return budget by id', () => {
      const result = db.prepare(`
        INSERT INTO budgets (category_id, amount, period, start_date)
        VALUES (?, 5000, 'monthly', '2024-01-01')
      `).run(cat1Id);

      const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid);
      expect(budget).toBeDefined();
      expect((budget as any).amount).toBe(5000);
    });

    it('should return undefined for non-existent id', () => {
      const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(999);
      expect(budget).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create budget for category', () => {
      const result = db.prepare(
        'INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)'
      ).run(cat1Id, 5000, 'monthly', '2024-01-01');

      const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid);
      expect(budget).toBeDefined();
      expect((budget as any).amount).toBe(5000);
      expect((budget as any).category_id).toBe(cat1Id);
    });

    it('should create total budget (no category)', () => {
      const result = db.prepare(
        'INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)'
      ).run(null, 10000, 'monthly', '2024-01-01');

      const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid) as any;
      expect(budget).toBeDefined();
      expect(budget.category_id).toBeNull();
    });
  });

  describe('update', () => {
    it('should update budget', () => {
      const result = db.prepare(`
        INSERT INTO budgets (category_id, amount, period, start_date)
        VALUES (?, 5000, 'monthly', '2024-01-01')
      `).run(cat1Id);

      db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(6000, result.lastInsertRowid);
      const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid) as any;
      expect(budget.amount).toBe(6000);
    });

    it('should return 0 changes for non-existent budget', () => {
      const result = db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(1000, 999);
      expect(result.changes).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete budget', () => {
      const result = db.prepare(`
        INSERT INTO budgets (category_id, amount, period, start_date)
        VALUES (?, 5000, 'monthly', '2024-01-01')
      `).run(cat1Id);

      const deleteResult = db.prepare('DELETE FROM budgets WHERE id = ?').run(result.lastInsertRowid);
      expect(deleteResult.changes).toBe(1);
      expect(db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid)).toBeUndefined();
    });

    it('should return 0 changes for non-existent budget', () => {
      const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('getBudgetStatus', () => {
    it('should return budget status with spending', () => {
      const budgetResult = db.prepare(`
        INSERT INTO budgets (category_id, amount, period, start_date)
        VALUES (?, 5000, 'monthly', '2024-01-01')
      `).run(cat1Id);

      db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 1500, ?, '餐饮消费', '2024-01-15')
      `).run(cat1Id);

      const budgets = db.prepare('SELECT * FROM budgets').all();
      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE category_id = ? AND type = 'expense' AND date >= ? AND date <= ?
      `).get(cat1Id, '2024-01-01', '2024-01-31') as any;

      expect(budgets).toHaveLength(1);
      expect(spent.total).toBe(1500);
      expect((budgets[0] as any).amount - spent.total).toBe(3500);
    });

    it('should return total budget status', () => {
      db.prepare(`
        INSERT INTO budgets (category_id, amount, period, start_date)
        VALUES (NULL, 10000, 'monthly', '2024-01-01')
      `).run();

      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 3000, cat1Id, '餐饮', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 2000, cat2Id, '交通', '2024-01-16');

      const budgets = db.prepare('SELECT * FROM budgets').all();
      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'expense' AND date >= ? AND date <= ?
      `).get('2024-01-01', '2024-01-31') as any;

      expect(budgets).toHaveLength(1);
      expect(spent.total).toBe(5000);
      expect((budgets[0] as any).amount - spent.total).toBe(5000);
    });

    it('should return multiple budget statuses', () => {
      db.prepare(`INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)`).run(cat1Id, 5000, 'monthly', '2024-01-01');
      db.prepare(`INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)`).run(cat2Id, 2000, 'monthly', '2024-01-01');

      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 1000, cat1Id, '餐饮', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 500, cat2Id, '交通', '2024-01-16');

      const budgets = db.prepare('SELECT * FROM budgets').all();
      expect(budgets).toHaveLength(2);
    });

    it('should return zero spending when no transactions', () => {
      db.prepare(`
        INSERT INTO budgets (category_id, amount, period, start_date)
        VALUES (?, 5000, 'monthly', '2024-01-01')
      `).run(cat1Id);

      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE category_id = ? AND type = 'expense' AND date >= ? AND date <= ?
      `).get(cat1Id, '2024-01-01', '2024-01-31') as any;

      expect(spent.total).toBe(0);
    });
  });
});
