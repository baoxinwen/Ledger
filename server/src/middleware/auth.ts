// 鉴权中间件：从 Cookie 中解析会话令牌，校验通过后放行，否则返回 401。
// 只解析项目自己的一个会话 Cookie，不引入 cookie-parser 依赖。
import { Request, Response, NextFunction } from 'express';
import { authService, AuthUser } from '../services/auth.service';

export const SESSION_COOKIE_NAME = 'ledger_session';

// 带登录用户信息的请求类型；requireAuth 放行后才可安全读取 req.auth。
export interface AuthenticatedRequest extends Request {
  auth: AuthUser;
}

// 从原始 Cookie 头解析指定名称的值（URL 编码交给浏览器/Express，这里保持原样）。
export function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');
    if (separator > 0 && trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }
  return null;
}

export function getSessionToken(req: Request): string | null {
  return parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getSessionToken(req);
  const user = token ? authService.validateSession(token) : null;
  if (!user) {
    res.status(401).json({ error: '未登录或会话已过期' });
    return;
  }
  (req as AuthenticatedRequest).auth = user;
  next();
}

