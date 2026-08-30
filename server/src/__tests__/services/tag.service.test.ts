// 标签服务测试：创建去重、删除、按交易查询与批量反查。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { tagService } from '../../services/tag.service';
import { transactionService } from '../../services/transaction.service';

describe('TagService', () => {
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

  it('create 去重：同名标签返回既有记录', () => {
    const first = tagService.create('午餐');
    const second = tagService.create('午餐');
    expect(second.id).toBe(first.id);
    expect(tagService.getAll()).toHaveLength(1);
  });

  it('getById / delete 基础操作', () => {
    const tag = tagService.create('通勤');
    expect(tagService.getById(tag.id)?.name).toBe('通勤');
    expect(tagService.delete(tag.id)).toBe(true);
    expect(tagService.getById(tag.id)).toBeUndefined();
    expect(tagService.delete(tag.id)).toBe(false);
  });

  it('getByTransactionId 与批量 getByTransactionIds 返回交易标签', () => {
    const lunch = tagService.create('午餐');
    const commute = tagService.create('通勤');
    const t1 = transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, date: '2026-01-01', tag_ids: [lunch.id] });
    const t2 = transactionService.create({ type: 'expense', amount: 20, category_id: expenseId, date: '2026-01-02', tag_ids: [lunch.id, commute.id] });

    expect(tagService.getByTransactionId(t1.id).map((t) => t.name)).toEqual(['午餐']);

    const map = tagService.getByTransactionIds([t1.id, t2.id]);
    expect(map.get(t1.id)?.map((t) => t.name)).toEqual(['午餐']);
    expect(map.get(t2.id)?.map((t) => t.name).sort()).toEqual(['午餐', '通勤']);
  });

  it('getAll 返回每个标签的 usage_count（含 0 次）', () => {
    const lunch = tagService.create('午餐');
    const unused = tagService.create('闲置');
    transactionService.create({ type: 'expense', amount: 10, category_id: expenseId, date: '2026-01-01', tag_ids: [lunch.id] });
    transactionService.create({ type: 'expense', amount: 20, category_id: expenseId, date: '2026-01-02', tag_ids: [lunch.id] });

    const tags = tagService.getAll();
    const lunchRow = tags.find((t) => t.id === lunch.id);
    const unusedRow = tags.find((t) => t.id === unused.id);
    expect(lunchRow?.usage_count).toBe(2);
    expect(unusedRow?.usage_count).toBe(0);
  });
});
