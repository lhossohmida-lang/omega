/**
 * printer.js
 * utility function to format and print order tickets using a hidden iframe
 */

const getFormattedTime = (createdAt) => {
  if (!createdAt) return new Date().toLocaleString('ar-EG');
  let date;
  if (createdAt.seconds) {
    date = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt.toDate === 'function') {
    date = createdAt.toDate();
  } else {
    date = new Date(createdAt);
  }
  return date.toLocaleString('ar-EG');
};

export function printOrderTicket(order, { type = 'admin' } = {}) {
  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '10px';
  iframe.style.height = '10px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  
  // Format items HTML
  const itemsHtml = (order.items || []).map(item => {
    let componentsHtml = '';
    if (item.type === 'offer' && item.components?.length > 0) {
      componentsHtml = `
        <div class="item-components">
          ${item.components.map(c => `• ${c.quantity}x ${c.name}`).join('<br/>')}
        </div>
      `;
    }
    const sizeText = item.size ? ` (${item.size})` : '';
    return `
      <tr class="item-row">
        <td class="item-details">
          <strong>${item.name}${sizeText}</strong>
          ${componentsHtml}
        </td>
        <td class="item-qty">x${item.quantity}</td>
        <td class="item-price">${(item.price * item.quantity).toFixed(2)} د.ج</td>
      </tr>
    `;
  }).join('');

  const orderTypeLabel = order.isDelivery ? '🚗 توصيل' : '🍽️ داخل المطعم';
  
  let orderDetailsLabel = '';
  if (order.orderType === 'table' && order.tableNumber) {
    orderDetailsLabel = `طاولة رقم: ${order.tableNumber}`;
  } else if (order.orderType === 'takeout' && order.takeoutNumber) {
    orderDetailsLabel = `زبون سفري: ${order.takeoutNumber}`;
  } else if (order.orderType === 'delivery' && order.driverNumber) {
    orderDetailsLabel = `سائق رقم: ${order.driverNumber}`;
  }

  const ticketTypeHeader = type === 'kitchen' ? 'تيكيت المطبخ' : 'تيكيت الإدارة';

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>Ticket #${order.id?.slice(-6)}</title>
      <style>
        @page {
          margin: 0;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 13px;
          line-height: 1.4;
          color: #000;
          margin: 0;
          padding: 8mm 4mm;
          width: 80mm;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
        }
        .header h1 {
          font-size: 22px;
          margin: 0 0 4px 0;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .header p {
          font-size: 15px;
          margin: 0;
          font-weight: bold;
          text-transform: uppercase;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 12px;
        }
        .info-table td {
          padding: 4px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        .items-table th {
          border-bottom: 2px solid #000;
          padding: 6px 0;
          font-size: 12px;
          font-weight: bold;
        }
        .item-row {
          border-bottom: 1px dotted #888;
        }
        .item-details {
          padding: 8px 0;
          text-align: right;
        }
        .item-components {
          font-size: 11px;
          color: #444;
          padding-right: 8px;
          margin-top: 3px;
        }
        .item-qty {
          padding: 8px 0;
          text-align: center;
          font-weight: bold;
        }
        .item-price {
          padding: 8px 0;
          text-align: left;
        }
        .total-section {
          border-top: 2px solid #000;
          padding-top: 8px;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .note-box {
          border: 1px solid #000;
          padding: 8px;
          margin-top: 12px;
          font-size: 12px;
          background-color: #f9f9f9;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 11px;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>أوميغا - OMEGA</h1>
        <p>${ticketTypeHeader}</p>
      </div>
      
      <table class="info-table">
        <tr>
          <td style="text-align: right;"><strong>رقم الطلب:</strong> #${order.id?.slice(-6).toUpperCase()}</td>
          <td style="text-align: left;"><strong>الحالة:</strong> ${orderTypeLabel}</td>
        </tr>
        ${orderDetailsLabel ? `
        <tr>
          <td colspan="2" style="text-align: right;"><strong>الموقع:</strong> ${orderDetailsLabel}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="text-align: right;"><strong>العميل:</strong> ${order.customerName || 'عميل'}</td>
          <td style="text-align: left;" dir="ltr">${order.customerPhone || '---'}</td>
        </tr>
        ${order.isDelivery && order.customerAddress ? `
        <tr>
          <td colspan="2" style="text-align: right;"><strong>العنوان:</strong> ${order.customerAddress}</td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="2" style="text-align: right;"><strong>الوقت:</strong> ${getFormattedTime(order.createdAt)}</td>
        </tr>
      </table>

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: right; width: 60%;">الصنف</th>
            <th style="text-align: center; width: 15%;">الكمية</th>
            <th style="text-align: left; width: 25%;">السعر</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-section">
        ${order.deliveryFee ? `
        <div class="total-row" style="font-size: 12px; font-weight: normal;">
          <span>رسوم التوصيل:</span>
          <span>${order.deliveryFee} د.ج</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span>الإجمالي:</span>
          <span>${order.totalPrice} د.ج</span>
        </div>
      </div>

      ${order.customerNote ? `
      <div class="note-box">
        <strong>📝 ملاحظة:</strong> ${order.customerNote}
      </div>
      ` : ''}

      <div class="footer">
        <p>نظام OMEGA POS المتكامل</p>
        <p>شكراً لطلبكم وطاب يومكم! ❤️</p>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              window.parent.document.body.removeChild(window.frameElement);
            }, 1500);
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();
}
