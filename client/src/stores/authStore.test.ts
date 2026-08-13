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
import { authApi, http } from '../api';

// 捕获 401 拦截器的错误处理器（模块加载时已注册；beforeEach 的 clearAllMocks 会清空调用记录，需提前保存函数引用）。
const responseUseMock = http.interceptors.response.use as unknown as ReturnType<typeof vi.fn>;
const onRejected = responseUseMock.mock.calls[0]?.[1] as ((error: unknown) => Promise<never>) | undefined;

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

describe('401 响应拦截器', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'checking', user: null });
  });

  it('未初始化（setup）状态下，受保护接口 401 不改变状态', async () => {
    useAuthStore.setState({ status: 'setup', user: null });
    const err = { config: { url: '/settings' }, response: { status: 401 } };
    await expect(onRejected!(err)).rejects.toBe(err);
    expect(useAuthStore.getState().status).toBe('setup');
  });

  it('未登录（login）状态下，受保护接口 401 不改变状态', async () => {
    useAuthStore.setState({ status: 'login', user: null });
    const err = { config: { url: '/settings' }, response: { status: 401 } };
    await expect(onRejected!(err)).rejects.toBe(err);
    expect(useAuthStore.getState().status).toBe('login');
  });

  it('已登录（authed）状态下，受保护接口 401 切回 login', async () => {
    useAuthStore.setState({ status: 'authed', user: { username: 'admin' } });
    const err = { config: { url: '/settings' }, response: { status: 401 } };
    await expect(onRejected!(err)).rejects.toBe(err);
    expect(useAuthStore.getState().status).toBe('login');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('auth 接口的 401 不触发（即使已登录）', async () => {
    useAuthStore.setState({ status: 'authed', user: { username: 'admin' } });
    const err = { config: { url: '/auth/login' }, response: { status: 401 } };
    await expect(onRejected!(err)).rejects.toBe(err);
    expect(useAuthStore.getState().status).toBe('authed');
  });
});
