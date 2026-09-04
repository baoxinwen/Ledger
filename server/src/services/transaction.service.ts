// 交易服务封装 transactions 表读写，并统一补全分类和标签明细。
import db from '../database';
import { Transaction, TransactionWithDetails, TransactionFilter, ImportMetadata, TransactionDetail, ImportBatchSummary } from '../types';
import { categoryService } from './category.service';
import { tagService } from './tag.service';
import { fromCents, toCents } from '../utils/amount';
import { HttpError } from '../utils/errors';

export class TransactionService {
  // 校验分类存在且类型与交易一致（防跨类型错配静默污染报表）。
  private assertCategoryMatchesType(categoryId: number, type: 'income' | 'expense'): void {
    const category = db.prepare('SELECT type FROM categories WHERE id = ?').get(categoryId) as
      | { type: 'income' | 'expense' }
      | undefined;
    if (!category) {
      throw new HttpError(400, '分类不存在');
    }
    if (category.type !== type) {
      throw new HttpError(400, `分类类型与交易类型不一致：该分类是${category.type === 'income' ? '收入' : '支出'}分类`);
    }
  }

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
      whereClauses.push('t.amount_cents >= ?');
      params.push(toCents(min_amount));
    }
    if (max_amount !== undefined) {
      whereClauses.push('t.amount_cents <= ?');
      params.push(toCents(max_amount));
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

  getAll(filter: TransactionFilter = {}): {
    data: TransactionWithDetails[];
    total: number;
    summary: { income: number; expense: number; count: number };
  } {
    const {
      page = 1,
      limit = 20,
      sort = 'date',
      order = 'desc'
    } = filter;

    const { whereClause, params } = this.buildWhereClause(filter);

    const sortColumn = sort === 'amount' ? 't.amount_cents' : 't.date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // count / summary / data 三条查询包在同一事务内：WAL 模式下同事务读取共享一致快照，
    // 避免两条查询之间发生写入时"总数、汇总条、列表"互相矛盾。
    const { total, summary, transactions } = db.transaction(() => {
      const countSql = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
      const total = (db.prepare(countSql).get(...params) as { total: number }).total;

      // 汇总条数据：按当前筛选全量聚合（与分页无关），供前端展示"筛选结果收入/支出/结余"。
      const summarySql = `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS income_cents,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS expense_cents
        FROM transactions t
        ${whereClause}
      `;
      const summaryRow = db.prepare(summarySql).get(...params) as {
        count: number;
        income_cents: number;
        expense_cents: number;
      };
      const summary = {
        income: fromCents(summaryRow.income_cents),
        expense: fromCents(summaryRow.expense_cents),
        count: summaryRow.count,
      };

      const dataSql = `
        SELECT t.*, t.amount_cents / 100.0 AS amount FROM transactions t
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}, t.id
        LIMIT ? OFFSET ?
      `;
      const transactions = db.prepare(dataSql).all(...params, limit, offset) as Transaction[];
      return { total, summary, transactions };
    })();

    const data = this.enrichTransactions(transactions);

    return { data, total, summary };
  }

  // 导出用：不分页返回全部交易，保证备份完整不会被 limit 静默截断。
  getAllForExport(): TransactionWithDetails[] {
    const transactions = db.prepare('SELECT *, amount_cents / 100.0 AS amount FROM transactions ORDER BY date, id').all() as Transaction[];
    return this.enrichTransactions(transactions);
  }

  getById(id: number): TransactionWithDetails | undefined {
    const transaction = db.prepare('SELECT *, amount_cents / 100.0 AS amount FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!transaction) return undefined;
    return this.enrichTransaction(transaction);
  }

  getDetailById(id: number): TransactionDetail | undefined {
    const transaction = this.getById(id);
    if (!transaction) return undefined;
    let importBatch: ImportBatchSummary | null = null;
    if (transaction.import_batch_id) {
      const batch = db.prepare(`
        SELECT id, filename, source, status, created_at, completed_at, undone_at
        FROM import_batches
        WHERE id = ?
      `).get(transaction.import_batch_id) as {
        id: number;
        filename: string;
        source: string;
        status: ImportBatchSummary['status'];
        created_at: string;
        completed_at: string | null;
        undone_at: string | null;
      } | undefined;
      if (batch) {
        importBatch = {
          id: batch.id,
          filename: batch.filename,
          source: batch.source,
          status: batch.status,
          createdAt: batch.created_at,
          completedAt: batch.completed_at,
          undoneAt: batch.undone_at,
        };
      }
    }
    return { ...transaction, importBatch };
  }

  create(data: {
    type: 'income' | 'expense';
    amount: number;
    category_id: number;
    note?: string;
    date: string;
    tag_ids?: number[];
  } & ImportMetadata): TransactionWithDetails {
    // 分类必须存在，且类型必须与交易类型一致：否则支出记到收入分类下，
    // 统计、标签排行和预算汇总会被静默污染（此前只靠 FK 校验存在性）。
    this.assertCategoryMatchesType(data.category_id, data.type);

    // 交易行与标签关联在同一事务内写入：任一步失败整体回滚，避免半写入（如标签外键失败时残留交易）。
    const transactionId = db.transaction(() => {
      const result = db.prepare(
        `INSERT INTO transactions (
          type,
          amount_cents,
          category_id,
          note,
          date,
          source,
          source_transaction_id,
          source_merchant_order_id,
          source_category,
          source_time,
          payment_method,
          source_status,
          import_batch_id,
          import_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        data.type,
        toCents(data.amount),
        data.category_id,
        data.note || null,
        data.date,
        data.source || null,
        data.source_transaction_id || null,
        data.source_merchant_order_id || null,
        data.source_category || null,
        data.source_time || null,
        data.payment_method || null,
        data.source_status || null,
        data.import_batch_id || null,
        data.import_fingerprint || null
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
    const existing = db.prepare('SELECT id, type, category_id FROM transactions WHERE id = ?').get(id) as
      | { id: number; type: 'income' | 'expense'; category_id: number }
      | undefined;
    if (!existing) return null;

    // 与 create 相同的类型一致性校验：type 与 category_id 可以只改其一，
    // 以"更新后的最终组合"为准做检查。
    const effectiveType = data.type ?? existing.type;
    const effectiveCategoryId = data.category_id ?? existing.category_id;
    this.assertCategoryMatchesType(effectiveCategoryId, effectiveType);

    // 字段更新与标签同步在同一事务内：任一步失败整体回滚，避免旧标签被删但字段未更新等半状态。
    db.transaction(() => {
      if (data.type) {
        db.prepare('UPDATE transactions SET type = ? WHERE id = ?').run(data.type, id);
      }
      if (data.amount !== undefined) {
        db.prepare('UPDATE transactions SET amount_cents = ? WHERE id = ?').run(toCents(data.amount), id);
      }
      if (data.category_id !== undefined) {
        db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(data.category_id, id);
      }
      if (data.note !== undefined) {
        // 空串归一为 null，与 create（data.note || null）保持同一存储口径：清空备注即回到"无备注"。
        db.prepare('UPDATE transactions SET note = ? WHERE id = ?').run(data.note || null, id);
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
    const totals = this.queryStatsTotals(whereClause, params);

    // 联表查询必须用 t. 前缀限定 type/date，避免与 categories 表的同名列产生歧义。
    const categoryStats = db.prepare(`
      SELECT c.name, c.icon, c.color, c.type, SUM(t.amount_cents) as total_cents
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY total_cents DESC
    `).all(...params) as { name: string; icon: string; color: string; type: 'income' | 'expense'; total_cents: number }[];

    const dailyStats = db.prepare(`
      SELECT t.date, t.type, SUM(t.amount_cents) as total_cents
      FROM transactions t
      ${whereClause}
      GROUP BY t.date, t.type
      ORDER BY t.date
    `).all(...params) as { date: string; type: string; total_cents: number }[];

    const period = start_date && end_date ? equalLengthPeriod(start_date, end_date) : null;
    const days = period?.days ?? 0;
    const previousWhereClauses: string[] = [];
    const previousParams: unknown[] = [];
    if (period) {
      previousWhereClauses.push('t.date >= ?', 't.date <= ?');
      previousParams.push(period.previousStart, period.previousEnd);
    }
    if (type) {
      previousWhereClauses.push('t.type = ?');
      previousParams.push(type);
    }
    const previousTotals = period
      ? this.queryStatsTotals(`WHERE ${previousWhereClauses.join(' AND ')}`, previousParams)
      : null;

    const queryTagStats = (transactionType: 'income' | 'expense', typeTotalCents: number) => {
      const clauses = [...whereClauses, 't.type = ?'];
      const tagParams = [...params, transactionType];
      const tagWhere = `WHERE ${clauses.join(' AND ')}`;
      const rows = db.prepare(`
        SELECT tag.id, tag.name, SUM(t.amount_cents) AS total_cents, COUNT(DISTINCT t.id) AS count
        FROM transactions t
        JOIN transaction_tags tt ON tt.transaction_id = t.id
        JOIN tags tag ON tag.id = tt.tag_id
        ${tagWhere}
        GROUP BY tag.id, tag.name
        ORDER BY total_cents DESC, tag.id
      `).all(...tagParams) as { id: number; name: string; total_cents: number; count: number }[];
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        total: fromCents(row.total_cents),
        count: row.count,
        percentage: typeTotalCents > 0 ? roundTo((row.total_cents / typeTotalCents) * 100, 2) : 0,
      }));
    };

    const income = fromCents(totals.income_cents);
    const expense = fromCents(totals.expense_cents);
    const balanceCents = totals.income_cents - totals.expense_cents;
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: fromCents(balanceCents),
      transactionCount: totals.transaction_count,
      days,
      dailyAverages: {
        income: days > 0 ? fromCents(Math.round(totals.income_cents / days)) : 0,
        expense: days > 0 ? fromCents(Math.round(totals.expense_cents / days)) : 0,
      },
      previousPeriod: period && previousTotals ? {
        startDate: period.previousStart,
        endDate: period.previousEnd,
        totalIncome: fromCents(previousTotals.income_cents),
        totalExpense: fromCents(previousTotals.expense_cents),
        balance: fromCents(previousTotals.income_cents - previousTotals.expense_cents),
        transactionCount: previousTotals.transaction_count,
        days: period.days,
      } : null,
      changes: {
        income: previousTotals ? percentageChange(totals.income_cents, previousTotals.income_cents) : null,
        expense: previousTotals ? percentageChange(totals.expense_cents, previousTotals.expense_cents) : null,
        transactionCount: previousTotals ? percentageChange(totals.transaction_count, previousTotals.transaction_count) : null,
        balance: previousTotals
          ? fromCents(balanceCents - (previousTotals.income_cents - previousTotals.expense_cents))
          : null,
      },
      tagStats: {
        income: queryTagStats('income', totals.income_cents),
        expense: queryTagStats('expense', totals.expense_cents),
      },
      categoryStats: categoryStats.map(({ total_cents, ...item }) => ({ ...item, total: fromCents(total_cents) })),
      dailyStats: dailyStats.map(({ total_cents, ...item }) => ({ ...item, total: fromCents(total_cents) })),
    };
  }

  private queryStatsTotals(whereClause: string, params: unknown[]): {
    income_cents: number;
    expense_cents: number;
    transaction_count: number;
  } {
    return db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS income_cents,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS expense_cents,
        COUNT(*) AS transaction_count
      FROM transactions t
      ${whereClause}
    `).get(...params) as { income_cents: number; expense_cents: number; transaction_count: number };
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

function equalLengthPeriod(startDate: string, endDate: string): {
  days: number;
  previousStart: string;
  previousEnd: string;
} | null {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((end - start) / dayMs) + 1;
  return {
    days,
    previousStart: new Date(start - days * dayMs).toISOString().slice(0, 10),
    previousEnd: new Date(start - dayMs).toISOString().slice(0, 10),
  };
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundTo(((current - previous) / previous) * 100, 2);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
