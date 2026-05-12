// Firebase Admin initialization for Vercel serverless functions
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  if (getApps().length === 0) {
    let credential;
    const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saRaw) {
      try {
        // Strip BOM (﻿) and surrounding whitespace that PowerShell/Windows tools sometimes inject
        const cleaned = saRaw.replace(/^﻿/, '').trim();
        const serviceAccount = JSON.parse(cleaned);
        // Normalize private key: Vercel often stores it with literal \n
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        credential = cert(serviceAccount);
      } catch (e) {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT غير صالح. تأكد من إلصاق محتوى JSON كاملاً في متغيرات Vercel.'
        );
      }
    } else {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT غير معرّف. أضفه في Vercel → Settings → Environment Variables.'
      );
    }
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'basst-omeeega',
      credential,
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
