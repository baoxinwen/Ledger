import db from '../database';
import { Transaction, TransactionWithDetails, TransactionFilter, ImportMetadata } from '../types';
import { categoryService } from './category.service';
import { tagService } from './tag.service';

export class TransactionService {
  private buildWhereClause(filter: TransactionFilter): { whereClause: string; params: any[] } {
    const {
      type,
      category_id,
      tag_id,
      start_date,
      end_date,
      min_amount,
      max_amount,
      keyword,
    } = filter;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (type) {
      whereClauses.push('t.type = ?');
      params.push(type);
    }
    if (category_id) {
      whereClauses.push('t.category_id = ?');
      params.push(category_id);
    }
    if (start_date) {
      whereClauses.push('t.date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      whereClauses.push('t.date <= ?');
      params.push(end_date);
    }
    if (min_amount !== undefined) {
      whereClauses.push('t.amount >= ?');
      params.push(min_amount);
    }
    if (max_amount !== undefined) {
      whereClauses.push('t.amount <= ?');
      params.push(max_amount);
    }
    if (keyword) {
      whereClauses.push('t.note LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (tag_id) {
      whereClauses.push('EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = t.id AND tt.tag_id = ?)');
      params.push(tag_id);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    return { whereClause, params };
  }

  getAll(filter: TransactionFilter = {}): { data: TransactionWithDetails[]; total: number } {
    const {
      page = 1,
      limit = 20,
      sort = 'date',
      order = 'desc'
    } = filter;

    const { whereClause, params } = this.buildWhereClause(filter);

    const countSql = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
    const total = (db.prepare(countSql).get(...params) as { total: number }).total;

    const sortColumn = sort === 'amount' ? 't.amount' : 't.date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT t.* FROM transactions t
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const transactions = db.prepare(dataSql).all(...params, limit, offset) as Transaction[];
    const data = transactions.map(t => this.enrichTransaction(t));

    return { data, total };
  }

  getById(id: number): TransactionWithDetails | undefined {
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!transaction) return undefined;
    return this.enrichTransaction(transaction);
  }

  create(data: {
    type: 'income' | 'expense';
    amount: number;
    category_id: number;
    note?: string;
    date: string;
    tag_ids?: number[];
  } & ImportMetadata): TransactionWithDetails {
    const result = db.prepare(
      `INSERT INTO transactions (
        type,
        amount,
        category_id,
        note,
        date,
        source,
        source_transaction_id,
        source_merchant_order_id,
        source_category,
        source_time,
        payment_method,
        source_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.type,
      data.amount,
      data.category_id,
      data.note || null,
      data.date,
      data.source || null,
      data.source_transaction_id || null,
      data.source_merchant_order_id || null,
      data.source_category || null,
      data.source_time || null,
      data.payment_method || null,
      data.source_status || null
    );

    const transactionId = result.lastInsertRowid as number;

    if (data.tag_ids && data.tag_ids.length > 0) {
      this.syncTransactionTags(transactionId, data.tag_ids);
    }

    return this.getById(transactionId)!;
  }

  update(id: number, data: {
    type?: 'income' | 'expense';
    amount?: number;
    category_id?: number;
    note?: string;
    date?: string;
    tag_ids?: number[];
  }): TransactionWithDetails | null {
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!existing) return null;

    if (data.type) {
      db.prepare('UPDATE transactions SET type = ? WHERE id = ?').run(data.type, id);
    }
    if (data.amount !== undefined) {
      db.prepare('UPDATE transactions SET amount = ? WHERE id = ?').run(data.amount, id);
    }
    if (data.category_id !== undefined) {
      db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(data.category_id, id);
    }
    if (data.note !== undefined) {
      db.prepare('UPDATE transactions SET note = ? WHERE id = ?').run(data.note, id);
    }
    if (data.date) {
      db.prepare('UPDATE transactions SET date = ? WHERE id = ?').run(data.date, id);
    }

    db.prepare('UPDATE transactions SET updated_at = datetime("now") WHERE id = ?').run(id);

    if (data.tag_ids !== undefined) {
      this.syncTransactionTags(id, data.tag_ids);
    }

    return this.getById(id) ?? null;
  }

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  existsBySource(source: string, sourceTransactionId: string): boolean {
    const row = db.prepare(`
      SELECT id FROM transactions
      WHERE source = ? AND source_transaction_id = ?
      LIMIT 1
    `).get(source, sourceTransactionId);
    return Boolean(row);
  }

  getStats(query: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }) {
    const { start_date, end_date, type } = query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (start_date) {
      whereClauses.push('date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      whereClauses.push('date <= ?');
      params.push(end_date);
    }
    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} ${whereClauses.length > 0 ? 'AND' : 'WHERE'} type = 'income'
    `).get(...params) as { total: number };

    const totalExpense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} ${whereClauses.length > 0 ? 'AND' : 'WHERE'} type = 'expense'
    `).get(...params) as { total: number };

    const categoryStats = db.prepare(`
      SELECT c.name, c.icon, c.color, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY total DESC
    `).all(...params) as { name: string; icon: string; color: string; total: number }[];

    const dailyStats = db.prepare(`
      SELECT date, type, SUM(amount) as total
      FROM transactions
      ${whereClause}
      GROUP BY date, type
      ORDER BY date
    `).all(...params) as { date: string; type: string; total: number }[];

    return {
      totalIncome: totalIncome.total,
      totalExpense: totalExpense.total,
      balance: totalIncome.total - totalExpense.total,
      categoryStats,
      dailyStats,
    };
  }

  private enrichTransaction(transaction: Transaction): TransactionWithDetails {
    const category = categoryService.getById(transaction.category_id)!;
    const tags = tagService.getByTransactionId(transaction.id);
    return { ...transaction, category, tags };
  }

  private syncTransactionTags(transactionId: number, tagIds: number[]): void {
    db.prepare('DELETE FROM transaction_tags WHERE transaction_id = ?').run(transactionId);
    if (tagIds.length > 0) {
      const insertTag = db.prepare('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
      tagIds.forEach(tagId => {
        insertTag.run(transactionId, tagId);
      });
    }
  }
}

export const transactionService = new TransactionService();
