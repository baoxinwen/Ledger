// CRUD 路由集成测试：分类/标签/预算/设置/交易的 HTTP 层行为与校验分支。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import request from 'supertest';
import db from '../setup';
import app from '../../app';
import { authService } from '../../services/auth.service';
import { settingsService } from '../../services/settings.service';

async function setupAgent(): Promise<ReturnType<typeof request.agent>> {
  process.env.SETUP_TOKEN = 'crud-token';
  authService.ensureSetupToken();
  const agent = request.agent(app);
  await agent.post('/api/auth/setup').send({ token: 'crud-token', username: 'admin', password: 'password123' });
  delete process.env.SETUP_TOKEN;
  return agent;
}

describe('CRUD API routes', () => {
  beforeEach(() => {
    process.env.SETUP_TOKEN = 'crud-token';
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM categories');
    db.exec("DELETE FROM app_settings WHERE key IN ('setup_token_hash','time_zone','theme_mode')");
  });

  afterEach(() => {
    delete process.env.SETUP_TOKEN;
  });

  it('categories: 列表、按类型过滤、创建、更新、删除', async () => {
    const agent = await setupAgent();

    const created = await agent.post('/api/categories').send({ name: '宠物', type: 'expense' });
    expect(created.status).toBe(201);
    expect(created.body.is_preset).toBe(0);

    expect((await agent.get('/api/categories')).body).toHaveLength(1);
    expect((await agent.get('/api/categories?type=income')).body).toHaveLength(0);

    const updated = await agent.put(`/api/categories/${created.body.id}`).send({ name: '宠物用品' });
    expect(updated.body.name).toBe('宠物用品');

    expect((await agent.delete(`/api/categories/${created.body.id}`)).status).toBe(204);
  });

  it('categories: 非法类型返回 400，未登录返回 401', async () => {
    const agent = await setupAgent();
    expect((await agent.post('/api/categories').send({ name: 'x', type: 'other' })).status).toBe(400);
    expect((await request(app).get('/api/categories')).status).toBe(401);
  });

  it('tags: 创建、同名去重、删除', async () => {
    const agent = await setupAgent();
    const created = await agent.post('/api/tags').send({ name: '午餐' });
    expect(created.status).toBe(201);

    const dup = await agent.post('/api/tags').send({ name: '午餐' });
    expect(dup.body.id).toBe(created.body.id);
    const tagList = (await agent.get('/api/tags')).body;
    expect(tagList).toHaveLength(1);
    // 路由层 HTTP 契约断言：usage_count 必须出现在列表响应里（0 次也要有）
    expect(tagList[0].usage_count).toBe(0);

    expect((await agent.delete(`/api/tags/${created.body.id}`)).status).toBe(204);
    expect((await agent.post('/api/tags').send({ name: ' ' })).status).toBe(400);
  });

  it('budgets: 创建、状态查询、校验、删除', async () => {
    const agent = await setupAgent();

    const created = await agent.post('/api/budgets').send({ amount: 1000, period: 'monthly', start_date: '2026-08-01' });
    expect(created.status).toBe(201);

    const status = await agent.get('/api/budgets/status?month=2026-08');
    expect(status.status).toBe(200);
    expect(status.body).toHaveLength(1);

    // 非法月份与非法金额
    expect((await agent.get('/api/budgets/status?month=2026-13')).status).toBe(400);
    expect((await agent.post('/api/budgets').send({ amount: 0, period: 'monthly', start_date: '2026-08-01' })).status).toBe(400);

    expect((await agent.delete(`/api/budgets/${created.body.id}`)).status).toBe(204);
  });

  it('budgets: PUT category_id=null 可改回总预算（此前被静默忽略）', async () => {
    const agent = await setupAgent();
    const cat = await agent.post('/api/categories').send({ name: '餐饮', type: 'expense' });

    const created = await agent.post('/api/budgets').send({ category_id: cat.body.id, amount: 500, period: 'monthly', start_date: '2026-08-01' });
    expect(created.body.category_id).toBe(cat.body.id);

    // 前端编辑预算改回"总预算"时显式提交 null：必须真实清空分类，而不是被 optionalPositiveId 折叠成"未提供"跳过更新。
    const updated = await agent.put(`/api/budgets/${created.body.id}`).send({ category_id: null });
    expect(updated.status).toBe(200);
    expect(updated.body.category_id).toBeNull();

    const reFetched = await agent.get(`/api/budgets/${created.body.id}`);
    expect(reFetched.body.category_id).toBeNull();
  });

  it('budgets: 收入分类不能作为预算分类（此前静默创建 spent 恒为 0 的无效预算）', async () => {
    const agent = await setupAgent();
    const incomeCat = await agent.post('/api/categories').send({ name: '工资', type: 'income' });

    const created = await agent.post('/api/budgets').send({ category_id: incomeCat.body.id, amount: 500, period: 'monthly', start_date: '2026-08-01' });
    expect(created.status).toBe(400);

    // 更新路径同样拦截：支出预算不能被改挂到收入分类上。
    const expenseCat = await agent.post('/api/categories').send({ name: '餐饮', type: 'expense' });
    const budget = await agent.post('/api/budgets').send({ category_id: expenseCat.body.id, amount: 500, period: 'monthly', start_date: '2026-08-01' });
    const updated = await agent.put(`/api/budgets/${budget.body.id}`).send({ category_id: incomeCat.body.id });
    expect(updated.status).toBe(400);
    // 原预算不应被部分修改
    expect((await agent.get(`/api/budgets/${budget.body.id}`)).body.category_id).toBe(expenseCat.body.id);
  });

  it('settings: 读取默认、更新主题、拒绝非法时区', async () => {
    const agent = await setupAgent();

    const initial = await agent.get('/api/settings');
    expect(initial.body.theme_mode).toBe('system');

    const updated = await agent.put('/api/settings').send({ theme_mode: 'dark' });
    expect(updated.body.theme_mode).toBe('dark');

    expect((await agent.put('/api/settings').send({ time_zone: 'UTC+8' })).status).toBe(400);
  });

  it('settings: 系统级错误按 500 + 通用文案响应，不透传内部错误原文', async () => {
    const agent = await setupAgent();
    const spy = jest.spyOn(settingsService, 'updateSettings').mockImplementationOnce(() => {
      const sqliteError = new Error('SQLITE_FULL: database or disk is full');
      sqliteError.name = 'SqliteError';
      throw sqliteError;
    });

    const response = await agent.put('/api/settings').send({ theme_mode: 'dark' });
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('服务器内部错误');
    expect(response.body.error).not.toContain('SQLITE_FULL');
    spy.mockRestore();
  });

  it('transactions: 创建并分页/筛选查询', async () => {
    const agent = await setupAgent();
    const cat = await agent.post('/api/categories').send({ name: '餐饮', type: 'expense' });
    const incomeCat = await agent.post('/api/categories').send({ name: '工资', type: 'income' });
    await agent.post('/api/transactions').send({ type: 'expense', amount: 10, category_id: cat.body.id, date: '2026-08-01' });
    await agent.post('/api/transactions').send({ type: 'expense', amount: 20, category_id: cat.body.id, date: '2026-08-02' });
    await agent.post('/api/transactions').send({ type: 'income', amount: 500, category_id: incomeCat.body.id, date: '2026-08-03' });
    // 分类类型与交易类型不一致时返回 400（审查修复：此前 API 层不校验，可静默污染报表）
    const mismatched = await agent.post('/api/transactions').send({ type: 'income', amount: 1, category_id: cat.body.id, date: '2026-08-04' });
    expect(mismatched.status).toBe(400);

    const page = await agent.get('/api/transactions?limit=1&page=1');
    expect(page.body.total).toBe(3);
    expect(page.body.data).toHaveLength(1);
    // summary 是全筛选聚合（与分页无关）：路由层 HTTP 契约断言
    expect(page.body.summary).toEqual({ income: 500, expense: 30, count: 3 });

    const expenseOnly = await agent.get('/api/transactions?type=expense');
    expect(expenseOnly.body.total).toBe(2);

    const badFilter = await agent.get('/api/transactions?type=other');
    expect(badFilter.status).toBe(400);
    expect((await agent.get('/api/transactions/99999')).status).toBe(404);
  });
});
