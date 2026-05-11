// خدمة الذكاء الاصطناعي - ترسل الطلبات إلى Backend فقط
// لا يتم إرسال مفتاح API من الواجهة أبداً

export async function sendAIChat(question, adminId) {
  const response = await fetch('/api/admin-ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, adminId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'خطأ في الاتصال' }));
    throw new Error(error.message || 'خطأ في الاتصال بالذكاء الاصطناعي');
  }

  return response.json();
}

// تنفيذ إجراء مقترح من AI بعد تأكيد المدير
export async function executeAIAction(action, adminId) {
  const response = await fetch('/api/admin-ai/execute-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, adminId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'خطأ في تنفيذ الإجراء' }));
    throw new Error(error.message || 'خطأ في تنفيذ الإجراء');
  }

  return response.json();
}
