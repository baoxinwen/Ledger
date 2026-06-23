// 主题模式只保存用户偏好；真正是否深色由前端结合系统设置计算。
export const DEFAULT_THEME_MODE = 'system';
export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export function isValidThemeMode(themeMode: string): themeMode is ThemeMode {
  return THEME_MODES.includes(themeMode as ThemeMode);
}

export function getDefaultThemeMode(): ThemeMode {
  return DEFAULT_THEME_MODE;
}
