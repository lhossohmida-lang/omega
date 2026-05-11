// خدمة الذكاء الاصطناعي - ترسل الطلبات إلى Backend فقط
// لا يتم إرسال مفتاح API من الواجهة أبداً

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

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

export async function sendAIChat(question, adminId) {
  return postAI(
    '/api/admin-ai/chat',
    { question, adminId },
    'خطأ في الاتصال بالذكاء الاصطناعي'
  );
}

// تنفيذ إجراء مقترح من AI بعد تأكيد المدير
export async function executeAIAction(action, adminId) {
  return postAI(
    '/api/admin-ai/execute-action',
    { action, adminId },
    'خطأ في تنفيذ الإجراء'
  );
}
