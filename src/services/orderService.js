import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
  onSnapshot, writeBatch, deleteDoc, runTransaction,
} from 'firebase/firestore';
import { isOpen, getStatusMessage } from '../utils/businessHours';

const ORDERS_COL = 'orders';
const PRODUCTS_COL = 'products';
const OFFERS_COL = 'special_offers';
const INVENTORY_COL = 'inventory_movements';
const COUNTERS_COL = 'counters';
const ORDER_NUMBER_DOC = 'orderNumber';
const ORDER_NUMBER_MAX = 100;

// عدّاد متسلسل للطلبات: 1 → 100 ثم يعود إلى 1
// يستخدم Firestore transaction لضمان عدم التكرار حتى مع عدة طلبات متزامنة
export async function getNextOrderNumber() {
  const counterRef = doc(db, COUNTERS_COL, ORDER_NUMBER_DOC);
  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? Number(snap.data().value || 0) : 0;
      let next = current + 1;
      if (next > ORDER_NUMBER_MAX) next = 1;
      transaction.set(counterRef, { value: next, updatedAt: serverTimestamp() });
      return next;
    });
  } catch (err) {
    console.error('⚠️ فشلت معاملة العدّاد — سأحاول حساب الرقم من آخر طلب:', err.message);
    // Fallback: ابحث عن آخر طلب وحدّد الرقم التالي
    try {
      const q = query(
        collection(db, ORDERS_COL),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      let lastNumber = 0;
      for (const d of snap.docs) {
        const n = Number(d.data().orderNumber);
        if (Number.isFinite(n) && n > 0) { lastNumber = n; break; }
      }
      let next = lastNumber + 1;
      if (next > ORDER_NUMBER_MAX) next = 1;
      return next;
    } catch (err2) {
      console.error('⚠️ فشل fallback أيضاً — سيُعطى الرقم 1:', err2.message);
      return 1;
    }
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function lineTotal(items = []) {
  return items.reduce((sum, item) => sum + (toNumber(item.price) * Math.max(1, toNumber(item.quantity, 1))), 0);
}

function offerUnitCost(components = []) {
  return components.reduce(
    (sum, item) => sum + (toNumber(item.costPrice) * Math.max(1, toNumber(item.quantity, 1))),
    0
  );
}

async function normalizeProductItem(item) {
  const productDoc = await getDoc(doc(db, PRODUCTS_COL, item.productId));
  if (!productDoc.exists()) throw new Error(`المنتج ${item.name} غير موجود`);
  const product = productDoc.data();
  if (product.isAvailable === false) {
    throw new Error(`المنتج ${item.name} غير متاح حالياً`);
  }

  const productSizes = product.hasSizes && Array.isArray(product.sizes) ? product.sizes : [];
  const selectedSize = item.selectedSize
    ? productSizes.find((size) => size.label === item.selectedSize)
    : null;
  const selectedSizeLabel = selectedSize?.label || item.selectedSize || null;
  const price = selectedSize
    ? toNumber(selectedSize.price, toNumber(item.price))
    : toNumber(product.price, toNumber(item.price));

  return {
    productId: item.productId,
    name: selectedSizeLabel ? `${product.name || item.name} (${selectedSizeLabel})` : product.name || item.name,
    selectedSize: selectedSizeLabel,
    price,
    costPrice: toNumber(product.costPrice, toNumber(item.costPrice)),
    image: product.image || item.image || '',
    category: product.category || item.category || '',
    quantity: Math.max(1, toNumber(item.quantity, 1)),
  };
}

async function normalizeOfferItem(item) {
  const offerId = item.offerId || String(item.productId || '').replace(/^offer_/, '');
  const offerDoc = await getDoc(doc(db, OFFERS_COL, offerId));
  if (!offerDoc.exists()) throw new Error(`العرض ${item.name} غير موجود`);

  const offer = { id: offerDoc.id, ...offerDoc.data() };
  if (offer.isActive === false) throw new Error(`العرض ${offer.title || item.name} غير متاح حالياً`);

  const components = [];
  for (const component of offer.items || []) {
    const productDoc = await getDoc(doc(db, PRODUCTS_COL, component.productId));
    if (!productDoc.exists()) throw new Error(`أحد مكونات العرض غير موجود`);
    const product = productDoc.data();
    if (product.isAvailable === false) {
      throw new Error(`المنتج ${product.name || component.name} داخل العرض غير متاح حالياً`);
    }
    components.push({
      productId: component.productId,
      productName: product.name || component.productName || component.name,
      name: product.name || component.productName || component.name,
      quantity: Math.max(1, toNumber(component.quantity, 1)),
      unitPrice: toNumber(product.price, toNumber(component.unitPrice ?? component.price)),
      price: toNumber(product.price, toNumber(component.unitPrice ?? component.price)),
      costPrice: toNumber(product.costPrice, toNumber(component.costPrice)),
      image: product.image || component.image || '',
      category: product.category || component.category || '',
    });
  }

  return {
    productId: `offer_${offer.id}`,
    type: 'offer',
    offerId: offer.id,
    name: offer.title || item.name,
    description: offer.description || item.description || '',
    price: toNumber(offer.offerPrice, toNumber(item.price)),
    oldPrice: offer.originalTotalPrice ?? offer.oldPrice ?? item.oldPrice ?? null,
    originalTotalPrice: offer.originalTotalPrice ?? offer.oldPrice ?? null,
    discountValue: offer.discountValue ?? null,
    discountPercent: offer.discountPercent ?? null,
    costPrice: offerUnitCost(components),
    image: offer.image || components.find(component => component.image)?.image || item.image || '',
    category: 'offers',
    quantity: Math.max(1, toNumber(item.quantity, 1)),
    components,
  };
}

async function normalizeOrderItems(items = []) {
  const normalized = [];
  for (const item of items) {
    if (item.type === 'offer' || item.offerId || String(item.productId || '').startsWith('offer_')) {
      normalized.push(await normalizeOfferItem(item));
    } else {
      normalized.push(await normalizeProductItem(item));
    }
  }
  return normalized;
}

function inventoryLinesFromItems(items = []) {
  const lines = new Map();
  const addLine = (component, multiplier = 1, source = '') => {
    if (!component.productId) return;
    const quantity = Math.max(1, toNumber(component.quantity, 1)) * Math.max(1, toNumber(multiplier, 1));
    const current = lines.get(component.productId) || {
      productId: component.productId,
      productName: component.productName || component.name || '',
      quantity: 0,
      sources: [],
    };
    current.quantity += quantity;
    if (source) current.sources.push(source);
    lines.set(component.productId, current);
  };

  for (const item of items) {
    if (item.type === 'offer' && item.components?.length) {
      for (const component of item.components) {
        addLine(component, item.quantity, item.name);
      }
    } else {
      addLine(item, item.quantity, item.name);
    }
  }

  return [...lines.values()];
}

async function queueInventoryConsumption(batch, orderId, items, createdBy = null) {
  const lines = inventoryLinesFromItems(items);
  for (const line of lines) {
    const productRef = doc(db, PRODUCTS_COL, line.productId);
    const productDoc = await getDoc(productRef);
    if (!productDoc.exists()) continue;

    const product = productDoc.data();
    const updates = {
      soldCount: toNumber(product.soldCount) + line.quantity,
      updatedAt: serverTimestamp(),
    };

    if (typeof product.stock === 'number') {
      const stock = Math.max(0, product.stock - line.quantity);
      updates.stock = stock;
      updates.isAvailable = stock > 0;
    }

    batch.update(productRef, updates);
    batch.set(doc(collection(db, INVENTORY_COL)), {
      productId: line.productId,
      productName: product.name || line.productName,
      type: 'sale',
      quantity: line.quantity,
      note: line.sources.length ? `طلب #${orderId.slice(-6)} - ${line.sources.join('، ')}` : `طلب #${orderId.slice(-6)}`,
      orderId,
      createdBy,
      createdAt: serverTimestamp(),
    });
  }
}

async function moveOrderToPreparing(orderId, updates = {}, createdBy = null) {
  const orderRef = doc(db, ORDERS_COL, orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error('الطلب غير موجود');

  const order = orderSnap.data();
  const batch = writeBatch(db);
  const data = {
    status: 'preparing',
    routedAt: serverTimestamp(),
    ...updates,
  };

  if (!order.inventoryDeducted) {
    await queueInventoryConsumption(batch, orderId, order.items || [], createdBy);
    data.inventoryDeducted = true;
    data.inventoryDeductedAt = serverTimestamp();
  }

  batch.update(orderRef, data);
  await batch.commit();
}

// إنشاء طلب جديد من زبون (داخل المطعم أو توصيل)
// orderData.orderType: 'table' | 'delivery'
export async function createOrder(orderData) {
  if (!isOpen()) {
    throw new Error(getStatusMessage().message);
  }

  const items = await normalizeOrderItems(orderData.items || []);
  const deliveryFee = toNumber(orderData.deliveryFee, 0);
  const totalPrice = lineTotal(items) + deliveryFee;
  const totalCost = items.reduce((sum, item) => sum + (toNumber(item.costPrice) * Math.max(1, toNumber(item.quantity, 1))), 0);

  const isDelivery = orderData.orderType === 'delivery';
  const orderNumber = await getNextOrderNumber();

  const order = {
    ...orderData,
    items,
    deliveryFee,
    totalPrice,
    isDelivery,
    totalCost,
    profit: totalPrice - totalCost,
    orderNumber,
    status: 'pending',
    paymentMethod: 'cash',
    paidAt: orderData.paymentStatus === 'paid' || orderData.isPaid ? serverTimestamp() : null,
    itemStatuses: {},
    inventoryDeducted: false,
    inventoryDeductedAt: null,
    createdAt: serverTimestamp(),
    acceptedAt: null,
    deliveredAt: null,
    cancelledAt: null,
  };

  const orderRef = await addDoc(collection(db, ORDERS_COL), order);
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
  if (status === 'preparing') {
    await moveOrderToPreparing(orderId);
    return;
  }

  const updates = { status };
  if (status === 'delivered') {
    updates.deliveredAt = serverTimestamp();
  }
  if (status === 'cancelled') {
    updates.cancelledAt = serverTimestamp();
  }
  await updateDoc(doc(db, ORDERS_COL, orderId), updates);
}

export async function updateOrderPaymentStatus(orderId, paid) {
  await updateDoc(doc(db, ORDERS_COL, orderId), {
    paymentStatus: paid ? 'paid' : 'unpaid',
    isPaid: Boolean(paid),
    paidAt: paid ? serverTimestamp() : null,
  });
}

// تأكيد الطلب من قبل الإدارة (تحويله إلى حالة "تحضير")
// destination: 'table' | 'delivery'
export async function confirmOrder(orderId, { destination = 'table', adminUid = null } = {}) {
  await moveOrderToPreparing(orderId, {
    isDelivery: destination === 'delivery',
    routedBy: adminUid,
  }, adminUid);
}

// إنشاء طلب من الإدارة مباشرة (Walk-in) — يبدأ من حالة preparing
export async function createAdminOrder(orderData) {
  const items = await normalizeOrderItems(orderData.items || []);
  const deliveryFee = toNumber(orderData.deliveryFee, 0);
  const totalPrice = lineTotal(items) + deliveryFee;
  const totalCost = items.reduce((sum, item) => sum + (toNumber(item.costPrice) * Math.max(1, toNumber(item.quantity, 1))), 0);
  const orderNumber = await getNextOrderNumber();

  const order = {
    ...orderData,
    items,
    deliveryFee,
    totalPrice,
    totalCost,
    profit: totalPrice - totalCost,
    orderNumber,
    status: 'preparing',
    paymentMethod: orderData.paymentMethod || 'cash',
    paidAt: orderData.paymentStatus === 'paid' || orderData.isPaid ? serverTimestamp() : null,
    createdBy: 'admin',
    itemStatuses: {},
    inventoryDeducted: true,
    inventoryDeductedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    routedAt: serverTimestamp(),
    acceptedAt: null,
    deliveredAt: null,
    cancelledAt: null,
  };

  const orderRef = doc(collection(db, ORDERS_COL));
  const batch = writeBatch(db);
  batch.set(orderRef, order);
  await queueInventoryConsumption(batch, orderRef.id, items, orderData.customerId || 'admin');
  await batch.commit();

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

  await enqueue(batch => batch.set(
    doc(db, COUNTERS_COL, ORDER_NUMBER_DOC),
    { value: 0, updatedAt: serverTimestamp() },
    { merge: true },
  ));

  await commitBatchSafely(batchState);

  return {
    deletedOrders: ordersSnap.size,
    resetProducts: productsSnap.size,
    resetOrderNumber: true,
  };
}

// حذف طلب واحد نهائياً
export async function deleteOrder(orderId) {
  try {
    await deleteDoc(doc(db, ORDERS_COL, orderId));
  } catch (error) {
    console.error('Error deleting order:', error);
    throw new Error('فشل حذف الطلب');
  }
}

// حذف جميع الطلبات الجاهزة (workerReady=true)
export async function deleteReadyOrders() {
  try {
    const snap = await getDocs(
      query(collection(db, ORDERS_COL), where('workerReady', '==', true))
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return snap.size;
  } catch (error) {
    console.error('Error deleting ready orders:', error);
    throw new Error('فشل حذف الطلبات الجاهزة');
  }
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
