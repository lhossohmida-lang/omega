// POST /api/admin-ai/execute-action - تنفيذ الإجراءات المقترحة من AI
import { getDb, verifyAdmin } from '../_lib/firebase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { action, adminId } = req.body || {};
    if (!action || !adminId) return res.status(400).json({ message: 'بيانات ناقصة' });

    const adminData = await verifyAdmin(adminId);
    if (!adminData) return res.status(403).json({ message: 'غير مصرح' });

    const db = getDb();
    const now = new Date();

    switch (action.type) {
      case 'update_product':
        if (action.productId && action.fields) {
          await db.collection('products').doc(action.productId).update({
            ...action.fields,
            updatedAt: now,
          });
        }
        break;

      case 'update_price':
        if (action.productId && typeof action.price === 'number') {
          await db.collection('products').doc(action.productId).update({
            price: action.price,
            updatedAt: now,
          });
        }
        break;

      case 'create_product':
        if (action.fields?.name) {
          await db.collection('products').add({
            ...action.fields,
            isAvailable: action.fields.isAvailable !== false,
            createdAt: now,
            updatedAt: now,
          });
        }
        break;

      case 'delete_product':
        if (action.productId) {
          await db.collection('products').doc(action.productId).delete();
        }
        break;

      case 'update_order_status':
        if (action.orderId && action.status) {
          const updates = { status: action.status };
          if (action.status === 'delivered') updates.deliveredAt = now;
          if (action.status === 'cancelled') updates.cancelledAt = now;
          await db.collection('orders').doc(action.orderId).update(updates);
        }
        break;

      case 'cancel_order':
        if (action.orderId) {
          await db.collection('orders').doc(action.orderId).update({
            status: 'cancelled',
            cancelledAt: now,
          });
        }
        break;

      case 'update_stock':
        if (action.productId) {
          const prodDoc = await db.collection('products').doc(action.productId).get();
          if (prodDoc.exists) {
            const currentStock = prodDoc.data().stock || 0;
            const newStock = Math.max(0, currentStock + (action.quantityChange || 0));
            await db.collection('products').doc(action.productId).update({
              stock: newStock,
              isAvailable: newStock > 0,
              updatedAt: now,
            });
            await db.collection('inventory_movements').add({
              productId: action.productId,
              productName: prodDoc.data().name,
              type: action.quantityChange > 0 ? 'add' : 'remove',
              quantity: action.quantityChange,
              note: action.note || 'تعديل بواسطة AI',
              createdBy: adminId,
              createdAt: now,
            });
          }
        }
        break;

      case 'add_ingredient':
        if (action.name) {
          await db.collection('ingredients').add({
            name: action.name,
            unit: action.unit || 'وحدة',
            totalStock: 0,
            totalSpent: 0,
            purchaseCount: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
        break;

      case 'add_ingredient_purchase':
        if (action.ingredientId && action.quantity && action.unitPrice) {
          const qty = Number(action.quantity);
          const price = Number(action.unitPrice);
          const totalCost = qty * price;
          await db.collection('ingredient_purchases').add({
            ingredientId: action.ingredientId,
            quantity: qty,
            unitPrice: price,
            totalCost,
            note: action.note || 'بواسطة AI',
            createdAt: now,
          });
          const ingRef = db.collection('ingredients').doc(action.ingredientId);
          const ingSnap = await ingRef.get();
          if (ingSnap.exists) {
            const d = ingSnap.data();
            await ingRef.update({
              totalStock: (d.totalStock || 0) + qty,
              totalSpent: (d.totalSpent || 0) + totalCost,
              purchaseCount: (d.purchaseCount || 0) + 1,
              lastPurchaseAt: now,
              updatedAt: now,
            });
          }
        }
        break;

      case 'delete_ingredient':
        if (action.ingredientId) {
          const q = await db.collection('ingredient_purchases')
            .where('ingredientId', '==', action.ingredientId).get();
          await Promise.all(q.docs.map(d => d.ref.delete()));
          await db.collection('ingredients').doc(action.ingredientId).delete();
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
