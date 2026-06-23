// 分类服务封装分类表操作，账单导入会按“名称 + 类型”精确匹配分类。
import db from '../database';
import { Category } from '../types';
import { normalizeHexColor, suggestCategoryColor } from '../utils/categoryColor';

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

  getByNameAndType(name: string, type: 'income' | 'expense'): Category | undefined {
    return db.prepare('SELECT * FROM categories WHERE name = ? AND type = ?').get(name, type) as Category | undefined;
  }

  create(data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }): Category {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM categories WHERE type = ?').get(data.type) as { max: number | null };
    const sortOrder = (maxOrder.max || 0) + 1;
    const color = normalizeHexColor(data.color) || this.suggestColor(data.type, data.name);

    const result = db.prepare(
      'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(data.name, data.type, data.icon || null, color, sortOrder);

    return this.getById(result.lastInsertRowid as number)!;
  }

  suggestColor(type: 'income' | 'expense', name: string): string {
    // 建类入口统一通过这里选色，避免支付宝/微信批量导入的新分类都落到同一个默认色。
    return suggestCategoryColor(type, name, this.getAll(type));
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
