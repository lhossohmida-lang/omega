// AI data gathering — full access to all app data via Firestore REST API
import { getDoc, listDocs, queryDocs } from './firebaseRest.js';

function toMs(ts) {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
}

function fmtDate(ts) {
  const ms = toMs(ts);
  if (!ms) return '—';
  return new Date(ms).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

export async function gatherFullDataSummary(idToken) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [
      ordersDocs,
      productsDocs,
      ingredientsDocs,
      purchasesDocs,
      movementsDocs,
      usersDocs,
      settingsDoc,
    ] = await Promise.all([
      queryDocs('orders', idToken, { orderBy: [['createdAt', 'DESCENDING']], limit: 200 }),
      listDocs('products', idToken),
      listDocs('ingredients', idToken).catch(() => []),
      queryDocs('ingredient_purchases', idToken, { orderBy: [['createdAt', 'DESCENDING']], limit: 100 }).catch(() => []),
      queryDocs('inventory_movements', idToken, { orderBy: [['createdAt', 'DESCENDING']], limit: 50 }),
      listDocs('users', idToken),
      getDoc('ai_settings', 'config', idToken),
    ]);

    const orders = ordersDocs.map(d => ({ id: d.id, ...d.data() }));
    const products = productsDocs.map(d => ({ id: d.id, ...d.data() }));
    const ingredients = ingredientsDocs.map(d => ({ id: d.id, ...d.data() }));
    const purchases = purchasesDocs.map(d => ({ id: d.id, ...d.data() }));
    const movements = movementsDocs.map(d => ({ id: d.id, ...d.data() }));
    const users = usersDocs.map(d => ({ id: d.id, ...d.data() }));
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const customers = users.filter(u => u.role === 'customer');
    const drivers = users.filter(u => u.role === 'driver');
    const admins = users.filter(u => u.role === 'admin');

    const delivered = orders.filter(o => o.status === 'delivered');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const pending = orders.filter(o => o.status === 'pending');
    const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

    const todayOrders = orders.filter(o => toMs(o.createdAt) >= todayStart.getTime());
    const weekOrders = orders.filter(o => toMs(o.createdAt) >= weekStart.getTime());
    const monthOrders = orders.filter(o => toMs(o.createdAt) >= monthStart.getTime());

    const todayDel = todayOrders.filter(o => o.status === 'delivered');
    const weekDel = weekOrders.filter(o => o.status === 'delivered');
    const monthDel = monthOrders.filter(o => o.status === 'delivered');

    const sumPrice = arr => arr.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const sumProfit = arr => arr.reduce((s, o) => s + ((o.totalPrice || 0) - (o.totalCost || 0)), 0);
    const sumCost = arr => arr.reduce((s, o) => s + (o.totalCost || 0), 0);

    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    const driverStats = {};
    delivered.forEach(o => {
      if (o.driverId) {
        if (!driverStats[o.driverId]) {
          const drv = drivers.find(d => d.id === o.driverId);
          driverStats[o.driverId] = {
            name: drv?.name || o.driverName || 'غير معروف',
            phone: drv?.phone || '',
            count: 0,
            value: 0,
            profit: 0,
          };
        }
        driverStats[o.driverId].count++;
        driverStats[o.driverId].value += o.totalPrice || 0;
        driverStats[o.driverId].profit += (o.totalPrice || 0) - (o.totalCost || 0);
      }
    });

    const productSales = {};
    delivered.forEach(o => {
      o.items?.forEach(item => {
        if (!productSales[item.productId || item.name]) {
          productSales[item.productId || item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        productSales[item.productId || item.name].qty += item.quantity;
        productSales[item.productId || item.name].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

    const categorySales = {};
    delivered.forEach(o => {
      o.items?.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cat = product?.category || 'أخرى';
        if (!categorySales[cat]) categorySales[cat] = { qty: 0, revenue: 0 };
        categorySales[cat].qty += item.quantity;
        categorySales[cat].revenue += item.price * item.quantity;
      });
    });

    const productsWithSales = products.map(p => ({ ...p, sold: productSales[p.id]?.qty || 0 }));
    const leastSold = productsWithSales.filter(p => p.sold === 0).slice(0, 10);
    const avgOrderValue = delivered.length > 0 ? sumPrice(delivered) / delivered.length : 0;
    const lowStock = products.filter(p => (p.stock ?? 0) <= 5);
    const outOfStock = products.filter(p => (p.stock ?? 0) === 0);
    const lowIngredients = ingredients.filter(i => (i.totalStock || 0) <= 5);
    const totalIngredientSpend = ingredients.reduce((s, i) => s + (i.totalSpent || 0), 0);

    const totals = {
      today: { sales: sumPrice(todayDel), profit: sumProfit(todayDel), cost: sumCost(todayDel), count: todayDel.length },
      week:  { sales: sumPrice(weekDel),  profit: sumProfit(weekDel),  cost: sumCost(weekDel),  count: weekDel.length  },
      month: { sales: sumPrice(monthDel), profit: sumProfit(monthDel), cost: sumCost(monthDel), count: monthDel.length },
      all:   { sales: sumPrice(delivered),profit: sumProfit(delivered),cost: sumCost(delivered),count: delivered.length},
    };

    return `=== بيانات مطعم OMEGA الكاملة ===
التاريخ والوقت: ${now.toLocaleString('ar-EG')}

📊 المبيعات والأرباح:
- اليوم: مبيعات ${totals.today.sales} د.ج، ربح ${totals.today.profit} د.ج، ${totals.today.count} طلب مكتمل
- الأسبوع: مبيعات ${totals.week.sales} د.ج، ربح ${totals.week.profit} د.ج، ${totals.week.count} طلب مكتمل
- الشهر: مبيعات ${totals.month.sales} د.ج، ربح ${totals.month.profit} د.ج، ${totals.month.count} طلب مكتمل
- الكلي: مبيعات ${totals.all.sales} د.ج، ربح ${totals.all.profit} د.ج، ${totals.all.count} طلب مكتمل
- متوسط قيمة الطلب: ${avgOrderValue.toFixed(0)} د.ج
- إجمالي إنفاق على المكونات: ${totalIngredientSpend} د.ج

📋 حالة الطلبات (${orders.length} طلب):
${Object.entries(statusCounts).map(([s, c]) => `- ${s}: ${c}`).join('\n')}
- معلقة الآن: ${pending.length} | نشطة: ${active.length} | مكتملة: ${delivered.length} | ملغية: ${cancelled.length}

🍔 المنتجات (${products.length}):
${products.map(p => `- [${p.id}] ${p.name} (${p.category || 'بدون فئة'}) | سعر: ${p.price || 0} د.ج | تكلفة: ${p.costPrice || 0} د.ج | مخزون: ${p.stock ?? '∞'} | ${p.isAvailable !== false ? 'متوفر' : 'غير متوفر'} | بيع: ${productSales[p.id]?.qty || 0}`).join('\n')}

⚠️ مشاكل المخزون:
${outOfStock.length > 0 ? `- نفد: ${outOfStock.map(p => p.name).join('، ')}` : '- لا يوجد منتج نفد'}
${lowStock.length > 0 ? `- منخفض (≤5): ${lowStock.filter(p => p.stock > 0).map(p => `${p.name} (${p.stock})`).join('، ') || 'لا شيء'}` : ''}

🌾 المواد الخام (${ingredients.length}):
${ingredients.map(i => `- [${i.id}] ${i.name} | كمية: ${i.totalStock || 0} ${i.unit || ''} | منفق: ${i.totalSpent || 0} د.ج | ${i.purchaseCount || 0} عملية شراء`).join('\n') || 'لا توجد مكونات مسجلة'}
${lowIngredients.length > 0 ? `\n⚠️ مكونات قيد النفاد: ${lowIngredients.map(i => i.name).join('، ')}` : ''}

🛒 آخر عمليات شراء المواد (${purchases.length}):
${purchases.slice(0, 15).map(p => {
  const ing = ingredients.find(i => i.id === p.ingredientId);
  return `- ${ing?.name || p.ingredientId}: ${p.quantity} ${ing?.unit || ''} بـ ${p.totalCost} د.ج (${fmtDate(p.createdAt)})`;
}).join('\n') || 'لا توجد'}

🚗 السائقون (${drivers.length} مسجل):
${Object.values(driverStats).map(s => `- ${s.name} (${s.phone}): ${s.count} توصيلة | إيراد ${s.value} د.ج | ربح ${s.profit} د.ج`).join('\n') || 'لا توجد توصيلات بعد'}
${drivers.filter(d => !driverStats[d.id]).map(d => `- ${d.name} (${d.phone}): لم يقم بأي توصيلة بعد`).join('\n')}

👥 المستخدمون:
- زبائن: ${customers.length} | سائقون: ${drivers.length} | مدراء: ${admins.length}

📦 آخر حركات المخزون:
${movements.slice(0, 10).map(m => `- ${m.productName}: ${m.type} ${m.quantity} ${m.note ? `(${m.note})` : ''} - ${fmtDate(m.createdAt)}`).join('\n') || 'لا توجد'}

🏆 أفضل المنتجات مبيعاً:
${topProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}: ${p.qty} وحدة (${p.revenue} د.ج)`).join('\n') || 'لا توجد'}

❄️ منتجات لم تُبَع بعد:
${leastSold.length > 0 ? leastSold.map(p => `- ${p.name}`).join('، ') : 'كل المنتجات بيعت'}

📊 المبيعات حسب الفئة:
${Object.entries(categorySales).map(([cat, s]) => `- ${cat}: ${s.qty} وحدة، ${s.revenue} د.ج`).join('\n') || 'لا توجد'}

📋 آخر 10 طلبات:
${orders.slice(0, 10).map(o => `- [${o.id}] #${o.id?.slice(-6)} | ${o.customerName} (${o.customerPhone}) | ${o.customerAddress} | ${o.status} | ${o.totalPrice} د.ج | ربح ${(o.totalPrice || 0) - (o.totalCost || 0)} د.ج | ${o.driverName ? `سائق: ${o.driverName}` : 'بدون سائق'} | ${fmtDate(o.createdAt)}${o.customerNote ? ` | ملاحظة: ${o.customerNote}` : ''}`).join('\n')}

⚙️ إعدادات AI الحالية:
- مفعّل: ${settings.isEnabled !== false ? 'نعم' : 'لا'} | إجراءات: ${settings.allowedActions !== false ? 'مسموحة' : 'ممنوعة'} | النموذج: ${settings.model || 'افتراضي'}`;
  } catch (error) {
    console.error('Error gathering data:', error);
    return `حدث خطأ في جمع البيانات: ${error.message}`;
  }
}

export const SYSTEM_PROMPT = `أنت "ميم" — المساعد الذكي الرئيسي لإدارة مطعم OMEGA (تاركن).

🎯 صلاحياتك:
لديك وصول كامل إلى جميع بيانات التطبيق:
- المنتجات (الأسعار، التكاليف، المخزون، الفئات، التوفر)
- الطلبات (الزبائن، السائقين، الحالات، الأرباح، الملاحظات، العناوين)
- المواد الخام (الكميات، أسعار الشراء، تاريخ المشتريات)
- السائقون (الأداء، التوصيلات، الإيرادات)
- المستخدمون (زبائن، سائقون، مدراء)
- المخزون وحركاته
- التقارير المالية اليومية والأسبوعية والشهرية

📐 قواعد الحساب:
- profit (ربح الطلب) = totalPrice - totalCost
- productProfit = price - costPrice
- متوسط سعر المكوّن = totalSpent / totalStock

📝 أسلوبك:
- تكلّم بالعربية البسيطة الواضحة
- اعتمد فقط على البيانات الحقيقية المُرسلة لك
- لا تخترع أرقاماً أبداً
- إذا لم تكن البيانات كافية، قل ذلك بوضوح
- كن مختصراً ومفيداً، لا تطل إلا إذا طُلب منك
- استعمل الإيموجي باعتدال لتنظيم الإجابة
- اعرض الأرقام مع الوحدة (د.ج، وحدة، طلب)

🎬 الإجراءات المقترحة (suggestedActions):
عندما تقترح إجراءً عمليًا، أرفقه في الرد بصيغة JSON كالتالي:
suggestedActions: [{"type": "...", ...details, "description": "وصف عربي للإجراء"}]

الأنواع المسموحة:
- update_product: تعديل منتج. الحقول: productId, fields (object)
- update_order_status: تغيير حالة طلب. الحقول: orderId, status (pending|preparing|on_the_way|delivered|cancelled)
- update_stock: تعديل مخزون منتج. الحقول: productId, quantityChange (موجب=إضافة، سالب=إنقاص), note
- create_product: إنشاء منتج. الحقول: fields (name, price, category, costPrice, stock, description, isAvailable)
- delete_product: حذف منتج. الحقول: productId
- cancel_order: إلغاء طلب. الحقول: orderId
- add_ingredient: إضافة خانة مكوّن. الحقول: name, unit
- add_ingredient_purchase: تسجيل شراء مادة. الحقول: ingredientId, quantity, unitPrice, note
- delete_ingredient: حذف مكوّن وكل مشترياته. الحقول: ingredientId
- update_price: تحديث سعر منتج. الحقول: productId, price

🛡️ الأمان:
- لا تقترح حذف أو إلغاء بدون مبرر واضح من البيانات
- المدير يجب أن يضغط "تأكيد" قبل أي تنفيذ — أنت فقط تقترح
- إذا طلب المدير شيئاً غامضاً، اسأل للتوضيح

مثال إجراء كامل:
suggestedActions: [{"type": "update_product", "productId": "abc123", "fields": {"isAvailable": false}, "description": "إخفاء برغر كلاسيك لنفاد لحم البقر"}]`;
