// 鉴权服务：单一账户，首次启动通过日志中的一次性初始化 Token 创建账户，之后用户名+密码登录。
// 会话令牌只把哈希写入 sessions 表，原始令牌保存在浏览器 httpOnly Cookie 中。
import crypto from 'crypto';
import db from '../database';
import { hashPassword, verifyPassword, sha256, timingSafeEqualHex } from '../utils/password';
import { logSetupToken } from '../utils/logger';

const SETUP_TOKEN_KEY = 'setup_token_hash';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthStatus {
  authenticated: boolean;
  needsSetup: boolean;
  user: AuthUser | null;
}

export class AuthService {
  hasUser(): boolean {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return row.count > 0;
  }

  // 首次启动且尚未创建账户时，生成初始化 Token 并写入日志；每次启动重新生成，直到账户存在。
  ensureSetupToken(): void {
    if (this.hasUser()) return;
    this.purgeExpiredSessions();
    const token = this.generateSetupToken();
    setSetting(SETUP_TOKEN_KEY, sha256(token));
    logSetupToken(token);
  }

  getAuthStatus(sessionToken?: string | null): AuthStatus {
    const user = sessionToken ? this.validateSession(sessionToken) : null;
    return {
      authenticated: user !== null,
      needsSetup: !this.hasUser(),
      user,
    };
  }

  setup(token: string, username: string, password: string): { user: AuthUser; sessionToken: string } {
    if (this.hasUser()) {
      throw new Error('应用已初始化，不能重复创建账户');
    }
    if (typeof token !== 'string' || !token) {
      throw new Error('初始化 Token 无效或已过期');
    }
    const storedHash = getSetting(SETUP_TOKEN_KEY);
    if (!storedHash || !timingSafeEqualHex(storedHash, sha256(token))) {
      throw new Error('初始化 Token 无效或已过期');
    }

    const normalizedUsername = validateUsername(username);
    validatePassword(password);

    const passwordHash = hashPassword(password);
    const info = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(normalizedUsername, passwordHash);
    const user: AuthUser = { id: Number(info.lastInsertRowid), username: normalizedUsername };

    // 创建账户后立即作废初始化 Token，防止它再次被使用。
    deleteSetting(SETUP_TOKEN_KEY);

    return { user, sessionToken: this.createSession(user.id) };
  }

  login(username: string, password: string): { user: AuthUser; sessionToken: string } {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('用户名或密码错误');
    }
    this.purgeExpiredSessions();
    const row = db
      .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .get(username) as { id: number; username: string; password_hash: string } | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      // 统一报错文案，不向调用方泄露是用户名不存在还是密码错误。
      throw new Error('用户名或密码错误');
    }

    return { user: { id: row.id, username: row.username }, sessionToken: this.createSession(row.id) };
  }

  logout(sessionToken: string): void {
    if (!sessionToken) return;
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(sessionToken));
  }

  // 校验会话令牌是否有效且未过期，返回对应用户；无效返回 null。
  validateSession(sessionToken: string): AuthUser | null {
    if (!sessionToken) return null;
    const row = db
      .prepare(`
        SELECT u.id, u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?
      `)
      .get(sha256(sessionToken), new Date().toISOString()) as AuthUser | undefined;
    return row ?? null;
  }

  private generateSetupToken(): string {
    // 非生产环境允许通过 SETUP_TOKEN 覆盖，便于自动化测试预知 token。
    const override = process.env.SETUP_TOKEN;
    if (override && process.env.NODE_ENV !== 'production') {
      return override;
    }
    return crypto.randomBytes(24).toString('base64url');
  }

  private createSession(userId: number): string {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
      userId,
      sha256(token),
      expiresAt
    );
    return token;
  }

  private purgeExpiredSessions(): void {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  }
}

function validateUsername(username: unknown): string {
  if (typeof username !== 'string') {
    throw new Error('用户名无效');
  }
  const normalized = username.trim();
  if (normalized.length < 1 || normalized.length > 32) {
    throw new Error('用户名长度需要在 1 到 32 个字符之间');
  }
  return normalized;
}

function validatePassword(password: unknown): void {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new Error('密码长度需要在 8 到 128 个字符之间');
  }
}

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

function setSetting(key: string, value: string): void {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

function deleteSetting(key: string): void {
  db.prepare('DELETE FROM app_settings WHERE key = ?').run(key);
}

export const authService = new AuthService();
