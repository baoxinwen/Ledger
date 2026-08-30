// 鉴权路由：创建账户、登录、登出、查询当前登录状态。
// 这些接口对外公开；真正的数据接口由 requireAuth 中间件保护。
import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { getSessionToken, SESSION_COOKIE_NAME } from '../middleware/auth';
import { getClientIp, checkLoginAttempt, recordLoginFailure, clearLoginFailures } from '../utils/rateLimit';
import { HttpError } from '../utils/errors';

const router = Router();

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 与会话有效期一致
// 默认兼容 HTTP 部署；HTTPS 反向代理场景通过 COOKIE_SECURE=true 开启 Secure 属性。
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
  });
}

// 查询当前鉴权状态：前端据此区分“需要初始化 / 未登录 / 已登录”，始终返回 200。
router.get('/me', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  res.json(authService.getAuthStatus(token));
});

// 首次运行：用日志中的初始化 Token 创建唯一账户，成功后自动登录。
// 与登录接口同样做失败限流（独立 setup: 前缀键）：初始化 Token 虽为 192 位随机值无法在线穷举，
// 但限流可以抑制滥用尝试，并在日志泄漏场景下收窄抢注窗口。
router.post('/setup', (req: Request, res: Response) => {
  const clientKey = `setup:${getClientIp(req)}`;
  checkLoginAttempt(clientKey);
  try {
    const { token, username, password } = req.body;
    const result = authService.setup(token, username, password);
    clearLoginFailures(clientKey);
    setSessionCookie(res, result.sessionToken);
    res.status(201).json({ user: result.user });
  } catch (error) {
    recordLoginFailure(clientKey);
    // 统一交给全局错误中间件：HttpError 保留状态码与业务文案，
    // 未知错误按 500 处理且不泄露内部信息（此前会把 TypeError 原文透传给客户端）。
    throw error;
  }
});

router.post('/login', (req: Request, res: Response) => {
  const clientKey = getClientIp(req);
  // 冷却期内抛 HttpError(429)，由全局错误中间件响应。
  checkLoginAttempt(clientKey);
  try {
    const { username, password } = req.body;
    const result = authService.login(username, password);
    clearLoginFailures(clientKey);
    setSessionCookie(res, result.sessionToken);
    res.json({ user: result.user });
  } catch (error) {
    recordLoginFailure(clientKey);
    // 限流的 HttpError(429) 也走全局中间件，不再被这里的 catch 降级成 401。
    throw error;
  }
});

router.post('/logout', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) {
    authService.logout(token);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
