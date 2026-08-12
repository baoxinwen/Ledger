// 登录状态 store 测试：checkAuth 三态、登录成功、登出。
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  authApi: {
    me: vi.fn(),
    setup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
  http: {
    interceptors: { response: { use: vi.fn() } },
  },
}));

import { useAuthStore } from './authStore';
import { authApi } from '../api';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'checking', user: null });
    vi.clearAllMocks();
  });

  it('checkAuth 已登录时进入 authed', async () => {
    (authApi.me as any).mockResolvedValue({
      data: { authenticated: true, needsSetup: false, user: { username: 'admin' } },
    });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().status).toBe('authed');
    expect(useAuthStore.getState().user?.username).toBe('admin');
  });

  it('checkAuth 需要初始化时进入 setup', async () => {
    (authApi.me as any).mockResolvedValue({
      data: { authenticated: false, needsSetup: true, user: null },
    });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().status).toBe('setup');
  });

  it('checkAuth 未登录且无账户时进入 login', async () => {
    (authApi.me as any).mockResolvedValue({
      data: { authenticated: false, needsSetup: false, user: null },
    });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().status).toBe('login');
  });

  it('login 成功进入 authed 并记录用户', async () => {
    (authApi.login as any).mockResolvedValue({ data: { user: { username: 'admin' } } });
    await useAuthStore.getState().login('admin', 'password');
    expect(useAuthStore.getState().status).toBe('authed');
    expect(useAuthStore.getState().user?.username).toBe('admin');
  });

  it('logout 调用接口并回到 login 态', async () => {
    (authApi.logout as any).mockResolvedValue({ data: { ok: true } });
    await useAuthStore.getState().logout();
    expect(authApi.logout).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('login');
    expect(useAuthStore.getState().user).toBeNull();
  });
});
