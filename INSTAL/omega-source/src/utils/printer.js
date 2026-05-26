/**
 * printer.js
 * يطبع بطاقات الطلبات عبر iframe مخفي — بدون مربعات حوار إضافية.
 *
 * طابعتان مختلفتان:
 *  - admin (للإدارة): 80mm × 220mm — تحتوي كل تفاصيل الطلب.
 *  - kitchen (للمطبخ): 80mm × 80mm — رقم الطلب + نوع الصنف (تاكوس/برغر/...) + الكمية فقط.
 *
 * يدعم طباعة عنصر واحد للمطبخ عبر تمرير { item } اختيارياً.
 */

const CATEGORY_LABEL = {
  pizza: 'بيتزا',
  burger: 'برغر',
  tacos: 'تاكوس',
  drinks: 'مشروبات',
  desserts: 'حلويات',
  appetizers: 'مقبلات',
  sofli: 'سوفلي',
  offers: 'عرض خاص',
};

const getFormattedTime = (createdAt) => {
  if (!createdAt) return new Date().toLocaleString('ar-EG');
  let date;
  if (createdAt.seconds) date = new Date(createdAt.seconds * 1000);
  else if (typeof createdAt.toDate === 'function') date = createdAt.toDate();
  else date = new Date(createdAt);
  return date.toLocaleString('ar-EG');
};

const orderNoLabel = (order) => {
  if (order?.orderNumber != null) {
    return String(order.orderNumber).padStart(3, '0');
  }
  return (order?.id || '').slice(-6).toUpperCase();
};

const orderTypeLabel = (order) => {
  if (order.orderType === 'table') return `طاولة رقم ${order.tableNumber || '—'}`;
  if (order.orderType === 'takeout') return `سفري · زبون ${order.takeoutNumber || '—'}`;
  if (order.orderType === 'delivery') return `توصيل · سائق ${order.driverNumber || '—'}`;
  return order.isDelivery ? 'توصيل' : 'داخل المطعم';
};

/* ────────────────────────────────────────────
   نموذج الطباعة للإدارة — كامل التفاصيل
   ──────────────────────────────────────────── */
function buildAdminHtml(order) {
  const itemsHtml = (order.items || []).map(item => {
    let componentsHtml = '';
    if (item.type === 'offer' && item.components?.length > 0) {
      componentsHtml = `<div class="item-components">${item.components.map(c => `• ${c.quantity}× ${c.name}`).join('<br/>')}</div>`;
    }
    const sizeText = item.size ? ` (${item.size})` : '';
    return `
      <tr class="item-row">
        <td class="item-details"><strong>${item.name}${sizeText}</strong>${componentsHtml}</td>
        <td class="item-qty">×${item.quantity}</td>
        <td class="item-price">${(item.price * item.quantity).toFixed(2)} د.ج</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>طلب #${orderNoLabel(order)}</title>
      <style>
        @page { size: 80mm 220mm; margin: 0; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 13px; line-height: 1.4; color: #000;
          margin: 0; padding: 6mm 4mm; width: 80mm;
        }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
        .header h1 { font-size: 24px; margin: 0 0 4px; font-weight: 900; letter-spacing: 1px; }
        .header .sub { font-size: 13px; font-weight: bold; margin: 0; }
        .big-number {
          background: #000; color: #fff;
          text-align: center; font-size: 36px; font-weight: 900;
          padding: 8px; margin: 10px 0;
          letter-spacing: 2px;
        }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
        .info-table td { padding: 3px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .items-table th { border-bottom: 2px solid #000; padding: 6px 0; font-size: 12px; }
        .item-row { border-bottom: 1px dotted #888; }
        .item-details { padding: 8px 0; text-align: right; }
        .item-components { font-size: 11px; color: #444; padding-right: 8px; margin-top: 3px; }
        .item-qty { padding: 8px 0; text-align: center; font-weight: bold; }
        .item-price { padding: 8px 0; text-align: left; }
        .total-section { border-top: 2px solid #000; padding-top: 8px; font-size: 14px; margin-bottom: 10px; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; }
        .note-box { border: 1px solid #000; padding: 8px; margin-top: 10px; font-size: 12px; background: #f5f5f5; }
        .footer { text-align: center; margin-top: 14px; font-size: 11px; border-top: 1px dashed #000; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>أوميغا — OMEGA</h1>
        <p class="sub">تيكيت الإدارة</p>
      </div>
      <div class="big-number">طلب رقم ${orderNoLabel(order)}</div>
      <table class="info-table">
        <tr>
          <td><strong>الموقع:</strong> ${orderTypeLabel(order)}</td>
        </tr>
        <tr>
          <td><strong>العميل:</strong> ${order.customerName || 'عميل'}</td>
        </tr>
        ${order.customerPhone ? `<tr><td dir="ltr" style="text-align:left;"><strong>الهاتف:</strong> ${order.customerPhone}</td></tr>` : ''}
        ${order.isDelivery && order.customerAddress ? `<tr><td><strong>العنوان:</strong> ${order.customerAddress}</td></tr>` : ''}
        <tr><td><strong>الوقت:</strong> ${getFormattedTime(order.createdAt)}</td></tr>
      </table>
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:right; width:60%;">الصنف</th>
            <th style="text-align:center; width:15%;">الكمية</th>
            <th style="text-align:left; width:25%;">السعر</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="total-section">
        ${order.deliveryFee ? `<div class="total-row" style="font-size:12px; font-weight:normal;"><span>رسوم التوصيل:</span><span>${order.deliveryFee} د.ج</span></div>` : ''}
        <div class="total-row" style="font-size:16px;"><span>الإجمالي:</span><span>${order.totalPrice} د.ج</span></div>
      </div>
      ${order.customerNote ? `<div class="note-box"><strong>📝 ملاحظة:</strong> ${order.customerNote}</div>` : ''}
      <div class="footer">
        <p>نظام OMEGA POS</p>
        <p>شكراً لطلبكم! ❤️</p>
      </div>
    </body>
    </html>
  `;
}

/* ────────────────────────────────────────────
   نموذج الطباعة للمطبخ — رقم + نوع + الكمية
   ──────────────────────────────────────────── */
function buildKitchenHtml(order, item) {
  // إن مُرّر item نطبع بطاقة لصنف واحد، وإلا نطبع كل الأصناف بصفحات متعددة.
  const itemsToPrint = item ? [item] : (order.items || []);
  const pages = itemsToPrint.map(it => {
    const typeLabel = CATEGORY_LABEL[it.category] || it.category || (it.type === 'offer' ? 'عرض' : 'صنف');
    const sizeText = it.size ? ` (${it.size})` : '';
    return `
      <section class="ticket">
        <div class="num">طلب رقم</div>
        <div class="num-value">${orderNoLabel(order)}</div>
        <div class="type">${typeLabel}</div>
        <div class="name">${it.name}${sizeText}</div>
        <div class="qty">×${it.quantity || 1}</div>
        <div class="loc">${orderTypeLabel(order)}</div>
        ${order.customerNote ? `<div class="note">📝 ${order.customerNote}</div>` : ''}
      </section>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>مطبخ — طلب #${orderNoLabel(order)}</title>
      <style>
        @page { size: 80mm 80mm; margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; margin: 0; padding: 0; }
        .ticket {
          width: 80mm; height: 80mm;
          padding: 4mm; text-align: center;
          page-break-after: always;
          display: flex; flex-direction: column; justify-content: center; gap: 2mm;
        }
        .ticket:last-child { page-break-after: auto; }
        .num { font-size: 11px; font-weight: bold; }
        .num-value { font-size: 34px; font-weight: 900; letter-spacing: 2px; line-height: 1; }
        .type { font-size: 18px; font-weight: 900; background: #000; color: #fff; padding: 3mm 2mm; margin: 1mm 0; }
        .name { font-size: 14px; font-weight: bold; }
        .qty { font-size: 22px; font-weight: 900; }
        .loc { font-size: 11px; border-top: 1px dashed #000; padding-top: 2mm; }
        .note { font-size: 10px; margin-top: 1mm; }
      </style>
    </head>
    <body>${pages}</body>
    </html>
  `;
}

/* ────────────────────────────────────────────
   طباعة عبر iframe (احتياطي عند فشل الخادم)
   ──────────────────────────────────────────── */
function printViaIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '10px';
  iframe.style.height = '10px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const docu = iframe.contentWindow.document;
  docu.open();
  docu.write(html);
  docu.write(`
    <script>
      window.onload = function() {
        window.focus();
        setTimeout(function() {
          try { window.print(); } catch (e) { console.error(e); }
          setTimeout(function() {
            try { window.parent.document.body.removeChild(window.frameElement); } catch (e) {}
          }, 1500);
        }, 200);
      };
    </script>
  `);
  docu.close();
}

/* ────────────────────────────────────────────
   طباعة صامتة عبر الخادم المحلي
   ──────────────────────────────────────────── */
let serverHealthCache = null;
let serverHealthCheckedAt = 0;

export async function checkPrintServer() {
  // كاش 30 ثانية لتفادي طلبات متكررة
  const now = Date.now();
  if (serverHealthCache !== null && (now - serverHealthCheckedAt) < 30000) {
    return serverHealthCache;
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/print/health', { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) {
      serverHealthCache = { ok: false, reason: `HTTP ${res.status}` };
    } else {
      const data = await res.json();
      serverHealthCache = { ok: !!data.ready, reason: data.message || '' };
    }
  } catch (err) {
    serverHealthCache = { ok: false, reason: 'الخادم المحلي غير متاح (npm run local)' };
  }
  serverHealthCheckedAt = now;
  return serverHealthCache;
}

async function printViaServer(html, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, ...options }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn('🖨️ خطأ من خادم الطباعة:', data.error || res.statusText);
      return { ok: false, reason: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.success === true) {
      return { ok: true };
    }
    return { ok: false, reason: data.error || 'فشل غير معروف' };
  } catch (err) {
    console.warn('🖨️ خادم الطباعة غير متاح:', err.message);
    return { ok: false, reason: err.message };
  }
}

/* ────────────────────────────────────────────
   نقطة الدخول الموحدة
   ──────────────────────────────────────────── */
export async function printOrderTicket(order, { type = 'admin', item = null, printer = null, allowBrowserFallback = true } = {}) {
  const html = type === 'kitchen' ? buildKitchenHtml(order, item) : buildAdminHtml(order);

  // محاولة الطباعة الصامتة عبر الخادم المحلي
  const result = await printViaServer(html, printer ? { printer } : {});
  if (result.ok) {
    return { method: 'server' };
  }

  // فشل الخادم
  console.warn(`🖨️ الطباعة الصامتة فشلت — السبب: ${result.reason}`);

  if (!allowBrowserFallback) {
    throw new Error(`فشلت الطباعة الصامتة: ${result.reason}`);
  }

  // fallback إلى المتصفح (قد يظهر مربع حوار إذا لم يكن --kiosk-printing مفعّلاً)
  printViaIframe(html);
  return { method: 'browser', reason: result.reason };
}

// طباعة سريعة لتيكيت مطبخ صنف واحد
export function printKitchenItem(order, item) {
  printOrderTicket(order, { type: 'kitchen', item });
}

// طباعة سريعة لتيكيت إداري كامل
export function printAdminReceipt(order) {
  printOrderTicket(order, { type: 'admin' });
}
