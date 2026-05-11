import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// تسجيل حساب جديد
export async function registerUser({ email, password, name, phone, role = 'customer' }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // حفظ بيانات المستخدم في Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    phone,
    email,
    role,
    createdAt: serverTimestamp(),
  });

  return user;
}

// تسجيل الدخول
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// تسجيل الخروج
export async function logoutUser() {
  await signOut(auth);
}

// جلب بيانات المستخدم
export async function getUserData(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return { uid, ...userDoc.data() };
  }
  return null;
}
