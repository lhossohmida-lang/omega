import { db, storage } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const OFFERS_COL = 'special_offers';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sortOffers(offers) {
  return [...offers].sort((a, b) => {
    const ap = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 999;
    const bp = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 999;
    if (ap !== bp) return ap - bp;

    const at = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
    const bt = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
    return bt - at;
  });
}

function cleanItems(items = []) {
  return items
    .map(item => {
      const productName = item.productName || item.name || '';
      const unitPrice = toNumber(item.unitPrice ?? item.price, 0);
      return {
        productId: item.productId || '',
        productName,
        name: productName,
        quantity: Math.max(1, toNumber(item.quantity, 1)),
        unitPrice,
        price: unitPrice,
        costPrice: toNumber(item.costPrice, 0),
        image: item.image || '',
        category: item.category || '',
      };
    })
    .filter(item => item.productId && item.quantity > 0);
}

function cleanOfferData(offerData) {
  const items = cleanItems(offerData.items);
  const autoOriginalTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const originalTotalPrice = toNumber(
    offerData.originalTotalPrice ?? offerData.oldPrice,
    autoOriginalTotal
  ) || autoOriginalTotal;
  const offerPrice = toNumber(offerData.offerPrice, 0);
  const discountValue = Math.max(0, originalTotalPrice - offerPrice);
  const discountPercent = originalTotalPrice > 0
    ? Math.round((discountValue / originalTotalPrice) * 100)
    : 0;

  const oldPrice = offerData.oldPrice === '' || offerData.oldPrice === null || offerData.oldPrice === undefined
    ? originalTotalPrice || null
    : toNumber(offerData.oldPrice, 0);

  return {
    title: (offerData.title || '').trim(),
    description: (offerData.description || '').trim(),
    image: (offerData.image || '').trim(),
    oldPrice,
    originalTotalPrice,
    offerPrice,
    discountValue,
    discountPercent,
    items,
    isActive: offerData.isActive !== false,
    isFeatured: offerData.isFeatured === true,
    priority: Math.max(1, toNumber(offerData.priority, 1)),
  };
}

export async function getAllSpecialOffers() {
  const snapshot = await getDocs(collection(db, OFFERS_COL));
  return sortOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getActiveSpecialOffers() {
  const offers = await getAllSpecialOffers();
  return offers.filter(offer => offer.isActive !== false);
}

export async function getSpecialOffer(offerId) {
  const docSnap = await getDoc(doc(db, OFFERS_COL, offerId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

export async function addSpecialOffer(offerData) {
  const data = {
    ...cleanOfferData(offerData),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, OFFERS_COL), data);
  return docRef.id;
}

export async function updateSpecialOffer(offerId, updates) {
  await updateDoc(doc(db, OFFERS_COL, offerId), {
    ...cleanOfferData(updates),
    updatedAt: serverTimestamp(),
  });
}

export async function patchSpecialOffer(offerId, updates) {
  await updateDoc(doc(db, OFFERS_COL, offerId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSpecialOffer(offerId) {
  await deleteDoc(doc(db, OFFERS_COL, offerId));
}

export async function uploadOfferImage(file, adminId) {
  const fileExtension = file.name.split('.').pop();
  const fileName = `special_offers/${Date.now()}_${adminId || 'admin'}.${fileExtension}`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
