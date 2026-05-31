function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

function normalizeProviderApproval(providerData = {}) {
  const status = String(
    providerData.status ||
    providerData.paymentStatus ||
    providerData.result ||
    ''
  ).toLowerCase();

  return providerData.approved === true ||
    providerData.success === true ||
    ['approved', 'success', 'paid', 'captured', 'authorized'].includes(status);
}

export async function tpeChargeHandler(req, res) {
  if (req.method && req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  const body = await readJsonBody(req);
  const amount = Number(body.amount || 0);
  const currency = body.currency || 'DZD';
  const reference = body.reference || `omega-${Date.now()}`;

  if (!Number.isFinite(amount) || amount <= 0) {
    return sendJson(res, 400, {
      ok: false,
      code: 'INVALID_AMOUNT',
      message: 'مبلغ الدفع غير صالح.',
    });
  }

  const chargeUrl = process.env.TPE_CHARGE_URL;
  if (!chargeUrl) {
    return sendJson(res, 503, {
      ok: false,
      code: 'TPE_NOT_CONFIGURED',
      message: 'جهاز الدفع الحقيقي غير مهيأ بعد. أضف TPE_CHARGE_URL في إعدادات السيرفر لربط الكيوسك بجهاز TPE أو بوابة الدفع.',
    });
  }

  try {
    const providerResponse = await fetch(chargeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.TPE_API_KEY ? { Authorization: `Bearer ${process.env.TPE_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        amount,
        currency,
        reference,
        description: 'OMEGA kiosk card payment',
        items: body.items || [],
        metadata: body.metadata || {},
      }),
    });

    const providerData = await providerResponse.json().catch(() => ({}));
    const approved = providerResponse.ok && normalizeProviderApproval(providerData);

    if (!approved) {
      return sendJson(res, providerResponse.ok ? 402 : providerResponse.status || 502, {
        ok: false,
        code: providerData.code || 'PAYMENT_DECLINED',
        message: providerData.message || 'رفض جهاز الدفع أو البنك العملية.',
        providerData,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      approved: true,
      provider: providerData.provider || 'tpe',
      amount,
      currency,
      reference,
      transactionId: providerData.transactionId || providerData.id || providerData.paymentId || reference,
      authorizationCode: providerData.authorizationCode || providerData.authCode || '',
      receipt: providerData.receipt || null,
      providerData,
    });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      code: 'TPE_CONNECTION_FAILED',
      message: 'تعذر الاتصال بجهاز الدفع أو بوابة الدفع.',
      detail: error.message,
    });
  }
}

export default tpeChargeHandler;
