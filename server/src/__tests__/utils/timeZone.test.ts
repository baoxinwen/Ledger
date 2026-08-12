// 时区工具测试：默认时区、TZ 环境变量与 IANA 校验。
import { getDefaultAppTimeZone, isValidTimeZone, DEFAULT_APP_TIME_ZONE } from '../../utils/timeZone';

describe('timeZone', () => {
  const originalTz = process.env.TZ;

  afterAll(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('未设置 TZ 时默认 Asia/Shanghai', () => {
    delete process.env.TZ;
    expect(getDefaultAppTimeZone()).toBe(DEFAULT_APP_TIME_ZONE);
  });

  it('TZ 为合法 IANA 时区时生效', () => {
    process.env.TZ = 'Europe/London';
    expect(getDefaultAppTimeZone()).toBe('Europe/London');
  });

  it('TZ 非法时回退默认', () => {
    process.env.TZ = 'UTC+8';
    expect(getDefaultAppTimeZone()).toBe('Asia/Shanghai');
    process.env.TZ = 'not-a-zone';
    expect(getDefaultAppTimeZone()).toBe('Asia/Shanghai');
  });

  it('isValidTimeZone 识别合法与非法时区', () => {
    expect(isValidTimeZone('Asia/Shanghai')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('UTC+8')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('invalid/zone')).toBe(false);
  });
});
