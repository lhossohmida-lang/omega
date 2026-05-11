// Firebase Admin initialization for Vercel serverless functions
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  if (getApps().length === 0) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = cert(serviceAccount);
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
      }
    }
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'basst-omeeega',
      ...(credential ? { credential } : {}),
    });
  }
  dbInstance = getFirestore();
  return dbInstance;
}

export async function verifyAdmin(adminId) {
  const db = getDb();
  const userDoc = await db.collection('users').doc(adminId).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    return null;
  }
  return userDoc.data();
}
