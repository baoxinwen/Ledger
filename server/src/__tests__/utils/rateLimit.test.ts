// 登录限流测试：达到失败上限后进入冷却并抛 429，成功登录清除计数，不同来源互不影响。
import { checkLoginAttempt, recordLoginFailure, clearLoginFailures, getClientIp } from '../../utils/rateLimit';
import { HttpError } from '../../utils/errors';

describe('rateLimit', () => {
  afterEach(() => {
    clearLoginFailures('test-ip');
    clearLoginFailures('ip-a');
    clearLoginFailures('ip-b');
  });

  it('达到失败上限后进入冷却并抛 429', () => {
    for (let index = 0; index < 5; index++) {
      recordLoginFailure('test-ip');
    }
    expect(() => checkLoginAttempt('test-ip')).toThrow(HttpError);
    try {
      checkLoginAttempt('test-ip');
    } catch (error) {
      expect((error as HttpError).status).toBe(429);
    }
  });

  it('成功登录清除失败计数，不再阻断', () => {
    for (let index = 0; index < 4; index++) {
      recordLoginFailure('test-ip');
    }
    clearLoginFailures('test-ip');
    expect(() => checkLoginAttempt('test-ip')).not.toThrow();
  });

  it('不同来源互不影响', () => {
    for (let index = 0; index < 10; index++) {
      recordLoginFailure('ip-a');
    }
    expect(() => checkLoginAttempt('ip-b')).not.toThrow();
  });

  it('getClientIp 不直接信任客户端可控的 X-Forwarded-For 头', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4' },
      socket: { remoteAddress: '5.6.7.8' },
    } as unknown as import('express').Request;
    // 未配置 trust proxy 时（req.ip 即直连对端），应返回直连地址，忽略伪造的 XFF。
    expect(getClientIp(req)).toBe('5.6.7.8');
  });

  it('getClientIp 在已配置 trust proxy（有 req.ip）时优先使用 req.ip', () => {
    const req = {
      ip: '1.2.3.4',
      socket: { remoteAddress: '5.6.7.8' },
    } as unknown as import('express').Request;
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
});
