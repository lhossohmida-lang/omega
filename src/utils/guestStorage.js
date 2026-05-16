// تخزين معرّف الزبون الضيف وقائمة طلباته في المتصفح
// لا حاجة لتسجيل الدخول — كل زبون يحصل على معرّف محلي تلقائياً

const GUEST_ID_KEY = 'omega_guest_id';
const TRACKED_ORDERS_KEY = 'omega_tracked_orders';
const CUSTOMER_INFO_KEY = 'omega_customer_info';

export function getGuestId() {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getTrackedOrderIds() {
  try { return JSON.parse(localStorage.getItem(TRACKED_ORDERS_KEY) || '[]'); }
  catch { return []; }
}

export function addTrackedOrderId(orderId) {
  if (!orderId) return;
  const ids = getTrackedOrderIds();
  if (!ids.includes(orderId)) {
    ids.unshift(orderId);
    localStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify(ids.slice(0, 50)));
  }
}

export function clearTrackedOrders() {
  localStorage.setItem(TRACKED_ORDERS_KEY, '[]');
}

export function getCustomerInfo() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_INFO_KEY) || '{}'); }
  catch { return {}; }
}

export function saveCustomerInfo(info) {
  localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(info || {}));
}
