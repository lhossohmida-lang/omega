// api/admin/seed-images.js
// One-time endpoint: assigns default category image to every product that has no image
import { getDb, verifyAdmin } from '../_lib/firebase.js';

const CATEGORY_IMAGES = {
  burger:     '/burger-classic.png',
  pizza:      '/pizza-pepperoni.png',
  tacos:      '/tacos-wrap.png',
  drinks:     '/drink-cola.png',
  appetizers: '/fried-chicken.png',
  desserts:   '/appetizer-gratin.png',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { adminId, overwrite = false } = req.body || {};
  if (!adminId) return res.status(400).json({ error: 'adminId مطلوب' });

  try {
    const db    = getDb();
    const admin = await verifyAdmin(adminId);
    if (!admin) return res.status(403).json({ error: 'غير مخوّل' });

    const snapshot = await db.collection('products').get();
    const batch    = db.batch();
    const results  = [];

    snapshot.docs.forEach(doc => {
      const data  = doc.data();
      const img   = CATEGORY_IMAGES[data.category];
      if (!img) return;
      // skip if already has a real image (http/https URL) and overwrite is false
      if (!overwrite && data.image && data.image.startsWith('http')) return;
      batch.update(doc.ref, { image: img });
      results.push({ id: doc.id, name: data.name, category: data.category, image: img });
    });

    await batch.commit();
    return res.status(200).json({ updated: results.length, products: results });
  } catch (err) {
    console.error('seed-images error:', err);
    return res.status(500).json({ error: err.message });
  }
}
