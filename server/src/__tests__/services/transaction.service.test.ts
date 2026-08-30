// 交易服务测试：覆盖 CRUD、分页筛选、统计、标签同步、导出与去重。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { transactionService } from '../../services/transaction.service';
import { tagService } from '../../services/tag.service';

describe('TransactionService', () => {
  let expenseId: number;
  let incomeId: number;

  beforeEach(() => {
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM import_batches');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM categories');

    const expense = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('餐饮', 'expense', '🍽️', '#8A5A61', 1, 0)`
    ).run();
    expenseId = expense.lastInsertRowid as number;
    const income = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('工资', 'income', '💰', '#5F6F52', 1, 0)`
    ).run();
    incomeId = income.lastInsertRowid as number;
  });

  it('create 返回补全分类与标签的交易', () => {
    const tag = tagService.create('午餐');
    const created = transactionService.create({
      type: 'expense',
      amount: 12.5,
      category_id: expenseId,
      note: '奶茶',
      date: '2026-01-01',
      tag_ids: [tag.id],
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.category.name).toBe('餐饮');
    expect(created.tags.map((t) => t.name)).toEqual(['午餐']);
  });

  it('create 在数据库中以整数分存储并以元返回', () => {
    const created = transactionService.create({
      type: 'expense',
      amount: 12.34,
      category_id: expenseId,
      date: '2026-01-01',
    });

    expect(created.amount).toBe(12.34);
    expect(db.prepare('SELECT amount_cents FROM transactions WHERE id = ?').get(created.id)).toEqual({ amount_cents: 1234 });
  });

  it('getAll 分页并按类型/分类筛选', () => {
    transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 20, category_id: expenseId, date: '2026-01-02' });
    transactionService.create({ type: 'income', amount: 5000, category_id: incomeId, date: '2026-01-03' });

    const all = transactionService.getAll({ page: 1, limit: 20 });
    expect(all.total).toBe(3);
    expect(all.data).toHaveLength(3);
    // 汇总条：按当前筛选全量聚合（不受分页影响）
    expect(all.summary).toEqual({ income: 5000, expense: 30, count: 3 });

    // 分页不影响 summary：只取 1 条时汇总仍是全量
    const paged = transactionService.getAll({ page: 1, limit: 1 });
    expect(paged.data).toHaveLength(1);
    expect(paged.summary.count).toBe(3);

    const expenseOnly = transactionService.getAll({ type: 'expense' });
    expect(expenseOnly.total).toBe(2);
    expect(expenseOnly.summary).toEqual({ income: 0, expense: 30, count: 2 });

    const byCategory = transactionService.getAll({ category_id: incomeId });
    expect(byCategory.total).toBe(1);
    expect(byCategory.data[0].amount).toBe(5000);
  });

  it('getAll 关键词搜索（含 LIKE 通配符转义）与金额排序', () => {
    transactionService.create({ type: 'expense', amount: 30, category_id: expenseId, note: '折扣50%', date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, note: '普通', date: '2026-01-02' });

    const keyword = transactionService.getAll({ keyword: '50%' });
    expect(keyword.total).toBe(1);

    const sorted = transactionService.getAll({ sort: 'amount', order: 'desc' });
    expect(sorted.data[0].amount).toBe(30);
  });

  it('getAll 将以元传入的金额范围换算为分筛选', () => {
    transactionService.create({ type: 'expense', amount: 10.01, category_id: expenseId, date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 10.02, category_id: expenseId, date: '2026-01-02' });

    const result = transactionService.getAll({ min_amount: 10.02, max_amount: 10.02 });
    expect(result.data.map((item) => item.amount)).toEqual([10.02]);
  });

  it('update 修改字段并同步标签', () => {
    const created = transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, note: '旧', date: '2026-01-01' });
    const tag = tagService.create('通勤');

    const updated = transactionService.update(created.id, { amount: 15, note: '新', tag_ids: [tag.id] });
    expect(updated?.amount).toBe(15);
    expect(updated?.note).toBe('新');
    expect(updated?.tags.map((t) => t.name)).toEqual(['通勤']);
  });

  it('delete 删除并返回是否存在', () => {
    const created = transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, date: '2026-01-01' });
    expect(transactionService.delete(created.id)).toBe(true);
    expect(transactionService.delete(created.id)).toBe(false);
  });

  it('getStats 汇总收入/支出/结余与分类统计', () => {
    transactionService.create({ type: 'expense', amount: 100, category_id: expenseId, date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 200, category_id: expenseId, date: '2026-01-02' });
    transactionService.create({ type: 'income', amount: 500, category_id: incomeId, date: '2026-01-03' });

    const stats = transactionService.getStats({ start_date: '2026-01-01', end_date: '2026-01-31' });
    expect(stats.totalExpense).toBe(300);
    expect(stats.totalIncome).toBe(500);
    expect(stats.balance).toBe(200);
    expect(stats.categoryStats).toHaveLength(2);
    expect(stats.dailyStats).toHaveLength(3);
  });

  it('getStats 返回自然日日均、等长上期、变化指标和多标签全额统计', () => {
    const work = tagService.create('工作');
    const meal = tagService.create('聚餐');
    transactionService.create({ type: 'income', amount: 50, category_id: incomeId, date: '2025-12-31' });
    transactionService.create({ type: 'income', amount: 100, category_id: incomeId, date: '2026-01-01', tag_ids: [work.id] });
    transactionService.create({ type: 'expense', amount: 50, category_id: expenseId, date: '2026-01-02', tag_ids: [work.id, meal.id] });
    transactionService.create({ type: 'expense', amount: 25, category_id: expenseId, date: '2026-01-03' });

    const stats = transactionService.getStats({ start_date: '2026-01-01', end_date: '2026-01-03' });

    expect(stats).toMatchObject({
      transactionCount: 3,
      days: 3,
      dailyAverages: { income: 33.33, expense: 25 },
      previousPeriod: {
        startDate: '2025-12-29', endDate: '2025-12-31', totalIncome: 50,
        totalExpense: 0, balance: 50, transactionCount: 1, days: 3,
      },
      changes: { income: 100, expense: null, transactionCount: 200, balance: -25 },
    });
    expect(stats.tagStats.expense).toEqual([
      expect.objectContaining({ name: '工作', total: 50, count: 1, percentage: 66.67 }),
      expect.objectContaining({ name: '聚餐', total: 50, count: 1, percentage: 66.67 }),
    ]);
    expect(stats.tagStats.income).toEqual([
      expect.objectContaining({ name: '工作', total: 100, count: 1, percentage: 100 }),
    ]);
  });

  it('getAllForExport 返回全部记录（不分页）', () => {
    for (let index = 0; index < 25; index++) {
      transactionService.create({ type: 'expense', amount: index, category_id: expenseId, date: '2026-01-01' });
    }
    expect(transactionService.getAllForExport()).toHaveLength(25);
  });

  it('existsBySource 识别来源订单号去重', () => {
    transactionService.create({
      type: 'expense',
      amount: 10,
      category_id: expenseId,
      date: '2026-01-01',
      source: 'alipay',
      source_transaction_id: 'order-1',
    });
    expect(transactionService.existsBySource('alipay', 'order-1')).toBe(true);
    expect(transactionService.existsBySource('alipay', 'order-2')).toBe(false);
  });

  it('详情返回只读来源字段和可空导入批次摘要', () => {
    const batch = db.prepare(`
      INSERT INTO import_batches (filename, source, status, success_count, created_at, completed_at)
      VALUES ('alipay.csv', 'alipay', 'completed', 1, '2026-08-18 03:00:00', '2026-08-18 03:00:01')
    `).run();
    const imported = transactionService.create({
      type: 'expense', amount: 12.34, category_id: expenseId, date: '2026-08-18',
      source: 'alipay', source_transaction_id: 'trade-1', payment_method: '余额',
      import_batch_id: Number(batch.lastInsertRowid),
    });
    const manual = transactionService.create({ type: 'income', amount: 20, category_id: incomeId, date: '2026-08-18' });

    expect(transactionService.getDetailById(imported.id)).toMatchObject({
      source: 'alipay',
      source_transaction_id: 'trade-1',
      payment_method: '余额',
      importBatch: {
        id: Number(batch.lastInsertRowid), filename: 'alipay.csv', source: 'alipay', status: 'completed',
      },
    });
    expect(transactionService.getDetailById(manual.id)?.importBatch).toBeNull();
  });
});
