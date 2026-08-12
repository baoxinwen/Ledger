// 主题模式工具测试：校验与默认值（服务端只保存偏好，真正换算在客户端）。
import { isValidThemeMode, getDefaultThemeMode, DEFAULT_THEME_MODE, THEME_MODES } from '../../utils/themeMode';

describe('themeMode', () => {
  it('isValidThemeMode 只接受 system/light/dark', () => {
    expect(isValidThemeMode('system')).toBe(true);
    expect(isValidThemeMode('light')).toBe(true);
    expect(isValidThemeMode('dark')).toBe(true);
    expect(isValidThemeMode('auto')).toBe(false);
    expect(isValidThemeMode('')).toBe(false);
    expect(isValidThemeMode('dark-mode')).toBe(false);
  });

  it('默认值为 system', () => {
    expect(getDefaultThemeMode()).toBe('system');
    expect(DEFAULT_THEME_MODE).toBe('system');
    expect(THEME_MODES).toHaveLength(3);
    expect(THEME_MODES).toEqual(['system', 'light', 'dark']);
  });
});
