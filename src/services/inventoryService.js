import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, limit,
} from 'firebase/firestore';

const INVENTORY_COL = 'inventory_movements';
const PRODUCTS_COL = 'products';

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
