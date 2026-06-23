// 应用内部统一使用 IANA 时区名，避免用 UTC 偏移量表达会受夏令时影响的地区。
export const DEFAULT_APP_TIME_ZONE = 'Asia/Shanghai';

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getDefaultAppTimeZone(): string {
  const configuredTimeZone = process.env.TZ;
  return configuredTimeZone && isValidTimeZone(configuredTimeZone)
    ? configuredTimeZone
    : DEFAULT_APP_TIME_ZONE;
}
