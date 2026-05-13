import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, runTransaction, limit,
  onSnapshot, writeBatch,
} from 'firebase/firestore';
import { isOpen, getStatusMessage } from '../utils/businessHours';

const ORDERS_COL = 'orders';
const PRODUCTS_COL = 'products';

// إنشاء طلب جديد — يتحقق من ساعات العمل وتفعيل المنتجات (بدون نظام مخزون)
export async function createOrder(orderData) {
  if (!isOpen()) {
    throw new Error(getStatusMessage().message);
  }

  // التحقق من تفعيل كل منتج
  for (const item of orderData.items) {
    const productDoc = await getDoc(doc(db, PRODUCTS_COL, item.productId));
    if (!productDoc.exists()) throw new Error(`المنتج ${item.name} غير موجود`);
    const product = productDoc.data();
    if (product.isAvailable === false) {
      throw new Error(`المنتج ${item.name} غير متاح حالياً`);
    }
  }

  // حساب totalCost
  let totalCost = 0;
  for (const item of orderData.items) {
    totalCost += (item.costPrice || 0) * item.quantity;
  }

  const order = {
    ...orderData,
    totalCost,
    profit: orderData.totalPrice - totalCost,
    status: 'pending',
    paymentMethod: 'cash',
    createdAt: serverTimestamp(),
    acceptedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    driverId: null,
    driverName: null,
    driverPhone: null,
  };

  const orderRef = await addDoc(collection(db, ORDERS_COL), order);

  // تحديث عدّاد المبيعات لكل منتج (لإحصائيات الأكثر مبيعاً)
  for (const item of orderData.items) {
    const productRef = doc(db, PRODUCTS_COL, item.productId);
    const productDoc = await getDoc(productRef);
    const soldCount = (productDoc.data()?.soldCount || 0) + item.quantity;
    await updateDoc(productRef, {
      soldCount,
      updatedAt: serverTimestamp(),
    });
  }

  return orderRef.id;
}

// جلب طلبات الزبون
export async function getCustomerOrders(customerId) {
  const q = query(
    collection(db, ORDERS_COL),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// جلب جميع الطلبات (للإدارة)
export async function getAllOrders() {
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function commitBatchSafely(batchState) {
  if (batchState.count > 0) {
    await batchState.batch.commit();
  }
}

export async function resetOrdersData() {
  const [ordersSnap, productsSnap] = await Promise.all([
    getDocs(collection(db, ORDERS_COL)),
    getDocs(collection(db, PRODUCTS_COL)),
  ]);

  let batchState = { batch: writeBatch(db), count: 0 };

  const enqueue = async (operation) => {
    operation(batchState.batch);
    batchState.count += 1;

    if (batchState.count >= 450) {
      await batchState.batch.commit();
      batchState = { batch: writeBatch(db), count: 0 };
    }
  };

  for (const orderDoc of ordersSnap.docs) {
    await enqueue(batch => batch.delete(orderDoc.ref));
  }

  for (const productDoc of productsSnap.docs) {
    await enqueue(batch => batch.update(productDoc.ref, {
      soldCount: 0,
      updatedAt: serverTimestamp(),
    }));
  }

  await commitBatchSafely(batchState);

  return {
    deletedOrders: ordersSnap.size,
    resetProducts: productsSnap.size,
  };
}

// جلب الطلبات المؤكدة من صاحب العمل والمتاحة للسائقين
export async function getPendingOrders() {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', 'preparing'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// جلب طلبات السائق
export async function getDriverOrders(driverId) {
  const q = query(
    collection(db, ORDERS_COL),
    where('driverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// قبول طلب بواسطة السائق - مع Transaction لمنع قبول مزدوج
export async function acceptOrder(orderId, driverData) {
  const orderRef = doc(db, ORDERS_COL, orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) throw new Error('الطلب غير موجود');

    const order = orderDoc.data();
    if (order.status !== 'preparing') {
      throw new Error('هذا الطلب غير متاح للسائقين أو تم قبوله من سائق آخر');
    }

    transaction.update(orderRef, {
      status: 'accepted_by_driver',
      driverId: driverData.uid,
      driverName: driverData.name,
      driverPhone: driverData.phone,
      acceptedAt: serverTimestamp(),
    });
  });
}

// تحديث حالة الطلب
export async function updateOrderStatus(orderId, status) {
  const updates = { status };
  if (status === 'delivered') {
    updates.deliveredAt = serverTimestamp();
  }
  if (status === 'cancelled') {
    updates.cancelledAt = serverTimestamp();
  }
  await updateDoc(doc(db, ORDERS_COL, orderId), updates);
}

// جلب طلب واحد
export async function getOrder(orderId) {
  const docSnap = await getDoc(doc(db, ORDERS_COL, orderId));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

// الاستماع لتحديثات طلب معين في الوقت الحقيقي
export function subscribeToOrder(orderId, callback) {
  return onSnapshot(doc(db, ORDERS_COL, orderId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    }
  });
}

// الاستماع للطلبات المؤكدة من صاحب العمل والمتاحة للسائقين في الوقت الحقيقي
export function subscribeToPendingOrders(callback) {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', 'preparing'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

// الاستماع لجميع الطلبات في الوقت الحقيقي
export function subscribeToAllOrders(callback) {
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

// الاستماع لطلبات المطبخ في الوقت الحقيقي (الطلبات المؤكدة من الإدارة)
export function subscribeToWorkerOrders(callback) {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', 'preparing'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

// تحديد الطلب كجاهز من طرف العامل (بدون تغيير المسار الرئيسي للحالة)
export async function markWorkerOrderReady(orderId) {
  await updateDoc(doc(db, ORDERS_COL, orderId), {
    workerReady: true,
    workerReadyAt: serverTimestamp(),
  });
}

// جلب الطلبات حسب الحالة
export async function getOrdersByStatus(status) {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
