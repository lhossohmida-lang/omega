// نظام ساعات العمل — المطعم يعمل من 11:00 صباحاً حتى 22:00 (10 مساءً)
export const OPEN_HOUR = 11;
export const CLOSE_HOUR = 22;

export function isOpen(date = new Date()) {
  const hour = date.getHours();
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR;
}

export function formatHour(hour) {
  const h12 = ((hour + 11) % 12) + 1;
  const suffix = hour >= 12 ? 'م' : 'ص';
  return `${h12}:00 ${suffix}`;
}

export function getStatusMessage(date = new Date()) {
  if (isOpen(date)) {
    return { open: true, message: `مفتوح الآن — حتى ${formatHour(CLOSE_HOUR)}` };
  }
  const hour = date.getHours();
  if (hour < OPEN_HOUR) {
    return { open: false, message: `مغلق — يفتح الساعة ${formatHour(OPEN_HOUR)}` };
  }
  return { open: false, message: `مغلق — يفتح غداً الساعة ${formatHour(OPEN_HOUR)}` };
}
