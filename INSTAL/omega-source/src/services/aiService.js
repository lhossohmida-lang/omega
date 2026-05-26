// خدمة الذكاء الاصطناعي - ترسل الطلبات إلى Backend فقط
// لا يتم إرسال مفتاح API من الواجهة أبداً

import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

async function getCurrentIdToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('يجب تسجيل الدخول قبل استخدام الذكاء الاصطناعي.');
  }
  return user.getIdToken();
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

// streaming chat — يبثّ النص حرفاً حرفاً عبر SSE
export async function streamAIChat(question, adminId, handlers = {}) {
  const { onDelta, onDone, onError } = handlers;
  const idToken = await getCurrentIdToken();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/admin-ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ question, adminId, idToken }),
    });
  } catch {
    throw new Error('تعذر الاتصال بخادم الذكاء. تأكد من تشغيل السيرفر الخلفي.');
  }

  const ct = response.headers.get('content-type') || '';

  // لو رجع JSON (خطأ قبل البدء بالبث)
  if (!response.ok || !ct.includes('text/event-stream')) {
    const data = ct.includes('application/json')
      ? await response.json().catch(() => null)
      : null;
    throw new Error(data?.message || 'خطأ في الاتصال بالذكاء الاصطناعي');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload = { suggestedActions: [], tokensUsed: 0 };

  const parseEventBlock = (block) => {
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    return { event, data };
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!block.trim()) continue;

      const { event, data } = parseEventBlock(block);
      if (!data) continue;
      let payload;
      try { payload = JSON.parse(data); } catch { continue; }

      if (event === 'delta' && payload.content) {
        onDelta?.(payload.content);
      } else if (event === 'done') {
        finalPayload = { ...finalPayload, ...payload };
        onDone?.(finalPayload);
      } else if (event === 'error') {
        onError?.(payload.message || 'خطأ في البث');
      }
    }
  }

  return finalPayload;
}

export async function sendAIChat(question, adminId) {
  const idToken = await getCurrentIdToken();
  return postAI(
    '/api/admin-ai/chat',
    { question, adminId, idToken },
    'خطأ في الاتصال بالذكاء الاصطناعي'
  );
}

export async function executeAIAction(action, adminId) {
  const idToken = await getCurrentIdToken();
  return postAI(
    '/api/admin-ai/execute-action',
    { action, adminId, idToken },
    'خطأ في تنفيذ الإجراء'
  );
}
