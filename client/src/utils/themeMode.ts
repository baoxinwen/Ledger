// 主题偏好只记录用户选择；system 会在 App 中结合系统媒体查询换算成实际浅色/深色。
import type { ThemeMode } from '../types';

export const DEFAULT_THEME_MODE: ThemeMode = 'system';
export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

export function isValidThemeMode(themeMode: unknown): themeMode is ThemeMode {
  return typeof themeMode === 'string' && THEME_MODES.includes(themeMode as ThemeMode);
}

export function normalizeThemeMode(themeMode: unknown): ThemeMode {
  return isValidThemeMode(themeMode) ? themeMode : DEFAULT_THEME_MODE;
}
