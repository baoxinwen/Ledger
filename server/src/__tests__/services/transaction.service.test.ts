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

  it('getAll 分页并按类型/分类筛选', () => {
    transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, date: '2026-01-01' });
    transactionService.create({ type: 'expense', amount: 20, category_id: expenseId, date: '2026-01-02' });
    transactionService.create({ type: 'income', amount: 5000, category_id: incomeId, date: '2026-01-03' });

    const all = transactionService.getAll({ page: 1, limit: 20 });
    expect(all.total).toBe(3);
    expect(all.data).toHaveLength(3);

    const expenseOnly = transactionService.getAll({ type: 'expense' });
    expect(expenseOnly.total).toBe(2);

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
});
