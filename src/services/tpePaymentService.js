export async function chargeTpePayment({ amount, currency = 'DZD', reference, items = [], metadata = {} }) {
  const response = await fetch('/api/payments/tpe/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Number(amount || 0),
      currency,
      reference,
      items,
      metadata,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || 'تعذر تأكيد الدفع عبر جهاز البطاقة.');
    error.status = response.status;
    error.code = data.code;
    error.details = data;
    throw error;
  }

  return data;
}
