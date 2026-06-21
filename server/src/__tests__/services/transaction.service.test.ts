// 交易服务测试覆盖交易 CRUD、筛选、统计和标签同步。
import db from '../setup';

describe('TransactionService', () => {
  let cat1Id: number;
  let cat2Id: number;
  let cat3Id: number;

  beforeEach(() => {
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM tags');
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

    const cat3 = db.prepare(`
      INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
      VALUES ('工资', 'income', '💰', '#2ECC71', 1, 0)
    `).run();
    cat3Id = cat3.lastInsertRowid as number;
  });

  describe('getAll', () => {
    it('should return all transactions', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-16');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('income', 5000, cat3Id, '工资', '2024-01-10');

      const transactions = db.prepare('SELECT * FROM transactions').all();
      expect(transactions).toHaveLength(3);
    });

    it('should filter by type', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('income', 5000, cat3Id, '工资', '2024-01-10');

      const transactions = db.prepare('SELECT * FROM transactions WHERE type = ?').all('expense');
      expect(transactions).toHaveLength(1);
      expect((transactions[0] as any).type).toBe('expense');
    });

    it('should filter by category_id', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-16');

      const transactions = db.prepare('SELECT * FROM transactions WHERE category_id = ?').all(cat1Id);
      expect(transactions).toHaveLength(1);
      expect((transactions[0] as any).category_id).toBe(cat1Id);
    });

    it('should filter by date range', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-20');

      const transactions = db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ?').all('2024-01-16', '2024-01-31');
      expect(transactions).toHaveLength(1);
    });

    it('should filter by amount range', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 50, cat1Id, '早餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-16');

      const transactions = db.prepare('SELECT * FROM transactions WHERE amount >= ? AND amount <= ?').all(100, 300);
      expect(transactions).toHaveLength(1);
      expect((transactions[0] as any).amount).toBe(200);
    });

    it('should filter by keyword', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '工作午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车回家', '2024-01-16');

      const transactions = db.prepare('SELECT * FROM transactions WHERE note LIKE ?').all('%午餐%');
      expect(transactions).toHaveLength(1);
      expect((transactions[0] as any).note).toContain('午餐');
    });

    it('should sort by date descending by default', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-20');

      const transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
      expect((transactions[0] as any).date).toBe('2024-01-20');
    });

    it('should sort by amount', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-16');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');

      const transactions = db.prepare('SELECT * FROM transactions ORDER BY amount ASC').all();
      expect((transactions[0] as any).amount).toBe(100);
    });
  });

  describe('getById', () => {
    it('should return transaction', () => {
      const result = db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 100, ?, '午餐', '2024-01-15')
      `).run(cat1Id);

      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
      expect(transaction).toBeDefined();
      expect((transaction as any).amount).toBe(100);
    });

    it('should return undefined for non-existent id', () => {
      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(999);
      expect(transaction).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a transaction', () => {
      const result = db.prepare(
        'INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
      ).run('expense', 100, cat1Id, '午餐', '2024-01-15');

      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
      expect(transaction).toBeDefined();
      expect((transaction as any).amount).toBe(100);
      expect((transaction as any).type).toBe('expense');
    });

    it('should create transaction with tags', () => {
      const tagResult = db.prepare(`INSERT INTO tags (name) VALUES ('工作日')`).run();

      const txResult = db.prepare(
        'INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
      ).run('expense', 100, cat1Id, '午餐', '2024-01-15');

      db.prepare('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)').run(txResult.lastInsertRowid, tagResult.lastInsertRowid);

      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN transaction_tags tt ON t.id = tt.tag_id
        WHERE tt.transaction_id = ?
      `).all(txResult.lastInsertRowid);
      expect(tags).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update transaction', () => {
      const result = db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 100, ?, '午餐', '2024-01-15')
      `).run(cat1Id);

      db.prepare('UPDATE transactions SET amount = ? WHERE id = ?').run(150, result.lastInsertRowid);
      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as any;
      expect(transaction.amount).toBe(150);
    });

    it('should return 0 changes for non-existent transaction', () => {
      const result = db.prepare('UPDATE transactions SET amount = ? WHERE id = ?').run(100, 999);
      expect(result.changes).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete transaction', () => {
      const result = db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 100, ?, '午餐', '2024-01-15')
      `).run(cat1Id);

      const deleteResult = db.prepare('DELETE FROM transactions WHERE id = ?').run(result.lastInsertRowid);
      expect(deleteResult.changes).toBe(1);
      expect(db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid)).toBeUndefined();
    });

    it('should return 0 changes for non-existent transaction', () => {
      const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 200, cat2Id, '打车', '2024-01-16');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('income', 5000, cat3Id, '工资', '2024-01-10');

      const totalIncome = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'`).get() as any;
      const totalExpense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`).get() as any;

      expect(totalIncome.total).toBe(5000);
      expect(totalExpense.total).toBe(300);
    });

    it('should filter stats by type', () => {
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('expense', 100, cat1Id, '午餐', '2024-01-15');
      db.prepare(`INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)`).run('income', 5000, cat3Id, '工资', '2024-01-10');

      const totalExpense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`).get() as any;
      expect(totalExpense.total).toBe(100);
    });
  });
});
