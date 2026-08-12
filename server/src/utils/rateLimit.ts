// 简单的内存登录限流：连续失败 N 次后进入冷却，防止在线暴力破解密码。
// 单进程内存存储，服务重启后计数清零，对个人自部署足够。
import { Request } from 'express';
import { HttpError } from './errors';

const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000; // 失败计数窗口 10 分钟
const BLOCK_MS = 15 * 60 * 1000;  // 达到上限后冷却 15 分钟
const MAX_TRACKED_KEYS = 10000;   // 防止伪造海量来源 IP 让 Map 无界增长

interface FailureRecord {
  count: number;
  blockedUntil: number;
  firstFailureAt: number;
}

const failures = new Map<string, FailureRecord>();

// 限流键基于请求来源 IP：直接使用 Express 的 req.ip。
// req.ip 在未配置 trust proxy 时就是直连对端地址（客户端无法伪造）；仅在显式配置了可信代理（TRUST_PROXY=true）时才解析 X-Forwarded-For。
export function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// 检查是否处于冷却期，若是则抛 HttpError(429)，由全局错误中间件响应。
export function checkLoginAttempt(key: string): void {
  const record = failures.get(key);
  if (!record) return;
  const now = Date.now();
  if (now < record.blockedUntil) {
    const remainingMinutes = Math.max(1, Math.ceil((record.blockedUntil - now) / 60000));
    throw new HttpError(429, `尝试次数过多，请 ${remainingMinutes} 分钟后重试`);
  }
  if (record.blockedUntil > 0) {
    failures.delete(key); // 冷却结束，清除记录
  }
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  // 容量满且是全新 key：先清理已过期的记录；仍满则忽略新 key，避免 Map 无界增长。
  if (failures.size >= MAX_TRACKED_KEYS && !failures.has(key)) {
    for (const [trackedKey, record] of failures) {
      if (now - record.firstFailureAt > WINDOW_MS) {
        failures.delete(trackedKey);
      }
    }
    if (failures.size >= MAX_TRACKED_KEYS) return;
  }

  const record = failures.get(key);
  if (!record || now - record.firstFailureAt > WINDOW_MS) {
    failures.set(key, { count: 1, blockedUntil: 0, firstFailureAt: now });
    return;
  }
  record.count += 1;
  if (record.count >= MAX_FAILURES) {
    record.blockedUntil = now + BLOCK_MS;
  }
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
