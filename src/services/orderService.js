import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
  onSnapshot, writeBatch,
} from 'firebase/firestore';
import { isOpen, getStatusMessage } from '../utils/businessHours';

const ORDERS_COL = 'orders';
const PRODUCTS_COL = 'products';

// إنشاء طلب جديد من زبون (داخل المطعم أو توصيل)
// orderData.orderType: 'table' | 'delivery'
export async function createOrder(orderData) {
  if (!isOpen()) {
    throw new Error(getStatusMessage().message);
  }

  // التحقق من تفعيل المنتجات
  for (const item of orderData.items) {
    const productDoc = await getDoc(doc(db, PRODUCTS_COL, item.productId));
    if (!productDoc.exists()) throw new Error(`المنتج ${item.name} غير موجود`);
    const product = productDoc.data();
    if (product.isAvailable === false) {
      throw new Error(`المنتج ${item.name} غير متاح حالياً`);
    }
  }

  let totalCost = 0;
  for (const item of orderData.items) {
    totalCost += (item.costPrice || 0) * item.quantity;
  }

  const isDelivery = orderData.orderType === 'delivery';

  const order = {
    ...orderData,
    isDelivery,
    totalCost,
    profit: (orderData.totalPrice || 0) - totalCost,
    status: 'pending',
    paymentMethod: 'cash',
    itemStatuses: {},
    createdAt: serverTimestamp(),
    acceptedAt: null,
    deliveredAt: null,
    cancelledAt: null,
  };

  const orderRef = await addDoc(collection(db, ORDERS_COL), order);

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

// جلب جميع الطلبات (للإدارة)
export async function getAllOrders() {
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// جلب طلب واحد بالمعرّف
export async function getOrder(orderId) {
  const docSnap = await getDoc(doc(db, ORDERS_COL, orderId));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

// جلب عدة طلبات حسب قائمة معرّفات (لتتبع طلبات الزبون عبر localStorage)
export async function getOrdersByIds(ids = []) {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, ORDERS_COL, id));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

// الاستماع لتحديثات طلب معين
export function subscribeToOrder(orderId, callback) {
  return onSnapshot(doc(db, ORDERS_COL, orderId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    }
  });
}

// الاستماع لجميع الطلبات في الوقت الحقيقي (للإدارة)
export function subscribeToAllOrders(callback) {
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

// الاستماع لطلبات المطبخ (المؤكدة من الإدارة)
export function subscribeToWorkerOrders(callback) {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', 'preparing')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const t = ts => ts?.seconds ? ts.seconds * 1000 : ts?.toMillis?.() || 0;
          return t(b.createdAt) - t(a.createdAt);
        });
      callback(orders);
    },
    (error) => {
      console.error('subscribeToWorkerOrders error:', error);
      callback([]);
    }
  );
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

// تأكيد الطلب من قبل الإدارة (تحويله إلى حالة "تحضير")
// destination: 'table' | 'delivery'
export async function confirmOrder(orderId, { destination = 'table', adminUid = null } = {}) {
  await updateDoc(doc(db, ORDERS_COL, orderId), {
    status: 'preparing',
    isDelivery: destination === 'delivery',
    routedAt: serverTimestamp(),
    routedBy: adminUid,
  });
}

// إنشاء طلب من الإدارة مباشرة (Walk-in) — يبدأ من حالة preparing
export async function createAdminOrder(orderData) {
  for (const item of orderData.items) {
    const productDoc = await getDoc(doc(db, PRODUCTS_COL, item.productId));
    if (!productDoc.exists()) throw new Error(`المنتج ${item.name} غير موجود`);
    const product = productDoc.data();
    if (product.isAvailable === false) {
      throw new Error(`المنتج ${item.name} غير متاح حالياً`);
    }
  }

  let totalCost = 0;
  for (const item of orderData.items) {
    totalCost += (item.costPrice || 0) * item.quantity;
  }

  const order = {
    ...orderData,
    totalCost,
    profit: (orderData.totalPrice || 0) - totalCost,
    status: 'preparing',
    paymentMethod: orderData.paymentMethod || 'cash',
    createdBy: 'admin',
    itemStatuses: {},
    createdAt: serverTimestamp(),
    routedAt: serverTimestamp(),
    acceptedAt: null,
    deliveredAt: null,
    cancelledAt: null,
  };

  const orderRef = await addDoc(collection(db, ORDERS_COL), order);

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

// الاستماع للطلبات الجديدة بانتظار التأكيد
export function subscribeToNewOrders(callback) {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('subscribeToNewOrders error:', error);
      callback([]);
    }
  );
}

// تحديث حالة عنصر فردي داخل طلب
// itemStatus: 'preparing' | 'ready' | null (إلغاء)
export async function setItemStatus(orderId, itemIndex, itemStatus) {
  const orderRef = doc(db, ORDERS_COL, orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('الطلب غير موجود');
  const data = snap.data();
  const itemStatuses = { ...(data.itemStatuses || {}) };
  const key = String(itemIndex);

  if (itemStatus) {
    itemStatuses[key] = itemStatus;
  } else {
    delete itemStatuses[key];
  }

  const items = data.items || [];
  const allReady = items.length > 0 && items.every((_, i) => itemStatuses[String(i)] === 'ready');
  const anyStarted = items.some((_, i) => itemStatuses[String(i)] === 'preparing' || itemStatuses[String(i)] === 'ready');

  const updates = {
    itemStatuses,
    workerStarted: anyStarted,
    workerStartedAt: anyStarted && !data.workerStartedAt ? serverTimestamp() : data.workerStartedAt || null,
    workerReady: allReady,
    workerReadyAt: allReady ? serverTimestamp() : null,
  };

  await updateDoc(orderRef, updates);
}

// أرشفة الطلب من واجهة المطبخ
export async function archiveWorkerOrder(orderId) {
  await updateDoc(doc(db, ORDERS_COL, orderId), {
    workerArchived: true,
    workerArchivedAt: serverTimestamp(),
  });
}

// أرشفة جميع الطلبات الجاهزة
export async function archiveAllReadyOrders(orderIds = []) {
  const batch = writeBatch(db);
  for (const id of orderIds) {
    batch.update(doc(db, ORDERS_COL, id), {
      workerArchived: true,
      workerArchivedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

// إعادة تعيين كل البيانات (للإدارة فقط)
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

// جلب الطلبات حسب الحالة (للإدارة)
export async function getOrdersByStatus(status) {
  const q = query(
    collection(db, ORDERS_COL),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
