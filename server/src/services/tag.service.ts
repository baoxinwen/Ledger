// 标签服务保证标签名唯一，并提供交易到标签的反向查询能力。
import db from '../database';
import { Tag } from '../types';
import { chunkArray } from '../utils/array';
import { getErrorMessage } from '../utils/errors';

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

    try {
      const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
      return this.getById(result.lastInsertRowid as number)!;
    } catch (error) {
      // 并发创建同名标签时可能触发 UNIQUE 约束，返回既有标签而不是抛 500。
      if (/UNIQUE constraint failed/i.test(getErrorMessage(error))) {
        const existingAfter = this.getByName(name);
        if (existingAfter) return existingAfter;
      }
      throw error;
    }
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

  // 批量取多笔交易的标签，供交易列表联查去 N+1；返回按交易 id 分组的标签列表。
  getByTransactionIds(transactionIds: number[]): Map<number, Tag[]> {
    const map = new Map<number, Tag[]>();
    const uniqueIds = [...new Set(transactionIds)];
    for (const batch of chunkArray(uniqueIds, 500)) {
      const placeholders = batch.map(() => '?').join(',');
      const rows = db.prepare(`
        SELECT tt.transaction_id, t.id, t.name
        FROM transaction_tags tt
        JOIN tags t ON t.id = tt.tag_id
        WHERE tt.transaction_id IN (${placeholders})
        ORDER BY t.name
      `).all(...batch) as { transaction_id: number; id: number; name: string }[];
      rows.forEach((row) => {
        const list = map.get(row.transaction_id) || [];
        list.push({ id: row.id, name: row.name });
        map.set(row.transaction_id, list);
      });
    }
    return map;
  }
}

export const tagService = new TagService();
