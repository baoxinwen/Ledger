// 标签服务保证标签名唯一，并提供交易到标签的反向查询能力。
import db from '../database';
import { Tag } from '../types';

export class TagService {
  getAll(): Tag[] {
    return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  }

  getById(id: number): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag | undefined;
  }

  private getByName(name: string): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag | undefined;
  }

  create(name: string): Tag {
    const existing = this.getByName(name);
    if (existing) return existing;

    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    return this.getById(result.lastInsertRowid as number)!;
  }

  delete(id: number): boolean {
    const tag = this.getById(id);
    if (!tag) return false;

    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return true;
  }

  getByTransactionId(transactionId: number): Tag[] {
    return db.prepare(`
      SELECT t.* FROM tags t
      JOIN transaction_tags tt ON t.id = tt.tag_id
      WHERE tt.transaction_id = ?
    `).all(transactionId) as Tag[];
  }
}

export const tagService = new TagService();
