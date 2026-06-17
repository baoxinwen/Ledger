import db from '../database';
import { Category } from '../types';

export class CategoryService {
  getAll(type?: 'income' | 'expense'): Category[] {
    if (type) {
      return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY sort_order').all(type) as Category[];
    }
    return db.prepare('SELECT * FROM categories ORDER BY type, sort_order').all() as Category[];
  }

  getById(id: number): Category | undefined {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  }

  create(data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }): Category {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM categories WHERE type = ?').get(data.type) as { max: number | null };
    const sortOrder = (maxOrder.max || 0) + 1;

    const result = db.prepare(
      'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(data.name, data.type, data.icon || null, data.color || null, sortOrder);

    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: { name?: string; icon?: string; color?: string }): Category | null {
    const category = this.getById(id);
    if (!category || category.is_preset) return null;

    if (data.name) {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(data.name, id);
    }
    if (data.icon !== undefined) {
      db.prepare('UPDATE categories SET icon = ? WHERE id = ?').run(data.icon, id);
    }
    if (data.color !== undefined) {
      db.prepare('UPDATE categories SET color = ? WHERE id = ?').run(data.color, id);
    }

    return this.getById(id) ?? null;
  }

  delete(id: number): boolean {
    const category = this.getById(id);
    if (!category || category.is_preset) return false;

    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number };
    if (transactionCount.count > 0) return false;

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return true;
  }
}

export const categoryService = new CategoryService();
