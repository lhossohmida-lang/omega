// خدمة الذكاء الاصطناعي — ترسل Firebase ID token للتحقق من الهوية على السيرفر
import { auth } from '../firebase.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

async function getIdToken() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('يجب تسجيل الدخول أولاً');
  return token;
}

async function postAI(path, body, fallbackMessage) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('تعذر الاتصال بخادم الذكاء. تأكد من تشغيل السيرفر الخلفي بالأمر npm run server.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  if (!data) {
    throw new Error('لم يصل الطلب إلى خادم الذكاء. تأكد من إعداد proxy أو VITE_API_BASE_URL.');
  }

  return data;
}

export async function sendAIChat(question) {
  const idToken = await getIdToken();
  return postAI(
    '/api/admin-ai/chat',
    { question, idToken },
    'خطأ في الاتصال بالذكاء الاصطناعي'
  );
}

export async function executeAIAction(action) {
  const idToken = await getIdToken();
  return postAI(
    '/api/admin-ai/execute-action',
    { action, idToken },
    'خطأ في تنفيذ الإجراء'
  );
}
