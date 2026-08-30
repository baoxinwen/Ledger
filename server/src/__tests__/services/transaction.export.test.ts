// getAllForExport 测试：导出语义应返回全部交易，不被分页 limit 静默截断。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { transactionService } from '../../services/transaction.service';

describe('TransactionService.getAllForExport', () => {
  let expenseId: number;

  beforeEach(() => {
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM categories');

    const cat = db.prepare(
      `INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES ('餐饮', 'expense', '🍽️', '#8A5A61', 1, 0)`
    ).run();
    expenseId = cat.lastInsertRowid as number;
  });

  it('返回全部交易，不受分页 limit 影响', () => {
    const insert = db.prepare(
      'INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    );
    for (let index = 0; index < 25; index++) {
      insert.run('expense', (10 + index) * 100, expenseId, `记录${index}`, '2026-01-01');
    }

    expect(transactionService.getAllForExport()).toHaveLength(25);
  });

  it('与 getAll 分页行为区分：默认 getAll 只返回第一页，导出返回全部', () => {
    const insert = db.prepare(
      'INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    );
    for (let index = 0; index < 25; index++) {
      insert.run('expense', (10 + index) * 100, expenseId, `记录${index}`, '2026-01-01');
    }

    const paged = transactionService.getAll({});
    expect(paged.data).toHaveLength(20);
    expect(paged.total).toBe(25);
    expect(transactionService.getAllForExport()).toHaveLength(25);
  });

  it('批量联查避免 N+1：加载列表的查询次数不随记录数线性增长', () => {
    const insert = db.prepare(
      'INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    );
    for (let index = 0; index < 5; index++) {
      insert.run('expense', (10 + index) * 100, expenseId, `记录${index}`, '2026-01-01');
    }

    let prepareCount = 0;
    const originalPrepare = db.prepare.bind(db);
    (db as any).prepare = (...args: [string]) => {
      prepareCount += 1;
      return originalPrepare(...args);
    };

    try {
      transactionService.getAll({ limit: 5, page: 1 });
    } finally {
      (db as any).prepare = originalPrepare;
    }

    // 批量方案：count(1) + summary 汇总(1) + data(1) + 分类批量(1) + 标签批量(1) = 5；
    // 旧的逐条 enrich 方案 = 1 + 1 + 记录数*2 = 12。
    expect(prepareCount).toBeLessThanOrEqual(5);
  });

  it('LIKE 搜索把 % 和 _ 当字面字符而不是通配符', () => {
    const insert = db.prepare(
      'INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run('expense', 1000, expenseId, '折扣50%', '2026-01-01');
    insert.run('expense', 2000, expenseId, '普通备注', '2026-01-02');
    insert.run('expense', 3000, expenseId, '带_下划线', '2026-01-03');

    // 搜索字面 %：只应命中含 % 的记录；未转义时 %%% 会匹配全部。
    const percentResult = transactionService.getAll({ keyword: '%' });
    expect(percentResult.total).toBe(1);
    expect(percentResult.data[0].note).toBe('折扣50%');

    // 搜索字面 _：未转义时 _ 会匹配任意单字符。
    const underscoreResult = transactionService.getAll({ keyword: '_' });
    expect(underscoreResult.total).toBe(1);
    expect(underscoreResult.data[0].note).toBe('带_下划线');
  });

  it('getStats 带 type 过滤时不应抛 ambiguous column 错误', () => {
    const insert = db.prepare(
      'INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run('income', 500000, expenseId, '工资', '2026-01-01');

    // categoryStats 联表 JOIN categories，categories 也有 type 列；type 过滤必须带表前缀。
    const stats = transactionService.getStats({ type: 'income' });
    expect(stats.totalIncome).toBe(5000);
    expect(stats.totalExpense).toBe(0);
    expect(stats.categoryStats).toHaveLength(1);
  });

  it('create 在标签外键失败时整体回滚，不残留半写入交易', () => {
    expect(() => {
      transactionService.create({
        type: 'expense',
        amount: 100,
        category_id: expenseId,
        date: '2026-01-01',
        tag_ids: [99999], // 不存在的标签，外键约束失败
      });
    }).toThrow();

    const count = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    expect(count.count).toBe(0);
  });

  it('统计金额四舍五入到分，避免浮点误差外泄', () => {
    const insert = db.prepare(
      'INSERT INTO transactions (type, amount_cents, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run('expense', 10, expenseId, 'a', '2026-01-01');
    insert.run('expense', 20, expenseId, 'b', '2026-01-01');

    const stats = transactionService.getStats({});
    expect(stats.totalExpense).toBe(0.3);
    expect(stats.balance).toBe(-0.3);
  });
});
