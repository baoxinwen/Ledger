// 全局设置服务：当前项目是单账本应用，因此设置保存在数据库中并对所有页面生效。
import db from '../database';
import { AppSettings } from '../types';
import { getDefaultAppTimeZone, isValidTimeZone } from '../utils/timeZone';
import { getDefaultThemeMode, isValidThemeMode } from '../utils/themeMode';

const TIME_ZONE_KEY = 'time_zone';
const THEME_MODE_KEY = 'theme_mode';

export class SettingsService {
  ensureDefaults(): void {
    this.insertDefaultIfMissing(TIME_ZONE_KEY, getDefaultAppTimeZone());
    this.insertDefaultIfMissing(THEME_MODE_KEY, getDefaultThemeMode());
  }

  getSettings(): AppSettings {
    this.ensureDefaults();
    const settings = db.prepare('SELECT key, value FROM app_settings WHERE key IN (?, ?)').all(
      TIME_ZONE_KEY,
      THEME_MODE_KEY
    ) as { key: string; value: string }[];
    const values = new Map(settings.map((item) => [item.key, item.value]));
    const timeZone = values.get(TIME_ZONE_KEY) || getDefaultAppTimeZone();
    const themeMode = values.get(THEME_MODE_KEY) || getDefaultThemeMode();

    return {
      time_zone: isValidTimeZone(timeZone) ? timeZone : getDefaultAppTimeZone(),
      theme_mode: isValidThemeMode(themeMode) ? themeMode : getDefaultThemeMode(),
    };
  }

  updateSettings(data: Partial<AppSettings>): AppSettings {
    if (data.time_zone !== undefined) {
      if (!isValidTimeZone(data.time_zone)) {
        throw new Error('无效的时区，请使用 IANA 时区名，例如 Asia/Shanghai');
      }

      this.upsertSetting(TIME_ZONE_KEY, data.time_zone);
    }

    if (data.theme_mode !== undefined) {
      if (!isValidThemeMode(data.theme_mode)) {
        throw new Error('无效的主题模式，请使用 system、light 或 dark');
      }

      this.upsertSetting(THEME_MODE_KEY, data.theme_mode);
    }

    return this.getSettings();
  }

  private insertDefaultIfMissing(key: string, value: string): void {
    db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  }

  private upsertSetting(key: string, value: string): void {
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, value);
  }
}

export const settingsService = new SettingsService();
