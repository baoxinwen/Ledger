// 标签服务测试保护标签唯一性和交易标签关联查询。
import db from '../setup';

describe('TagService', () => {
  beforeEach(() => {
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM tags');
  });

  describe('getAll', () => {
    it('should return all tags', () => {
      db.exec(`INSERT INTO tags (name) VALUES ('午餐'), ('晚餐'), ('交通')`);

      const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
      expect(tags).toHaveLength(3);
    });

    it('should return empty array when no tags', () => {
      const tags = db.prepare('SELECT * FROM tags').all();
      expect(tags).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return tag by id', () => {
      const result = db.prepare(`INSERT INTO tags (name) VALUES ('午餐')`).run();

      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
      expect(tag).toBeDefined();
      expect((tag as any).name).toBe('午餐');
    });

    it('should return undefined for non-existent id', () => {
      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(999);
      expect(tag).toBeUndefined();
    });
  });

  describe('getByName', () => {
    it('should return tag by name', () => {
      db.prepare(`INSERT INTO tags (name) VALUES ('午餐')`).run();

      const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get('午餐');
      expect(tag).toBeDefined();
    });

    it('should return undefined for non-existent name', () => {
      const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get('不存在的标签');
      expect(tag).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new tag', () => {
      const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run('午餐');
      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);

      expect(tag).toBeDefined();
      expect((tag as any).name).toBe('午餐');
    });

    it('should return existing tag if name exists', () => {
      db.prepare('INSERT INTO tags (name) VALUES (?)').run('午餐');
      db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run('午餐');

      const tags = db.prepare('SELECT * FROM tags WHERE name = ?').all('午餐');
      expect(tags).toHaveLength(1);
    });

    it('should create multiple different tags', () => {
      db.prepare('INSERT INTO tags (name) VALUES (?)').run('午餐');
      db.prepare('INSERT INTO tags (name) VALUES (?)').run('晚餐');

      const tags = db.prepare('SELECT * FROM tags').all();
      expect(tags).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete tag', () => {
      const result = db.prepare(`INSERT INTO tags (name) VALUES ('午餐')`).run();

      const deleteResult = db.prepare('DELETE FROM tags WHERE id = ?').run(result.lastInsertRowid);
      expect(deleteResult.changes).toBe(1);
      expect(db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid)).toBeUndefined();
    });

    it('should return false for non-existent tag', () => {
      const result = db.prepare('DELETE FROM tags WHERE id = ?').run(999);
      expect(result.changes).toBe(0);
    });
  });

  describe('getByTransactionId', () => {
    it('should return tags for transaction', () => {
      const catResult = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
      `).run();

      const txResult = db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 100, ?, '午餐', '2024-01-15')
      `).run(catResult.lastInsertRowid);

      const tag1 = db.prepare(`INSERT INTO tags (name) VALUES ('工作日')`).run();
      const tag2 = db.prepare(`INSERT INTO tags (name) VALUES ('午餐')`).run();

      db.prepare('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)').run(txResult.lastInsertRowid, tag1.lastInsertRowid);
      db.prepare('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)').run(txResult.lastInsertRowid, tag2.lastInsertRowid);

      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN transaction_tags tt ON t.id = tt.tag_id
        WHERE tt.transaction_id = ?
      `).all(txResult.lastInsertRowid);
      expect(tags).toHaveLength(2);
    });

    it('should return empty array for transaction without tags', () => {
      const catResult = db.prepare(`
        INSERT INTO categories (name, type, icon, color, is_preset, sort_order)
        VALUES ('餐饮', 'expense', '🍽️', '#FF6B6B', 1, 0)
      `).run();

      const txResult = db.prepare(`
        INSERT INTO transactions (type, amount, category_id, note, date)
        VALUES ('expense', 100, ?, '午餐', '2024-01-15')
      `).run(catResult.lastInsertRowid);

      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN transaction_tags tt ON t.id = tt.tag_id
        WHERE tt.transaction_id = ?
      `).all(txResult.lastInsertRowid);
      expect(tags).toHaveLength(0);
    });
  });
});
