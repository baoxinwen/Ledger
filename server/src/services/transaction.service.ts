// 交易服务封装 transactions 表读写，并统一补全分类和标签明细。
import db from '../database';
import { Transaction, TransactionWithDetails, TransactionFilter, ImportMetadata } from '../types';
import { categoryService } from './category.service';
import { tagService } from './tag.service';
import { roundToCents } from '../utils/amount';

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
      whereClauses.push(`t.note LIKE ? ESCAPE '\\'`);
      params.push(`%${escapeLikeKeyword(keyword)}%`);
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
      ORDER BY ${sortColumn} ${sortOrder}, t.id
      LIMIT ? OFFSET ?
    `;

    const transactions = db.prepare(dataSql).all(...params, limit, offset) as Transaction[];
    const data = this.enrichTransactions(transactions);

    return { data, total };
  }

  // 导出用：不分页返回全部交易，保证备份完整不会被 limit 静默截断。
  getAllForExport(): TransactionWithDetails[] {
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY date, id').all() as Transaction[];
    return this.enrichTransactions(transactions);
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
    // 交易行与标签关联在同一事务内写入：任一步失败整体回滚，避免半写入（如标签外键失败时残留交易）。
    const transactionId = db.transaction(() => {
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

      const id = result.lastInsertRowid as number;
      if (data.tag_ids && data.tag_ids.length > 0) {
        this.syncTransactionTags(id, data.tag_ids);
      }
      return id;
    })();

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

    // 字段更新与标签同步在同一事务内：任一步失败整体回滚，避免旧标签被删但字段未更新等半状态。
    db.transaction(() => {
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

      db.prepare("UPDATE transactions SET updated_at = datetime('now') WHERE id = ?").run(id);

      if (data.tag_ids !== undefined) {
        this.syncTransactionTags(id, data.tag_ids);
      }
    })();

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
      whereClauses.push('t.date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      whereClauses.push('t.date <= ?');
      params.push(end_date);
    }
    if (type) {
      whereClauses.push('t.type = ?');
      params.push(type);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalIncome = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t ${whereClause} ${whereClauses.length > 0 ? 'AND' : 'WHERE'} t.type = 'income'
    `).get(...params) as { total: number };

    const totalExpense = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t ${whereClause} ${whereClauses.length > 0 ? 'AND' : 'WHERE'} t.type = 'expense'
    `).get(...params) as { total: number };

    // 联表查询必须用 t. 前缀限定 type/date，避免与 categories 表的同名列产生歧义。
    const categoryStats = db.prepare(`
      SELECT c.name, c.icon, c.color, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY total DESC
    `).all(...params) as { name: string; icon: string; color: string; total: number }[];

    const dailyStats = db.prepare(`
      SELECT t.date, t.type, SUM(t.amount) as total
      FROM transactions t
      ${whereClause}
      GROUP BY t.date, t.type
      ORDER BY t.date
    `).all(...params) as { date: string; type: string; total: number }[];

    const income = roundToCents(totalIncome.total);
    const expense = roundToCents(totalExpense.total);
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: roundToCents(income - expense),
      categoryStats,
      dailyStats,
    };
  }

  // 批量补全分类与标签：一次联查避免逐条 N+1，分类/标签按 id 分组后映射。
  private enrichTransactions(transactions: Transaction[]): TransactionWithDetails[] {
    if (transactions.length === 0) return [];
    const categoryMap = categoryService.getByIds(transactions.map((transaction) => transaction.category_id));
    const tagMap = tagService.getByTransactionIds(transactions.map((transaction) => transaction.id));
    return transactions.map((transaction) => ({
      ...transaction,
      category: categoryMap.get(transaction.category_id)!,
      tags: tagMap.get(transaction.id) || [],
    }));
  }

  private enrichTransaction(transaction: Transaction): TransactionWithDetails {
    return this.enrichTransactions([transaction])[0];
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

// 转义 LIKE 通配符，让用户搜索的 % 和 _ 按字面匹配而不是被当作通配符。
function escapeLikeKeyword(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
