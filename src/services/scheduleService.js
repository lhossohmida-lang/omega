import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

const COLLECTION = 'work_schedule_plans';

// جلب كافة خطط الورديات المحفوظة
export async function getAllSchedulePlans() {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching schedule plans:', error);
    return [];
  }
}

// حفظ/تحديث خطة وردية عامل (upsert)
// days: { '0': [{start:'08:00', end:'16:00', label:'صباحي'}], '1': [...], ... }
export async function saveWorkerSchedule(uid, name, days) {
  try {
    const ref = doc(db, COLLECTION, uid);
    await setDoc(ref, { uid, name, days }, { merge: true });
  } catch (error) {
    console.error('Error saving worker schedule:', error);
    throw new Error('فشل حفظ جدول الوردية');
  }
}

// حذف خطة عامل بالكامل
export async function deleteWorkerSchedule(uid) {
  try {
    await deleteDoc(doc(db, COLLECTION, uid));
  } catch (error) {
    console.error('Error deleting worker schedule:', error);
    throw new Error('فشل حذف الجدول');
  }
}
