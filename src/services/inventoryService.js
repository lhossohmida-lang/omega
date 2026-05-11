import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, orderBy, serverTimestamp, limit,
} from 'firebase/firestore';

const INVENTORY_COL = 'inventory_movements';
const PRODUCTS_COL = 'products';
const INGREDIENTS_COL = 'ingredients';
const PURCHASES_COL = 'ingredient_purchases';

// إضافة حركة مخزون
export async function addInventoryMovement({ productId, productName, type, quantity, note, createdBy }) {
  await addDoc(collection(db, INVENTORY_COL), {
    productId,
    productName,
    type, // add, remove, sale, correction
    quantity,
    note: note || '',
    createdBy,
    createdAt: serverTimestamp(),
  });

  // تحديث المخزون في المنتج
  const { getDoc } = await import('firebase/firestore');
  const productRef = doc(db, PRODUCTS_COL, productId);
  const productDoc = await getDoc(productRef);
  
  if (productDoc.exists()) {
    const currentStock = productDoc.data().stock || 0;
    let newStock = currentStock;

    switch (type) {
      case 'add':
        newStock = currentStock + Math.abs(quantity);
        break;
      case 'remove':
        newStock = Math.max(0, currentStock - Math.abs(quantity));
        break;
      case 'correction':
        newStock = quantity; // الكمية الجديدة مباشرة
        break;
      case 'sale':
        newStock = Math.max(0, currentStock - Math.abs(quantity));
        break;
    }

    await updateDoc(productRef, {
      stock: newStock,
      isAvailable: newStock > 0,
      updatedAt: serverTimestamp(),
    });
  }
}

// جلب حركات المخزون
export async function getInventoryMovements(limitCount = 50) {
  const q = query(
    collection(db, INVENTORY_COL),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================
// المواد الخام (Ingredients)
// ============================

// جلب جميع المكونات
export async function getAllIngredients() {
  const q = query(collection(db, INGREDIENTS_COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// إنشاء "خانة" مكوّن (اسم + وحدة فقط)
export async function addIngredient({ name, unit }) {
  return await addDoc(collection(db, INGREDIENTS_COL), {
    name,
    unit: unit || 'وحدة',
    totalStock: 0,
    totalSpent: 0,
    purchaseCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// تعديل خانة المكوّن (اسم/وحدة)
export async function updateIngredient(id, { name, unit }) {
  const ref = doc(db, INGREDIENTS_COL, id);
  const data = { updatedAt: serverTimestamp() };
  if (name !== undefined) data.name = name;
  if (unit !== undefined) data.unit = unit;
  await updateDoc(ref, data);
}

// حذف مكوّن + جميع مشترياته
export async function deleteIngredient(id) {
  // حذف المشتريات أولاً
  const q = query(collection(db, PURCHASES_COL), where('ingredientId', '==', id));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  // حذف الخانة
  await deleteDoc(doc(db, INGREDIENTS_COL, id));
}

// إضافة عملية شراء جديدة
export async function addIngredientPurchase({ ingredientId, quantity, unitPrice, note }) {
  const { getDoc } = await import('firebase/firestore');
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const totalCost = qty * price;

  await addDoc(collection(db, PURCHASES_COL), {
    ingredientId,
    quantity: qty,
    unitPrice: price,
    totalCost,
    note: note || '',
    createdAt: serverTimestamp(),
  });

  // تحديث الإجماليات في الخانة
  const ref = doc(db, INGREDIENTS_COL, ingredientId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await updateDoc(ref, {
      totalStock: (data.totalStock || 0) + qty,
      totalSpent: (data.totalSpent || 0) + totalCost,
      purchaseCount: (data.purchaseCount || 0) + 1,
      lastPurchaseAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// جلب مشتريات مكوّن
export async function getIngredientPurchases(ingredientId) {
  const q = query(
    collection(db, PURCHASES_COL),
    where('ingredientId', '==', ingredientId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// حذف عملية شراء (يخصم من الإجماليات)
export async function deleteIngredientPurchase(purchaseId, ingredientId) {
  const { getDoc } = await import('firebase/firestore');
  const purchaseRef = doc(db, PURCHASES_COL, purchaseId);
  const purchaseSnap = await getDoc(purchaseRef);
  if (!purchaseSnap.exists()) return;
  const p = purchaseSnap.data();

  await deleteDoc(purchaseRef);

  const ingRef = doc(db, INGREDIENTS_COL, ingredientId);
  const ingSnap = await getDoc(ingRef);
  if (ingSnap.exists()) {
    const data = ingSnap.data();
    await updateDoc(ingRef, {
      totalStock: Math.max(0, (data.totalStock || 0) - (p.quantity || 0)),
      totalSpent: Math.max(0, (data.totalSpent || 0) - (p.totalCost || 0)),
      purchaseCount: Math.max(0, (data.purchaseCount || 0) - 1),
      updatedAt: serverTimestamp(),
    });
  }
}

// جلب حركات منتج معين
export async function getProductMovements(productId) {
  const q = query(
    collection(db, INVENTORY_COL),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
