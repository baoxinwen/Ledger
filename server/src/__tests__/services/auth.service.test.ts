// 鉴权服务测试：覆盖初始化 Token、创建账户、登录登出、会话有效期。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { authService } from '../../services/auth.service';
import { sha256 } from '../../utils/password';

describe('AuthService', () => {
  const originalSetupToken = process.env.SETUP_TOKEN;

  beforeEach(() => {
    // 用固定 token 便于测试读取；NODE_ENV 在 Jest 下非 production，SETUP_TOKEN 覆盖生效。
    process.env.SETUP_TOKEN = 'test-setup-token';
    db.exec(`
      DELETE FROM sessions;
      DELETE FROM users;
      DELETE FROM app_settings WHERE key = 'setup_token_hash';
    `);
  });

  afterEach(() => {
    if (originalSetupToken === undefined) {
      delete process.env.SETUP_TOKEN;
    } else {
      process.env.SETUP_TOKEN = originalSetupToken;
    }
  });

  it('ensureSetupToken 写入初始化 token 哈希，未创建账户时 needsSetup 为 true', () => {
    authService.ensureSetupToken();
    expect(authService.hasUser()).toBe(false);
    expect(authService.getAuthStatus(null).needsSetup).toBe(true);

    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('setup_token_hash') as
      { value: string } | undefined;
    expect(row?.value).toBe(sha256('test-setup-token'));
  });

  it('setup 用有效 token 创建账户并返回可用会话，创建后 token 立即失效', () => {
    authService.ensureSetupToken();
    const result = authService.setup('test-setup-token', 'admin', 'password123');

    expect(result.user.username).toBe('admin');
    expect(authService.hasUser()).toBe(true);
    // 创建账户后初始化 token 被清除
    expect(db.prepare('SELECT value FROM app_settings WHERE key = ?').get('setup_token_hash')).toBeUndefined();
    // 会话可直接校验
    expect(authService.validateSession(result.sessionToken)?.username).toBe('admin');
    expect(authService.getAuthStatus(result.sessionToken).authenticated).toBe(true);
    expect(authService.getAuthStatus(result.sessionToken).needsSetup).toBe(false);
  });

  it('setup 拒绝无效或过期的 token', () => {
    authService.ensureSetupToken();
    expect(() => authService.setup('wrong-token', 'admin', 'password123')).toThrow('初始化 Token 无效');
    expect(() => authService.setup('', 'admin', 'password123')).toThrow('初始化 Token 无效');
  });

  it('setup 拒绝重复初始化', () => {
    authService.ensureSetupToken();
    authService.setup('test-setup-token', 'admin', 'password123');
    expect(() => authService.setup('test-setup-token', 'other', 'password456')).toThrow('已初始化');
  });

  it('setup 拒绝弱密码与非法用户名', () => {
    authService.ensureSetupToken();
    expect(() => authService.setup('test-setup-token', 'admin', 'short')).toThrow('密码长度');
    expect(() => authService.setup('test-setup-token', '   ', 'password123')).toThrow('用户名');
    expect(() => authService.setup('test-setup-token', 'x'.repeat(33), 'password123')).toThrow('用户名');
  });

  it('setup 会去除用户名首尾空白', () => {
    authService.ensureSetupToken();
    const { user } = authService.setup('test-setup-token', '  admin  ', 'password123');
    expect(user.username).toBe('admin');
  });

  it('login 正确密码返回会话，错误密码不泄露是用户名还是密码问题', () => {
    authService.ensureSetupToken();
    authService.setup('test-setup-token', 'admin', 'password123');

    const result = authService.login('admin', 'password123');
    expect(result.user.username).toBe('admin');
    expect(result.sessionToken).toBeTruthy();

    expect(() => authService.login('admin', 'wrong-password')).toThrow('用户名或密码错误');
    expect(() => authService.login('nobody', 'password123')).toThrow('用户名或密码错误');
  });

  it('logout 后会话立即失效', () => {
    authService.ensureSetupToken();
    const { sessionToken } = authService.setup('test-setup-token', 'admin', 'password123');

    authService.logout(sessionToken);
    expect(authService.validateSession(sessionToken)).toBeNull();
    expect(authService.getAuthStatus(sessionToken).authenticated).toBe(false);
  });

  it('validateSession 忽略已过期会话', () => {
    authService.ensureSetupToken();
    const { sessionToken } = authService.setup('test-setup-token', 'admin', 'password123');

    db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(
      new Date(Date.now() - 1000).toISOString(),
      sha256(sessionToken)
    );
    expect(authService.validateSession(sessionToken)).toBeNull();
  });

  it('已有账户时 ensureSetupToken 不再生成新 token', () => {
    authService.ensureSetupToken();
    authService.setup('test-setup-token', 'admin', 'password123');

    authService.ensureSetupToken();
    expect(db.prepare('SELECT value FROM app_settings WHERE key = ?').get('setup_token_hash')).toBeUndefined();
    expect(authService.hasUser()).toBe(true);
  });

  it('连续/并发 setup 只允许创建一个账户（hasUser 检查在同步事务内不可交错）', async () => {
    authService.ensureSetupToken();
    const results = await Promise.allSettled([
      Promise.resolve().then(() => authService.setup('test-setup-token', 'admin', 'password123')),
      Promise.resolve().then(() => authService.setup('test-setup-token', 'admin2', 'password456')),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    expect(count.count).toBe(1);
    expect(fulfilled).toHaveLength(1);
  });
});
