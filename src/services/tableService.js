import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, orderBy, serverTimestamp, onSnapshot,
} from 'firebase/firestore';

const TABLES_COL = 'tables';

// جلب كل الطاولات
export async function getAllTables() {
  const q = query(collection(db, TABLES_COL), orderBy('number', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// الاستماع لتحديثات الطاولات في الوقت الحقيقي
export function subscribeToTables(callback) {
  const q = query(collection(db, TABLES_COL), orderBy('number', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const tables = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(tables);
    },
    (error) => {
      console.error('subscribeToTables error:', error);
      callback([]);
    }
  );
}

// إنشاء طاولة جديدة
export async function createTable({ number, capacity = 4, name = '' }) {
  const ref = await addDoc(collection(db, TABLES_COL), {
    number: Number(number),
    capacity: Number(capacity),
    name: name || `طاولة ${number}`,
    status: 'available',
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// تحديث طاولة
export async function updateTable(id, updates) {
  await updateDoc(doc(db, TABLES_COL, id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// حذف طاولة
export async function deleteTable(id) {
  await deleteDoc(doc(db, TABLES_COL, id));
}
