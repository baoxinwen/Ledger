// 设置服务测试保护时区默认值、容器 TZ 种子值和非法输入校验。
jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import { settingsService } from '../../services/settings.service';

describe('SettingsService', () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    db.exec('DELETE FROM app_settings');
    delete process.env.TZ;
  });

  afterAll(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('creates Asia/Shanghai and system as default settings', () => {
    expect(settingsService.getSettings()).toEqual({ time_zone: 'Asia/Shanghai', theme_mode: 'system' });
  });

  it('uses TZ only when the setting does not exist yet', () => {
    process.env.TZ = 'Europe/London';
    expect(settingsService.getSettings().time_zone).toBe('Europe/London');

    process.env.TZ = 'America/New_York';
    expect(settingsService.getSettings().time_zone).toBe('Europe/London');
  });

  it('falls back to Asia/Shanghai when TZ is not a valid IANA time zone', () => {
    process.env.TZ = 'UTC+8';
    expect(settingsService.getSettings().time_zone).toBe('Asia/Shanghai');
  });

  it('rejects invalid time zones', () => {
    expect(() => settingsService.updateSettings({ time_zone: 'UTC+8' })).toThrow('无效的时区');
  });

  it('stores and returns a valid time zone', () => {
    const settings = settingsService.updateSettings({ time_zone: 'Asia/Tokyo' });
    expect(settings.time_zone).toBe('Asia/Tokyo');
    expect(settingsService.getSettings().time_zone).toBe('Asia/Tokyo');
  });

  it('rejects invalid theme modes', () => {
    expect(() => settingsService.updateSettings({ theme_mode: 'auto' as never })).toThrow('无效的主题模式');
  });

  it('updates theme mode without changing time zone', () => {
    settingsService.updateSettings({ time_zone: 'Europe/London' });
    const settings = settingsService.updateSettings({ theme_mode: 'dark' });

    expect(settings).toEqual({ time_zone: 'Europe/London', theme_mode: 'dark' });
  });
});
