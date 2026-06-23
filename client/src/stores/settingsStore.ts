// 全局设置 store：业务时区来自后端数据库，页面统一从这里读取当前时区。
import { create } from 'zustand';
import { settingsApi } from '../api';
import type { AppSettings } from '../types';
import { DEFAULT_TIME_ZONE, normalizeTimeZone } from '../utils/format';
import { DEFAULT_THEME_MODE, normalizeThemeMode } from '../utils/themeMode';

const SETTINGS_FALLBACK_KEY = 'ledger-settings-fallback';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}

const defaultSettings: AppSettings = {
  time_zone: DEFAULT_TIME_ZONE,
  theme_mode: DEFAULT_THEME_MODE,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: readFallbackSettings(),
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const response = await settingsApi.get();
      const nextSettings = normalizeSettings(response.data);
      writeFallbackSettings(nextSettings);
      set({ settings: nextSettings });
    } catch (error) {
      // 开发时后端进程如果还没重启，/api/settings 可能暂时是 404；此时用本地兜底避免主题切换失效。
      console.warn('设置接口暂时不可用，使用本地偏好兜底:', getErrorMessage(error));
      set({ settings: readFallbackSettings() });
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (settings: Partial<AppSettings>) => {
    const payload: Partial<AppSettings> = {};
    if (settings.time_zone !== undefined) {
      payload.time_zone = normalizeTimeZone(settings.time_zone);
    }
    if (settings.theme_mode !== undefined) {
      payload.theme_mode = normalizeThemeMode(settings.theme_mode);
    }

    const optimisticSettings = normalizeSettings({ ...get().settings, ...payload });
    writeFallbackSettings(optimisticSettings);
    set({ settings: optimisticSettings });

    try {
      const response = await settingsApi.update(payload);
      const nextSettings = normalizeSettings(response.data);
      writeFallbackSettings(nextSettings);
      set({ settings: nextSettings });
      return nextSettings;
    } catch (error) {
      console.warn('设置接口暂时不可用，偏好已保存到本地兜底:', getErrorMessage(error));
      return optimisticSettings;
    }
  },
}));

function normalizeSettings(settings: Partial<AppSettings>): AppSettings {
  return {
    time_zone: normalizeTimeZone(settings.time_zone),
    theme_mode: normalizeThemeMode(settings.theme_mode),
  };
}

function readFallbackSettings(): AppSettings {
  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_FALLBACK_KEY);
    return rawSettings ? normalizeSettings(JSON.parse(rawSettings) as Partial<AppSettings>) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function writeFallbackSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_FALLBACK_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 可能被隐私模式禁用；失败时仅失去离线兜底，不影响后端设置。
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
