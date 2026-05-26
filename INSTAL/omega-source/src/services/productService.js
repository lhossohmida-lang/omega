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
    isAvailable: productData.isAvailable !== false,
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
    updatedAt: serverTimestamp(),
  });
}

// حذف منتج
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, PRODUCTS_COL, productId));
}

// رفع صورة منتج مباشرة إلى Firebase Storage
export async function uploadProductImage(file, adminId) {
  const fileExtension = file.name.split('.').pop();
  const fileName = `products/${Date.now()}_${adminId}.${fileExtension}`;
  const storageRef = ref(storage, fileName);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// جلب المنتجات منخفضة المخزون
export async function getLowStockProducts(threshold = 5) {
  const q = query(collection(db, PRODUCTS_COL), where('stock', '<=', threshold));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
