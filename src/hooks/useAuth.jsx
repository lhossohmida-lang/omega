import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

// المصادقة للإدارة والمطبخ صريحة (email/password).
// الزبون يُسجّل دخول مجهول (anonymous) بصمت ليعمل مع قواعد Firestore الحالية،
// مع إنشاء وثيقة users تلقائياً بدور customer.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = await getDoc(userRef);
          if (!userDoc.exists() && firebaseUser.isAnonymous) {
            // أول زيارة لزبون مجهول — أنشئ وثيقة المستخدم بدور customer
            try {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                name: 'زبون',
                role: 'customer',
                isAnonymous: true,
                createdAt: serverTimestamp(),
              });
              userDoc = await getDoc(userRef);
            } catch (err) {
              console.warn('Failed to create guest user doc:', err);
            }
          }
          if (userDoc.exists()) {
            setUserData({ uid: firebaseUser.uid, ...userDoc.data() });
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
        // لا يوجد مستخدم — سجّل دخول مجهول للزبون (شفاف، بدون شاشة login)
        try {
          await signInAnonymously(auth);
          return; // onAuthStateChanged سيُستدعى مجدداً مع المستخدم المجهول
        } catch (err) {
          console.warn('Anonymous sign-in failed (يجب تفعيله من Firebase Console > Authentication > Anonymous):', err?.code || err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  const value = {
    user,
    userData,
    loading,
    logout,
    isAdmin: userData?.role === 'admin',
    isWorker: userData?.role === 'worker',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
