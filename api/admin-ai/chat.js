// POST /api/admin-ai/chat - Vercel serverless function (SSE streaming)
import { addDoc, getDoc, verifyAdminToken } from '../_lib/firebaseRest.js';
import { gatherFullDataSummary, SYSTEM_PROMPT } from '../_lib/aiData.js';

export default async function handler(req, res) {
  res.setHeader('X-Omega-AI-Route', 'token-rest-2026-05-13');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const sendJsonError = (status, message) => res.status(status).json({ message });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { question, adminId, idToken } = body;
    if (!question || !adminId || !idToken) {
      return sendJsonError(400, 'يرجى إرسال السؤال ومعرف المدير');
    }

    const adminData = await verifyAdminToken(idToken, adminId);
    if (!adminData) return sendJsonError(403, 'غير مصرح لك باستخدام هذه الخدمة');

    const settingsDoc = await getDoc('ai_settings', 'config', idToken);
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    if (settings.isEnabled === false) {
      return sendJsonError(403, 'الذكاء الاصطناعي معطل حالياً');
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      return sendJsonError(500, 'مفتاح OpenRouter غير مُعد على السيرفر');
    }

    const dataSummary = await gatherFullDataSummary(idToken);

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tarken-restaurant.app',
        'X-OpenRouter-Title': 'Tarken Restaurant App',
      },
      body: JSON.stringify({
        model: settings.model || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `سؤال المدير ${adminData.name || ''}: ${question}\n\n${dataSummary}` },
        ],
        temperature: settings.temperature ?? 0.3,
        max_tokens: settings.maxTokens || 1500,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      let errMsg = 'غير معروف';
      try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch { /* ignore */ }
      return sendJsonError(500, 'خطأ من OpenRouter: ' + errMsg);
    }

    // Switch to SSE
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event, payload) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    let fullAnswer = '';
    let totalTokens = 0;
    const decoder = new TextDecoder();
    let buffer = '';
    const reader = upstream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullAnswer += delta;
              send('delta', { content: delta });
            }
            if (json.usage?.total_tokens) totalTokens = json.usage.total_tokens;
          } catch { /* skip parse errors on partial chunks */ }
        }
      }
    } catch (streamErr) {
      send('error', { message: 'انقطع البث: ' + streamErr.message });
    }

    // Extract suggestedActions
    let suggestedActions = [];
    try {
      const m = fullAnswer.match(/suggestedActions:\s*(\[[\s\S]*?\])/);
      if (m) suggestedActions = JSON.parse(m[1]);
    } catch { /* ignore */ }

    // Log to Firebase (non-blocking for client)
    try {
      await addDoc('ai_logs', {
        adminId,
        adminName: adminData.name,
        question,
        answer: fullAnswer,
        suggestedActions,
        tokensUsed: totalTokens,
        createdAt: new Date(),
      }, idToken);
    } catch (logErr) {
      console.error('AI log error:', logErr);
    }

    send('done', { suggestedActions, tokensUsed: totalTokens });
    res.end();
  } catch (error) {
    console.error('AI Chat Error:', error);
    if (!res.headersSent) {
      return sendJsonError(500, 'حدث خطأ في معالجة الطلب: ' + error.message);
    }
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    } catch { /* ignore */ }
  }
}
