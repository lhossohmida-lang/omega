// تنسيق العملة - دينار جزائري
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0 د.ج';
  return `${Number(amount).toLocaleString('ar-DZ')} د.ج`;
}

// تنسيق العملة بدون رمز العملة
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('ar-DZ');
}
