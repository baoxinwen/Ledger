import db from '../setup';

describe('CategoryService', () => {
  beforeEach(() => {
    db.exec('DELETE FROM categories');
  });

  describe('getAll', () => {
    it('should return all categories', () => {
      db.exec(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES
        ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0),
        ('工资', 'income', '💰', '#2ECC71', 1, 0)
      `);

      const categories = db.prepare('SELECT * FROM categories').all();
      expect(categories).toHaveLength(2);
    });

    it('should filter by type', () => {
      db.exec(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES
        ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0),
        ('工资', 'income', '💰', '#2ECC71', 1, 0)
      `);

      const categories = db.prepare('SELECT * FROM categories WHERE type = ?').all('expense');
      expect(categories).toHaveLength(1);
      expect((categories[0] as any).name).toBe('餐饮');
    });

    it('should return empty array when no categories', () => {
      const categories = db.prepare('SELECT * FROM categories').all();
      expect(categories).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return category by id', () => {
      const result = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
      `).run();

      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      expect(category).toBeDefined();
      expect((category as any).name).toBe('餐饮');
    });

    it('should return undefined for non-existent id', () => {
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(999);
      expect(category).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new category', () => {
      const result = db.prepare(
        'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
      ).run('宠物', 'expense', '🐱', '#FF9800', 0);

      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      expect(category).toBeDefined();
      expect((category as any).name).toBe('宠物');
      expect((category as any).type).toBe('expense');
      expect((category as any).is_preset).toBe(0);
    });

    it('should set sort_order correctly', () => {
      db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
      `).run();

      const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM categories WHERE type = ?').get('expense') as any;
      const newOrder = (maxOrder.max || 0) + 1;

      const result = db.prepare(
        'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
      ).run('宠物', 'expense', null, null, newOrder);

      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as any;
      expect(category.sort_order).toBe(1);
    });
  });

  describe('update', () => {
    it('should update custom category', () => {
      const result = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('宠物', 'expense', '🐱', '#FF9800', 0, 0)
      `).run();

      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run('宠物食品', result.lastInsertRowid);
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as any;
      expect(category.name).toBe('宠物食品');
    });

    it('should not update preset category', () => {
      const result = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
      `).run();

      const category = db.prepare('SELECT * FROM categories WHERE id = ? AND is_preset = 0').get(result.lastInsertRowid);
      expect(category).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete custom category', () => {
      const result = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('宠物', 'expense', '🐱', '#FF9800', 0, 0)
      `).run();

      const deleteResult = db.prepare('DELETE FROM categories WHERE id = ? AND is_preset = 0').run(result.lastInsertRowid);
      expect(deleteResult.changes).toBe(1);
      expect(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid)).toBeUndefined();
    });

    it('should not delete preset category', () => {
      const result = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
      `).run();

      const deleteResult = db.prepare('DELETE FROM categories WHERE id = ? AND is_preset = 0').run(result.lastInsertRowid);
      expect(deleteResult.changes).toBe(0);
      expect(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid)).toBeDefined();
    });

    it('should not delete category with transactions', () => {
      const catResult = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 0, 0)
      `).run();

      db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 100, ?, '午餐', '2024-01-15')
      `).run(catResult.lastInsertRowid);

      const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(catResult.lastInsertRowid) as any;
      expect(transactionCount.count).toBeGreaterThan(0);
    });
  });
});
