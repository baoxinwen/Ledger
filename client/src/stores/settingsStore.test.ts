// 设置 store 测试：拉取与更新设置。
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  settingsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { useSettingsStore } from './settingsStore';
import { settingsApi } from '../api';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: { time_zone: 'Asia/Shanghai', theme_mode: 'system' },
      loading: false,
    });
    vi.clearAllMocks();
  });

  it('fetchSettings 拉取并归一化设置', async () => {
    (settingsApi.get as any).mockResolvedValue({ data: { time_zone: 'Asia/Tokyo', theme_mode: 'dark' } });
    await useSettingsStore.getState().fetchSettings();
    expect(useSettingsStore.getState().settings.theme_mode).toBe('dark');
    expect(useSettingsStore.getState().settings.time_zone).toBe('Asia/Tokyo');
  });

  it('updateSettings 乐观更新并回写服务端值', async () => {
    (settingsApi.update as any).mockResolvedValue({ data: { time_zone: 'Asia/Shanghai', theme_mode: 'dark' } });
    const result = await useSettingsStore.getState().updateSettings({ theme_mode: 'dark' });
    expect(result.theme_mode).toBe('dark');
    expect(useSettingsStore.getState().settings.theme_mode).toBe('dark');
  });

  it('updateSettings 非法时区值被归一化到默认', async () => {
    (settingsApi.update as any).mockResolvedValue({ data: { time_zone: 'Asia/Shanghai', theme_mode: 'system' } });
    await useSettingsStore.getState().updateSettings({ time_zone: 'UTC+8' });
    expect(useSettingsStore.getState().settings.time_zone).toBe('Asia/Shanghai');
  });
});
