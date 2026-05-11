// POST /api/admin-ai/chat - Vercel serverless function
import { getDb, verifyAdmin } from '../_lib/firebase.js';
import { gatherFullDataSummary, SYSTEM_PROMPT } from '../_lib/aiData.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { question, adminId } = req.body || {};
    if (!question || !adminId) {
      return res.status(400).json({ message: 'يرجى إرسال السؤال ومعرف المدير' });
    }

    const adminData = await verifyAdmin(adminId);
    if (!adminData) {
      return res.status(403).json({ message: 'غير مصرح لك باستخدام هذه الخدمة' });
    }

    const db = getDb();
    const settingsDoc = await db.collection('ai_settings').doc('config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    if (settings.isEnabled === false) {
      return res.status(403).json({ message: 'الذكاء الاصطناعي معطل حالياً' });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      return res.status(500).json({ message: 'مفتاح OpenRouter غير مُعد على السيرفر' });
    }

    const dataSummary = await gatherFullDataSummary();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tarken-restaurant.app',
        'X-OpenRouter-Title': 'Tarken Restaurant App',
      },
      body: JSON.stringify({
        model: settings.model || 'inclusionai/ring-2.6-1t:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `سؤال المدير ${adminData.name || ''}: ${question}\n\n${dataSummary}` },
        ],
        temperature: settings.temperature ?? 0.3,
        max_tokens: settings.maxTokens || 1500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return res.status(500).json({ message: 'خطأ من OpenRouter: ' + (data.error?.message || 'غير معروف') });
    }

    const aiResponse = data.choices?.[0]?.message?.content || 'لا يوجد رد';
    const tokensUsed = data.usage?.total_tokens || 0;

    // استخراج suggestedActions
    let suggestedActions = [];
    try {
      const m = aiResponse.match(/suggestedActions:\s*(\[[\s\S]*?\])/);
      if (m) suggestedActions = JSON.parse(m[1]);
    } catch { /* ignore */ }

    // تسجيل
    await db.collection('ai_logs').add({
      adminId,
      adminName: adminData.name,
      question,
      answer: aiResponse,
      suggestedActions,
      tokensUsed,
      createdAt: new Date(),
    });

    return res.status(200).json({ answer: aiResponse, suggestedActions, tokensUsed });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ message: 'حدث خطأ في معالجة الطلب: ' + error.message });
  }
}
