// 业务日期跟随用户设置的时区，而不是浏览器或 UTC；页面跨过午夜时会自动更新。
import { useEffect, useState } from 'react';
import { getTodayInTimeZone, normalizeTimeZone } from '../utils/format';

export function useZonedToday(timeZone: string): string {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const [today, setToday] = useState(() => getTodayInTimeZone(normalizedTimeZone));

  useEffect(() => {
    const updateToday = () => {
      setToday(getTodayInTimeZone(normalizedTimeZone));
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) updateToday();
    };

    updateToday();
    const timer = window.setInterval(updateToday, 60 * 1000);
    window.addEventListener('focus', updateToday);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', updateToday);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [normalizedTimeZone]);

  return today;
}
