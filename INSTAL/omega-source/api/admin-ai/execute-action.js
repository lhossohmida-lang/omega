// POST /api/admin-ai/execute-action — تنفيذ الإجراءات المقترحة من AI
import { getDoc, updateDoc, addDoc, deleteDoc, queryWhere, verifyAdminToken } from '../_lib/firebaseRest.js';

export default async function handler(req, res) {
  res.setHeader('X-Omega-AI-Route', 'token-rest-2026-05-13');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action, idToken, adminId } = body;
    if (!action || !idToken) return res.status(400).json({ message: 'بيانات ناقصة' });

    const adminData = await verifyAdminToken(idToken, adminId);
    if (!adminData) return res.status(403).json({ message: 'غير مصرح' });

    const now = new Date();

    switch (action.type) {
      case 'update_product':
        if (action.productId && action.fields) {
          await updateDoc('products', action.productId, { ...action.fields, updatedAt: now }, idToken);
        }
        break;

      case 'update_price':
        if (action.productId && typeof action.price === 'number') {
          await updateDoc('products', action.productId, { price: action.price, updatedAt: now }, idToken);
        }
        break;

      case 'create_product':
        if (action.fields?.name) {
          await addDoc('products', {
            ...action.fields,
            isAvailable: action.fields.isAvailable !== false,
            createdAt: now,
            updatedAt: now,
          }, idToken);
        }
        break;

      case 'delete_product':
        if (action.productId) {
          await deleteDoc('products', action.productId, idToken);
        }
        break;

      case 'update_order_status':
        if (action.orderId && action.status) {
          const updates = { status: action.status };
          if (action.status === 'delivered') updates.deliveredAt = now;
          if (action.status === 'cancelled') updates.cancelledAt = now;
          await updateDoc('orders', action.orderId, updates, idToken);
        }
        break;

      case 'cancel_order':
        if (action.orderId) {
          await updateDoc('orders', action.orderId, { status: 'cancelled', cancelledAt: now }, idToken);
        }
        break;

      case 'update_stock':
        if (action.productId) {
          const prodDoc = await getDoc('products', action.productId, idToken);
          if (prodDoc.exists) {
            const currentStock = prodDoc.data().stock || 0;
            const newStock = Math.max(0, currentStock + (action.quantityChange || 0));
            await updateDoc('products', action.productId, {
              stock: newStock,
              isAvailable: newStock > 0,
              updatedAt: now,
            }, idToken);
            await addDoc('inventory_movements', {
              productId: action.productId,
              productName: prodDoc.data().name,
              type: action.quantityChange > 0 ? 'add' : 'remove',
              quantity: action.quantityChange,
              note: action.note || 'تعديل بواسطة AI',
              createdBy: adminData.uid,
              createdAt: now,
            }, idToken);
          }
        }
        break;

      case 'add_ingredient':
        if (action.name) {
          await addDoc('ingredients', {
            name: action.name,
            unit: action.unit || 'وحدة',
            totalStock: 0,
            totalSpent: 0,
            purchaseCount: 0,
            createdAt: now,
            updatedAt: now,
          }, idToken);
        }
        break;

      case 'add_ingredient_purchase':
        if (action.ingredientId && action.quantity && action.unitPrice) {
          const qty = Number(action.quantity);
          const price = Number(action.unitPrice);
          const totalCost = qty * price;
          await addDoc('ingredient_purchases', {
            ingredientId: action.ingredientId,
            quantity: qty,
            unitPrice: price,
            totalCost,
            note: action.note || 'بواسطة AI',
            createdAt: now,
          }, idToken);
          const ingSnap = await getDoc('ingredients', action.ingredientId, idToken);
          if (ingSnap.exists) {
            const d = ingSnap.data();
            await updateDoc('ingredients', action.ingredientId, {
              totalStock: (d.totalStock || 0) + qty,
              totalSpent: (d.totalSpent || 0) + totalCost,
              purchaseCount: (d.purchaseCount || 0) + 1,
              lastPurchaseAt: now,
              updatedAt: now,
            }, idToken);
          }
        }
        break;

      case 'delete_ingredient':
        if (action.ingredientId) {
          const purchases = await queryWhere('ingredient_purchases', 'ingredientId', action.ingredientId, idToken);
          await Promise.all(purchases.map(d => deleteDoc('ingredient_purchases', d.id, idToken)));
          await deleteDoc('ingredients', action.ingredientId, idToken);
        }
        break;

      default:
        return res.status(400).json({ message: `نوع إجراء غير معروف: ${action.type}` });
    }

    return res.status(200).json({ success: true, message: 'تم تنفيذ الإجراء بنجاح' });
  } catch (error) {
    console.error('Execute action error:', error);
    return res.status(500).json({ message: 'خطأ في تنفيذ الإجراء: ' + error.message });
  }
}
