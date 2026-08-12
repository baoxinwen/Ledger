// 导入导出路由集成测试：JSON/CSV 导出、标准 JSON 导入、multipart 上传。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import request from 'supertest';
import iconv from 'iconv-lite';
import db from '../setup';
import app from '../../app';
import { authService } from '../../services/auth.service';

async function setupAgent(): Promise<ReturnType<typeof request.agent>> {
  process.env.SETUP_TOKEN = 'import-token';
  authService.ensureSetupToken();
  const agent = request.agent(app);
  await agent.post('/api/auth/setup').send({ token: 'import-token', username: 'admin', password: 'password123' });
  delete process.env.SETUP_TOKEN;
  return agent;
}

describe('Import/Export API routes', () => {
  beforeEach(() => {
    process.env.SETUP_TOKEN = 'import-token';
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM budgets');
    db.exec("DELETE FROM app_settings WHERE key = 'setup_token_hash'");
  });

  afterEach(() => {
    delete process.env.SETUP_TOKEN;
  });

  it('导出 JSON 返回全部交易', async () => {
    const agent = await setupAgent();
    const cat = await agent.post('/api/categories').send({ name: '餐饮', type: 'expense' });
    await agent.post('/api/transactions').send({ type: 'expense', amount: 12.5, category_id: cat.body.id, note: '午餐', date: '2026-08-01' });

    const res = await agent.get('/api/export?format=json');
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].amount).toBe(12.5);
  });

  it('导出 CSV 对公式注入前缀做转义', async () => {
    const agent = await setupAgent();
    const cat = await agent.post('/api/categories').send({ name: '餐饮', type: 'expense' });
    await agent.post('/api/transactions').send({ type: 'expense', amount: 1, category_id: cat.body.id, note: '=cmd', date: '2026-08-01' });

    const res = await agent.get('/api/export?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain("'=cmd");
  });

  it('未登录不可导出', async () => {
    expect((await request(app).get('/api/export?format=json')).status).toBe(401);
  });

  it('标准 JSON 导入成功入库', async () => {
    const agent = await setupAgent();
    const res = await agent.post('/api/import').send({
      transactions: [{ type: 'expense', amount: 5, category: '餐饮', date: '2026-08-01' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(1);
    expect((await agent.get('/api/transactions')).body.total).toBe(1);
  });

  it('标准 JSON 导入非法类型计入失败', async () => {
    const agent = await setupAgent();
    const res = await agent.post('/api/import').send({
      transactions: [{ type: 'INCOME', amount: 5, category: '餐饮', date: '2026-08-01' }],
    });
    expect(res.body.failed).toBe(1);
  });

  it('multipart 上传支付宝 CSV 成功导入', async () => {
    const agent = await setupAgent();
    const csv = [
      '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,',
      '2018-12-31 17:16:48,餐饮美食,店铺,/,奶茶,支出,9.68,余额,交易成功,order-1,merchant-1,,',
    ].join('\n');
    const buffer = iconv.encode(csv, 'gb18030');

    const res = await agent
      .post('/api/import/file')
      .attach('file', buffer, 'alipay.csv')
      .field('source', 'auto');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(1);
  });

  it('multipart 缺少文件返回 400', async () => {
    const agent = await setupAgent();
    const res = await agent.post('/api/import/file').field('source', 'auto');
    expect(res.status).toBe(400);
  });
});
