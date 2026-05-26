/**
 * localSync.js
 * خدمة WebSocket للمزامنة المحلية عبر شبكة WiFi بدون إنترنت
 *
 * كيفية الاستخدام:
 *   - localSync.connect(wsUrl)    — الاتصال بالسيرفر
 *   - localSync.on(type, cb)      — الاشتراك في حدث
 *   - localSync.emit(type, data)  — إرسال حدث
 *   - localSync.disconnect()      — قطع الاتصال
 */

// عنوان WebSocket — يقرأه من localStorage ليسهل تغييره
function getWsUrl() {
  const saved = localStorage.getItem('omega_local_ws');
  if (saved) return saved;
  // افتراضي: نفس الجهاز
  const host = window.location.hostname;
  return `ws://${host}:3001`;
}

class LocalSync {
  constructor() {
    this.ws = null;
    this.listeners = {}; // { type: [callback] }
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
    this.enabled = false;
    this.url = null;
  }

  /** الاتصال بسيرفر WebSocket */
  connect(url) {
    this.enabled = true;
    this.url = url || getWsUrl();
    this._openConnection();
  }

  _openConnection() {
    if (!this.enabled) return;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('🔌 [LocalSync] متصل بالشبكة المحلية:', this.url);
        clearTimeout(this.reconnectTimer);
        this._fire('_connected', {});
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          this._fire(msg.type, msg.data || msg);
        } catch (_) {}
      };

      this.ws.onclose = () => {
        console.warn('⚠️ [LocalSync] انقطع الاتصال، إعادة المحاولة...');
        this._fire('_disconnected', {});
        if (this.enabled) {
          this.reconnectTimer = setTimeout(() => this._openConnection(), this.reconnectDelay);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (e) {
      console.error('[LocalSync] خطأ في الاتصال:', e);
      if (this.enabled) {
        this.reconnectTimer = setTimeout(() => this._openConnection(), this.reconnectDelay);
      }
    }
  }

  /** إرسال حدث لجميع الأجهزة المتصلة */
  emit(type, data = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  /** الاشتراك في نوع حدث معين */
  on(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
    // إرجاع دالة لإلغاء الاشتراك
    return () => this.off(type, callback);
  }

  /** إلغاء الاشتراك */
  off(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }
  }

  _fire(type, data) {
    (this.listeners[type] || []).forEach(cb => cb(data));
  }

  /** قطع الاتصال */
  disconnect() {
    this.enabled = false;
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// نسخة وحيدة تُستخدم في كامل التطبيق
const localSync = new LocalSync();
export default localSync;

// ─── أنواع الأحداث القياسية ───
export const SYNC_EVENTS = {
  ORDER_UPDATED:   'order:updated',    // تحديث حالة طلب
  ORDER_CREATED:   'order:created',    // طلب جديد
  ORDER_DELETED:   'order:deleted',    // حذف طلب
  WORKER_CHECKIN:  'worker:checkin',   // عامل دخل
  WORKER_CHECKOUT: 'worker:checkout',  // عامل خرج
  PING:            'ping',             // فحص الاتصال
};
