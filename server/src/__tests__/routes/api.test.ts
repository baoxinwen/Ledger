// API 路由集成测试：覆盖鉴权中间件、auth 路由的 Cookie 行为、输入校验与全局错误处理。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import request from 'supertest';
import db from '../setup';
import app from '../../app';
import { authService } from '../../services/auth.service';

describe('API routes', () => {
  beforeEach(() => {
    process.env.SETUP_TOKEN = 'route-test-token';
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM categories');
    db.exec("DELETE FROM app_settings WHERE key = 'setup_token_hash'");
  });

  afterEach(() => {
    delete process.env.SETUP_TOKEN;
  });

  it('GET /api/health 返回 ok 且带安全响应头', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('未登录访问数据接口返回 401', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('首次访问 /api/auth/me 提示需要初始化', async () => {
    authService.ensureSetupToken();
    const res = await request(app).get('/api/auth/me');
    expect(res.body).toMatchObject({ authenticated: false, needsSetup: true });
  });

  it('setup 错误 token 返回 400；正确 token 创建账户并设置 HttpOnly 会话 Cookie', async () => {
    authService.ensureSetupToken();
    const bad = await request(app)
      .post('/api/auth/setup')
      .send({ token: 'wrong', username: 'admin', password: 'password123' });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post('/api/auth/setup')
      .send({ token: 'route-test-token', username: 'admin', password: 'password123' });
    expect(ok.status).toBe(201);
    const setCookieValue = ok.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieValue) ? setCookieValue.join(';') : (setCookieValue ?? '');
    expect(setCookie).toContain('ledger_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
  });

  it('登录后受保护接口可访问，登出后失效', async () => {
    authService.ensureSetupToken();
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({ token: 'route-test-token', username: 'admin', password: 'password123' });

    const authed = await agent.get('/api/transactions');
    expect(authed.status).toBe(200);

    await agent.post('/api/auth/logout');
    const afterLogout = await agent.get('/api/transactions');
    expect(afterLogout.status).toBe(401);
  });

  it('登录错误密码返回 401 且不泄露原因，正确密码返回 200', async () => {
    authService.ensureSetupToken();
    await request(app).post('/api/auth/setup').send({ token: 'route-test-token', username: 'admin', password: 'password123' });

    const wrong = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toBe('用户名或密码错误');

    const right = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'password123' });
    expect(right.status).toBe(200);
  });

  it('非法输入与非法路径参数返回 400 JSON（而非 HTML 500）', async () => {
    authService.ensureSetupToken();
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({ token: 'route-test-token', username: 'admin', password: 'password123' });

    const invalid = await agent.post('/api/transactions').send({ type: 'foo', amount: 100, category_id: 1, date: '2026-01-01' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toContain('类型');

    const badId = await agent.get('/api/transactions/abc');
    expect(badId.status).toBe(400);
    expect(badId.headers['content-type']).toContain('application/json');
  });

  it('引用不存在的分类触发外键错误时返回 400（而非 500）', async () => {
    authService.ensureSetupToken();
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({ token: 'route-test-token', username: 'admin', password: 'password123' });

    const res = await agent.post('/api/transactions').send({
      type: 'expense', amount: 100, category_id: 99999, date: '2026-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('引用的分类或标签不存在');
  });
});
