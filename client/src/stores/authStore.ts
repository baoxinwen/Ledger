// 登录状态 store：启动时通过 /api/auth/me 判断是“需要初始化 / 未登录 / 已登录”，并负责创建账户、登录、退出。
import { create } from 'zustand';
import { authApi, http } from '../api';
import type { AuthStatus, AuthUser } from '../types';

export type AuthStatusKind = 'checking' | 'setup' | 'login' | 'authed';

interface AuthState {
  status: AuthStatusKind;
  user: AuthUser | null;
  checkAuth: () => Promise<void>;
  setup: (token: string, username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  user: null,

  checkAuth: async () => {
    try {
      const response = await authApi.me();
      applyAuthStatus(response.data, set);
    } catch (error) {
      // 后端不可达或接口异常时按未登录处理，让页面自然展示登录/初始化入口。
      console.error('获取登录状态失败:', error);
      set({ status: 'login', user: null });
    }
  },

  setup: async (token, username, password) => {
    const response = await authApi.setup({ token, username, password });
    set({ status: 'authed', user: response.data.user });
  },

  login: async (username, password) => {
    const response = await authApi.login({ username, password });
    set({ status: 'authed', user: response.data.user });
  },

  logout: async () => {
    // 仅当登出请求成功才清除本地登录态；失败时保留，避免“以为已登出但服务端会话仍有效”。
    await authApi.logout();
    set({ status: 'login', user: null });
  },
}));

function applyAuthStatus(
  status: AuthStatus,
  set: (partial: Partial<AuthState>) => void
): void {
  if (status.needsSetup) {
    set({ status: 'setup', user: null });
  } else if (status.authenticated && status.user) {
    set({ status: 'authed', user: status.user });
  } else {
    set({ status: 'login', user: null });
  }
}

// 受保护接口返回 401（会话过期）时，把状态切回未登录，由路由门控回到登录页。
// 关键守卫：仅当「当前已登录（authed）」时才触发——否则首屏未登录时 fetchSettings 的 401
// 会把「创建账户」状态错误地覆盖成「登录」状态（详见首屏注册界面被误显示为登录的问题）。
// 登录接口自身的 401 同样不触发（避免在登录页反复横跳）。
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string | undefined = error.config?.url;
    const status: number | undefined = error.response?.status;
    if (
      status === 401 &&
      url &&
      !url.startsWith('/auth/') &&
      useAuthStore.getState().status === 'authed'
    ) {
      useAuthStore.setState({ status: 'login', user: null });
    }
    return Promise.reject(error);
  }
);
