// api/admin/upload-image.js
// Uploads a product image via Firebase Admin SDK (bypasses Storage Security Rules)
import { getStorage } from 'firebase-admin/storage';
import { getDb, verifyAdmin } from '../_lib/firebase.js';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { adminId, fileBase64, contentType, fileName } = req.body || {};

  if (!adminId || !fileBase64) {
    return res.status(400).json({ error: 'adminId و fileBase64 مطلوبان' });
  }

  try {
    // تحقق من صلاحيات المشرف
    getDb(); // ensures Firebase Admin is initialised
    const admin = await verifyAdmin(adminId);
    if (!admin) return res.status(403).json({ error: 'غير مخوّل' });

    // فك تشفير base64
    const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // اسم الملف
    const ext = (fileName || 'image.jpg').split('.').pop().toLowerCase() || 'jpg';
    const filePath = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: { contentType: contentType || 'image/jpeg' },
    });

    // اجعل الملف عاماً
    await file.makePublic();

    const bucketName = bucket.name;
    const url = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    return res.status(200).json({ url });
  } catch (error) {
    console.error('upload-image error:', error);
    return res.status(500).json({ error: error.message || 'فشل رفع الصورة' });
  }
}
