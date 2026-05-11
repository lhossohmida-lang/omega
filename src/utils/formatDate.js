// تنسيق التاريخ والوقت
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('ar-DZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return formatDate(timestamp);
}

// التحقق إذا كان اليوم
export function isToday(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

// التحقق إذا كان هذا الشهر
export function isThisMonth(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const today = new Date();
  return date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}
