// Backend Server for OMEGA Restaurant
// يحتوي على endpoint الذكاء الاصطناعي
// مفتاح OpenRouter محفوظ في Environment Variable فقط

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Firebase Admin init
if (getApps().length === 0) {
  initializeApp({
    projectId: 'basst-omeeega',
  });
}
const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting للذكاء الاصطناعي - 10 طلبات لكل دقيقة لكل مستخدم
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'تم تجاوز الحد الأقصى للطلبات. انتظر قليلاً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// System Prompt
const SYSTEM_PROMPT = `أنت مساعد ذكي خاص بإدارة مطعم OMEGA.
المطعم يبيع البرجر والبيتزا والتاكوس والمشروبات.
مهمتك مساعدة المدير في فهم الطلبات والمبيعات والمخزون والأرباح والسائقين.
تكلم بالعربية البسيطة والواضحة.
اعتمد فقط على البيانات التي تأتيك من قاعدة البيانات.
إذا لم تكن هناك بيانات كافية، قل ذلك بوضوح.
لا تخترع أرقاماً.
لا تنفذ حذفاً أو تعديلاً خطيراً إلا بعد تأكيد المدير.
عند تحليل الأرباح استعمل:
profit = totalPrice - totalCost
وعند تحليل المنتج استعمل:
productProfit = price - costPrice
ركز على مساعدة المدير في اتخاذ قرارات عملية.
بما أن النسخة مجانية، اجعل إجاباتك مختصرة ومفيدة ولا تطل كثيراً إلا إذا طلب المدير ذلك.

إذا اقترحت إجراء (مثل تعديل منتج أو إلغاء طلب)، ضعه في suggestedActions كمصفوفة JSON.
كل إجراء يحتوي على: type, description, وتفاصيل الإجراء.
الأنواع المسموحة: update_product, update_order_status, update_stock, create_product, generate_report, cancel_order
مثال: suggestedActions: [{"type": "update_product", "productId": "xxx", "fields": {"isAvailable": false}, "description": "جعل تاكوس دجاج غير متوفر"}]`;

// جمع ملخص البيانات من Firestore
async function gatherDataSummary() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // آخر 50 طلب فقط
    const ordersSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // المنتجات
    const productsSnap = await db.collection('products').get();
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // المنتجات منخفضة المخزون
    const lowStock = products.filter(p => p.stock <= 5);

    // حساب المبيعات
    const delivered = orders.filter(o => o.status === 'delivered');
    const todayOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return d >= todayStart;
    });
    const monthOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return d >= monthStart;
    });

    const todaySales = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const todayProfit = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + ((o.totalPrice || 0) - (o.totalCost || 0)), 0);
    const monthSales = monthOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const monthProfit = monthOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + ((o.totalPrice || 0) - (o.totalCost || 0)), 0);

    // عدد الطلبات حسب الحالة
    const statusCounts = {};
    orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

    // أداء السائقين
    const driverStats = {};
    delivered.forEach(o => {
      if (o.driverName) {
        if (!driverStats[o.driverName]) driverStats[o.driverName] = { count: 0, value: 0 };
        driverStats[o.driverName].count++;
        driverStats[o.driverName].value += o.totalPrice || 0;
      }
    });

    // آخر حركات المخزون
    const movSnap = await db.collection('inventory_movements').orderBy('createdAt', 'desc').limit(10).get();
    const movements = movSnap.docs.map(d => d.data());

    return `=== ملخص بيانات مطعم OMEGA ===
📊 مبيعات اليوم: ${todaySales} | فائدة اليوم: ${todayProfit}
📊 مبيعات الشهر: ${monthSales} | فائدة الشهر: ${monthProfit}
📊 عدد الطلبات حسب الحالة: ${JSON.stringify(statusCounts)}
📊 إجمالي الطلبات المعروضة: ${orders.length}

🍔 المنتجات (${products.length}):
${products.map(p => `- ${p.name} (${p.category}) | سعر: ${p.price} | تكلفة: ${p.costPrice || 0} | مخزون: ${p.stock} | ${p.isAvailable ? 'متوفر' : 'غير متوفر'}`).join('\n')}

⚠️ منتجات منخفضة المخزون:
${lowStock.length > 0 ? lowStock.map(p => `- ${p.name}: ${p.stock} متبقي`).join('\n') : 'لا يوجد'}

🚗 أداء السائقين:
${Object.entries(driverStats).map(([name, s]) => `- ${name}: ${s.count} توصيلة | قيمة: ${s.value}`).join('\n') || 'لا توجد بيانات'}

📦 آخر حركات المخزون:
${movements.map(m => `- ${m.productName}: ${m.type} ${m.quantity} ${m.note || ''}`).join('\n') || 'لا توجد'}

📋 آخر 5 طلبات:
${orders.slice(0, 5).map(o => `- #${o.id?.slice(-6)} | ${o.customerName} | ${o.status} | ${o.totalPrice} | ربح: ${(o.totalPrice || 0) - (o.totalCost || 0)}`).join('\n')}`;
  } catch (error) {
    console.error('Error gathering data:', error);
    return 'لا تتوفر بيانات حالياً. قد تكون قاعدة البيانات فارغة.';
  }
}

// POST /api/admin-ai/chat
app.post('/api/admin-ai/chat', aiLimiter, async (req, res) => {
  try {
    const { question, adminId } = req.body;
    if (!question || !adminId) {
      return res.status(400).json({ message: 'يرجى إرسال السؤال ومعرف المدير' });
    }

    // التحقق من أن المستخدم admin
    const userDoc = await db.collection('users').doc(adminId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك باستخدام هذه الخدمة' });
    }

    // التحقق من إعدادات AI
    const settingsDoc = await db.collection('ai_settings').doc('config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    if (settings.isEnabled === false) {
      return res.status(403).json({ message: 'الذكاء الاصطناعي معطل حالياً' });
    }

    // جمع البيانات
    const dataSummary = await gatherDataSummary();

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ message: 'مفتاح OpenRouter غير مُعد. أضف OPENROUTER_API_KEY في ملف .env' });
    }

    // إرسال الطلب لـ OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://omega-restaurant.app',
        'X-OpenRouter-Title': 'OMEGA Restaurant App',
      },
      body: JSON.stringify({
        model: settings.model || 'inclusionai/ring-2.6-1t:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `سؤال المدير: ${question}\n\n${dataSummary}` },
        ],
        temperature: settings.temperature || 0.3,
        max_tokens: settings.maxTokens || 1200,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return res.status(500).json({ message: 'خطأ من OpenRouter: ' + (data.error?.message || 'غير معروف') });
    }

    const aiResponse = data.choices?.[0]?.message?.content || 'لا يوجد رد';
    const tokensUsed = data.usage?.total_tokens || 0;

    // محاولة استخراج suggestedActions من الرد
    let suggestedActions = [];
    try {
      const actionsMatch = aiResponse.match(/suggestedActions:\s*(\[[\s\S]*?\])/);
      if (actionsMatch) {
        suggestedActions = JSON.parse(actionsMatch[1]);
      }
    } catch (e) { /* ignore parsing errors */ }

    // تسجيل في ai_logs
    await db.collection('ai_logs').add({
      adminId,
      adminName: userDoc.data().name,
      question,
      answer: aiResponse,
      suggestedActions,
      executedActions: [],
      tokensUsed,
      createdAt: new Date(),
    });

    res.json({
      answer: aiResponse,
      suggestedActions,
      tokensUsed,
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: 'حدث خطأ في معالجة الطلب' });
  }
});

// POST /api/admin-ai/execute-action
app.post('/api/admin-ai/execute-action', async (req, res) => {
  try {
    const { action, adminId } = req.body;
    if (!action || !adminId) {
      return res.status(400).json({ message: 'بيانات ناقصة' });
    }

    // التحقق من admin
    const userDoc = await db.collection('users').doc(adminId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    switch (action.type) {
      case 'update_product':
        if (action.productId && action.fields) {
          await db.collection('products').doc(action.productId).update({
            ...action.fields,
            updatedAt: new Date(),
          });
        }
        break;

      case 'update_order_status':
        if (action.orderId && action.status) {
          const updates = { status: action.status };
          if (action.status === 'delivered') updates.deliveredAt = new Date();
          if (action.status === 'cancelled') updates.cancelledAt = new Date();
          await db.collection('orders').doc(action.orderId).update(updates);
        }
        break;

      case 'update_stock':
        if (action.productId) {
          const prodDoc = await db.collection('products').doc(action.productId).get();
          if (prodDoc.exists) {
            const currentStock = prodDoc.data().stock || 0;
            const newStock = currentStock + (action.quantityChange || 0);
            await db.collection('products').doc(action.productId).update({
              stock: Math.max(0, newStock),
              isAvailable: newStock > 0,
              updatedAt: new Date(),
            });
            await db.collection('inventory_movements').add({
              productId: action.productId,
              productName: prodDoc.data().name,
              type: action.quantityChange > 0 ? 'add' : 'remove',
              quantity: action.quantityChange,
              note: action.note || 'تعديل بواسطة AI',
              createdBy: adminId,
              createdAt: new Date(),
            });
          }
        }
        break;

      case 'cancel_order':
        if (action.orderId) {
          await db.collection('orders').doc(action.orderId).update({
            status: 'cancelled',
            cancelledAt: new Date(),
          });
        }
        break;

      default:
        return res.status(400).json({ message: `نوع إجراء غير معروف: ${action.type}` });
    }

    res.json({ success: true, message: 'تم تنفيذ الإجراء بنجاح' });
  } catch (error) {
    console.error('Execute action error:', error);
    res.status(500).json({ message: 'خطأ في تنفيذ الإجراء' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 OMEGA Backend Server running on port ${PORT}`);
});
