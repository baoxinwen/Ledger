// 展示层格式化工具测试：金额、日期范围、时区、百分比。
import { describe, it, expect } from 'vitest';
import {
  formatAmount,
  getTodayInTimeZone,
  getMonthRangeForMonth,
  getQuarterRangeForDate,
  getYearRangeForDate,
  formatYearMonth,
  normalizeTimeZone,
  isValidTimeZone,
  calculatePercentage,
} from './format';

describe('format utils', () => {
  it('formatAmount 输出人民币并保留两位小数', () => {
    expect(formatAmount(12.5)).toContain('12.50');
    expect(formatAmount(0)).toContain('0.00');
    expect(formatAmount(1234.56)).toContain('1,234.56');
  });

  it('getTodayInTimeZone 按业务时区计算日期', () => {
    // UTC 2026-08-11 16:00 在 Asia/Shanghai 已是 08-12
    expect(getTodayInTimeZone('Asia/Shanghai', new Date('2026-08-11T16:00:00Z'))).toBe('2026-08-12');
    // UTC 08-12 00:00 在 Asia/Shanghai 仍是 08-12
    expect(getTodayInTimeZone('Asia/Shanghai', new Date('2026-08-12T00:00:00Z'))).toBe('2026-08-12');
  });

  it('getMonthRangeForMonth 返回当月起止（含闰年）', () => {
    expect(getMonthRangeForMonth('2026-02')).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
    expect(getMonthRangeForMonth('2028-02')).toEqual({ startDate: '2028-02-01', endDate: '2028-02-29' });
    expect(getMonthRangeForMonth('2026-12')).toEqual({ startDate: '2026-12-01', endDate: '2026-12-31' });
  });

  it('getQuarterRangeForDate 返回季度起止', () => {
    expect(getQuarterRangeForDate('2026-05-15')).toEqual({ startDate: '2026-04-01', endDate: '2026-06-30' });
    expect(getQuarterRangeForDate('2026-11-15')).toEqual({ startDate: '2026-10-01', endDate: '2026-12-31' });
  });

  it('getYearRangeForDate 返回年度起止', () => {
    expect(getYearRangeForDate('2026-03-01')).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' });
  });

  it('formatYearMonth 输出中文年月', () => {
    expect(formatYearMonth('2026-08')).toBe('2026年8月');
  });

  it('normalizeTimeZone 非法时区回退默认', () => {
    expect(normalizeTimeZone('UTC+8')).toBe('Asia/Shanghai');
    expect(normalizeTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
    expect(normalizeTimeZone(undefined)).toBe('Asia/Shanghai');
    expect(isValidTimeZone('Asia/Shanghai')).toBe(true);
    expect(isValidTimeZone('bad')).toBe(false);
  });

  it('calculatePercentage 有界且除零安全', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(200, 100)).toBe(100);
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});
