// Firebase Admin initialization for Vercel serverless functions.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;

function parseServiceAccount(raw) {
  const cleaned = raw.replace(/^\uFEFF/, '').trim();
  const candidates = [cleaned];

  try {
    const maybeString = JSON.parse(cleaned);
    if (typeof maybeString === 'string') candidates.push(maybeString.trim());
  } catch {
    // Continue with raw/base64 candidates.
  }

  try {
    candidates.push(Buffer.from(cleaned, 'base64').toString('utf8').trim());
  } catch {
    // Continue with JSON candidates.
  }

  for (const candidate of candidates) {
    try {
      const serviceAccount = JSON.parse(candidate);
      if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      return serviceAccount;
    } catch {
      // Try the next supported representation.
    }
  }

  throw new Error('Invalid Firebase service account JSON');
}

export function getDb() {
  if (dbInstance) return dbInstance;

  if (getApps().length === 0) {
    const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saRaw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is missing in Vercel environment variables.');
    }

    let credential;
    try {
      credential = cert(parseServiceAccount(saRaw));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON/base64 service-account content.');
    }

    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'basst-omeeega',
      credential,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'basst-omeeega.firebasestorage.app',
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
