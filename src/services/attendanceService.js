import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  limit
} from 'firebase/firestore';

// 1. جلب الجلسة النشطة الحالية للعامل (إن وجدت)
export async function getActiveSession(uid) {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', uid),
      where('status', 'in', ['active', 'break']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docVal = snap.docs[0];
      return { id: docVal.id, ...docVal.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}

// 2. تسجيل دخول العامل للدوام (Check-in)
export async function checkInWorker(uid, name, fallbackRate) {
  try {
    const active = await getActiveSession(uid);
    if (active) return active; // العامل لديه جلسة نشطة بالفعل

    // جلب سعر الساعة الأحدث من وثيقة الموظف في Firestore لضمان الدقة
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const latestRate = userSnap.exists() ? (Number(userSnap.data().hourlyRate) || 0) : (Number(fallbackRate) || 0);

    const docRef = await addDoc(collection(db, 'attendance'), {
      uid,
      name,
      checkIn: new Date(), // نستخدم التاريخ المحلي للتسجيل الدقيق للوقت
      checkOut: null,
      breaks: [],
      status: 'active',
      hourlyRate: latestRate,
      totalHours: 0,
      totalPay: 0,
      createdAt: serverTimestamp(),
    });

    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() };
  } catch (error) {
    console.error('Error during check-in:', error);
    throw new Error('فشل تسجيل الدخول للعمل');
  }
}

// 3. خروج مؤقت في منتصف العمل (Go on break)
export async function goOnBreak(sessionId, currentBreaks = []) {
  try {
    const docRef = doc(db, 'attendance', sessionId);
    const updatedBreaks = [
      ...currentBreaks,
      { out: new Date().toISOString(), in: null }
    ];

    await updateDoc(docRef, {
      status: 'break',
      breaks: updatedBreaks,
    });
  } catch (error) {
    console.error('Error going on break:', error);
    throw new Error('فشل تسجيل المغادرة المؤقتة');
  }
}

// 4. عودة الدخول بعد الخروج المؤقت (Return from break)
export async function returnFromBreak(sessionId, currentBreaks = []) {
  try {
    const docRef = doc(db, 'attendance', sessionId);
    const updatedBreaks = [...currentBreaks];
    if (updatedBreaks.length > 0) {
      const lastIndex = updatedBreaks.length - 1;
      updatedBreaks[lastIndex] = {
        ...updatedBreaks[lastIndex],
        in: new Date().toISOString(),
      };
    }

    await updateDoc(docRef, {
      status: 'active',
      breaks: updatedBreaks,
    });
  } catch (error) {
    console.error('Error returning from break:', error);
    throw new Error('فشل تسجيل عودة الدخول');
  }
}

// 5. تسجيل الخروج النهائي والانتهاء (Check-out)
export async function checkOutWorker(sessionId, currentSession, fallbackRate) {
  try {
    const docRef = doc(db, 'attendance', sessionId);
    const checkOutTime = new Date();
    
    // جلب سعر الساعة الأحدث من وثيقة المستخدم لضمان الدقة الكاملة
    const userRef = doc(db, 'users', currentSession.uid);
    const userSnap = await getDoc(userRef);
    const latestRate = userSnap.exists() ? (Number(userSnap.data().hourlyRate) || 0) : (Number(fallbackRate) || Number(currentSession.hourlyRate) || 0);

    // إغلاق أي استراحة مفتوحة إن وجدت
    const updatedBreaks = (currentSession.breaks || []).map((b) => {
      if (!b.in) {
        return { ...b, in: checkOutTime.toISOString() };
      }
      return b;
    });

    // حساب المدة الإجمالية بالملي ثانية
    const checkInMs = currentSession.checkIn?.seconds 
      ? currentSession.checkIn.seconds * 1000 
      : new Date(currentSession.checkIn).getTime();
    
    const checkOutMs = checkOutTime.getTime();
    const totalDurationMs = checkOutMs - checkInMs;

    // حساب فترات الاستراحة بالملي ثانية
    let totalBreakMs = 0;
    updatedBreaks.forEach((b) => {
      const outMs = new Date(b.out).getTime();
      const inMs = b.in ? new Date(b.in).getTime() : checkOutMs;
      totalBreakMs += (inMs - outMs);
    });

    // صافي وقت العمل بالملي ثانية
    const netWorkMs = Math.max(0, totalDurationMs - totalBreakMs);

    // تحويل الساعات إلى رقم عشري
    const totalHours = Number((netWorkMs / (1000 * 60 * 60)).toFixed(2));
    const totalPay = Number((totalHours * latestRate).toFixed(2));

    await updateDoc(docRef, {
      checkOut: checkOutTime,
      breaks: updatedBreaks,
      status: 'completed',
      totalHours,
      totalPay,
      hourlyRate: latestRate,
    });

    return { totalHours, totalPay, hourlyRate: latestRate };
  } catch (error) {
    console.error('Error during check-out:', error);
    throw new Error('فشل تسجيل الخروج من العمل');
  }
}

// 6. جلب جلسات الدوام لعامل معين
export async function getWorkerSessions(uid) {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docVal) => ({ id: docVal.id, ...docVal.data() }));
  } catch (error) {
    console.error('Error getting worker sessions:', error);
    return [];
  }
}

// 7. جلب كافة جلسات الدوام لجميع العمال (للإدارة)
export async function getAllSessions() {
  try {
    const q = query(
      collection(db, 'attendance'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docVal) => ({ id: docVal.id, ...docVal.data() }));
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}

// 8. جلب قائمة جميع العمال المسجلين
export async function getAllWorkers() {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'worker')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docVal) => ({ id: docVal.id, ...docVal.data() }));
  } catch (error) {
    console.error('Error getting all workers:', error);
    return [];
  }
}

// 9. تعديل سعر الساعة للعامل من طرف المدير
export async function updateWorkerHourlyRate(uid, hourlyRate) {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      hourlyRate: Number(hourlyRate) || 0,
    });
  } catch (error) {
    console.error('Error updating worker hourly rate:', error);
    throw new Error('فشل تحديث سعر الساعة');
  }
}

// 10. إضافة عامل جديد دون الحاجة لبريد إلكتروني أو كلمة مرور
export async function registerNewWorker({ name, phone, hourlyRate }) {
  try {
    const docRef = await addDoc(collection(db, 'users'), {
      name,
      phone: phone || '',
      role: 'worker',
      hourlyRate: Number(hourlyRate) || 0,
      createdAt: serverTimestamp(),
    });

    // تحديث المعرف الفريد داخل الوثيقة للمطابقة الكاملة
    await updateDoc(docRef, {
      uid: docRef.id
    });

    return { uid: docRef.id, name, phone, role: 'worker', hourlyRate: Number(hourlyRate) || 0 };
  } catch (error) {
    console.error('Error registering new worker:', error);
    throw new Error('فشل تسجيل الموظف الجديد');
  }
}

// 11. حذف سجل حضور (وردية) واحد
export async function deleteSession(sessionId) {
  try {
    await deleteDoc(doc(db, 'attendance', sessionId));
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error('فشل حذف سجل الحضور');
  }
}

// 12. تسجيل سحب مبلغ من راتب عامل
export async function addWithdrawal(uid, workerName, amount, note = '') {
  try {
    const docRef = await addDoc(collection(db, 'wage_withdrawals'), {
      uid,
      name: workerName,
      amount: Number(amount),
      note: note || '',
      date: new Date(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding withdrawal:', error);
    throw new Error('فشل تسجيل السحب');
  }
}

// 13. جلب جميع سحوبات الرواتب
export async function getAllWithdrawals() {
  try {
    const q = query(collection(db, 'wage_withdrawals'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting withdrawals:', error);
    return [];
  }
}

// 14. حذف سحب راتب واحد
export async function deleteWithdrawal(withdrawalId) {
  try {
    await deleteDoc(doc(db, 'wage_withdrawals', withdrawalId));
  } catch (error) {
    console.error('Error deleting withdrawal:', error);
    throw new Error('فشل حذف السحب');
  }
}

// 15. تسجيل وردية عمل يدوية كاملة لعامل معين
export async function registerManualSession({ uid, name, checkIn, checkOut, hourlyRate }) {
  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const totalDurationMs = checkOutDate.getTime() - checkInDate.getTime();
    
    if (totalDurationMs <= 0) {
      throw new Error('وقت الخروج يجب أن يكون بعد وقت الدخول');
    }

    const totalHours = Number((totalDurationMs / (1000 * 60 * 60)).toFixed(2));
    const totalPay = Number((totalHours * Number(hourlyRate)).toFixed(2));

    const docRef = await addDoc(collection(db, 'attendance'), {
      uid,
      name,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      breaks: [],
      status: 'completed',
      hourlyRate: Number(hourlyRate) || 0,
      totalHours,
      totalPay,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error registering manual session:', error);
    throw new Error(error.message || 'فشل تسجيل الوردية اليدوية');
  }
}
