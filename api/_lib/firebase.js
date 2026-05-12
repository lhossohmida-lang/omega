// Firebase admin verification using REST API — no service account needed
import { verifyIdToken, getDoc } from './firebaseRest.js';

export async function verifyAdmin(idToken) {
  try {
    const user = await verifyIdToken(idToken);
    if (!user) return null;

    const userDoc = await getDoc('users', user.localId, idToken);
    if (!userDoc.exists) return null;

    const data = userDoc.data();
    if (data.role !== 'admin') return null;

    return { ...data, uid: user.localId };
  } catch {
    return null;
  }
}
