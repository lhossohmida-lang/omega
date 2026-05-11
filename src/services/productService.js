import { db, storage } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const PRODUCTS_COL = 'products';

// جلب جميع المنتجات
export async function getAllProducts() {
  const q = query(collection(db, PRODUCTS_COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// جلب المنتجات حسب الفئة
export async function getProductsByCategory(category) {
  const q = query(
    collection(db, PRODUCTS_COL),
    where('category', '==', category),
    where('isAvailable', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// جلب المنتجات المتوفرة فقط
export async function getAvailableProducts() {
  const q = query(
    collection(db, PRODUCTS_COL),
    where('isAvailable', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// جلب منتج واحد
export async function getProduct(productId) {
  const docRef = doc(db, PRODUCTS_COL, productId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

// إضافة منتج جديد
export async function addProduct(productData) {
  const data = {
    ...productData,
    isAvailable: productData.stock > 0 ? (productData.isAvailable !== false) : false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, PRODUCTS_COL), data);
  return docRef.id;
}

// تعديل منتج
export async function updateProduct(productId, updates) {
  const docRef = doc(db, PRODUCTS_COL, productId);
  await updateDoc(docRef, {
    ...updates,
    // عند stock = 0 اجعل المنتج غير متوفر تلقائياً
    ...(updates.stock !== undefined && updates.stock <= 0 ? { isAvailable: false } : {}),
    updatedAt: serverTimestamp(),
  });
}

// حذف منتج
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, PRODUCTS_COL, productId));
}

// رفع صورة منتج
export async function uploadProductImage(file, productId) {
  const storageRef = ref(storage, `products/${productId}_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

// جلب المنتجات منخفضة المخزون
export async function getLowStockProducts(threshold = 5) {
  const q = query(collection(db, PRODUCTS_COL), where('stock', '<=', threshold));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
