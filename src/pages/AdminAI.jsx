import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sendAIChat, executeAIAction } from '../services/aiService';
import AdminNav from '../components/AdminNav';
import { IoSend, IoSparkles, IoCopy, IoCheckmark, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

const quickActions = [
  { label: 'تحليل مبيعات اليوم', emoji: '📊', prompt: 'حلل مبيعات اليوم واعطني ملخصاً' },
  { label: 'تحليل الأرباح', emoji: '💰', prompt: 'حلل أرباح المطعم واعطني تقريراً' },
  { label: 'المنتجات الناقصة', emoji: '📦', prompt: 'ما هي المنتجات التي مخزونها منخفض أو ناقص؟' },
  { label: 'الطلبات المتأخرة', emoji: '⏰', prompt: 'هل توجد طلبات متأخرة أو معلقة لفترة طويلة؟' },
  { label: 'أداء السائقين', emoji: '🚗', prompt: 'حلل أداء السائقين واعطني إحصائيات' },
  { label: 'اقتراح عروض', emoji: '🎯', prompt: 'اقترح لي عروضاً وترويجات للمطعم' },
  { label: 'تقرير أسبوعي', emoji: '📋', prompt: 'أعطني تقريراً أسبوعياً شاملاً عن المطعم' },
  { label: 'منشور إعلاني', emoji: '📝', prompt: 'اكتب لي منشوراً إعلانياً جذاباً للمطعم على وسائل التواصل' },
];

export default function AdminAI() {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    if (!userData?.uid) {
      toast.error('تعذر التعرف على حساب المدير. أعد تسجيل الدخول.');
      return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const response = await sendAIChat(question);
      const aiMessage = {
        role: 'ai',
        content: response.answer || response.message || 'لا يوجد رد',
        suggestedActions: response.suggestedActions || [],
        tokensUsed: response.tokensUsed,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `❌ ${error.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action) => {
    try {
      toast.loading('جاري تنفيذ الإجراء...');
      await executeAIAction(action);
      toast.dismiss();
      toast.success('تم تنفيذ الإجراء بنجاح');
    } catch (error) {
      toast.dismiss();
      toast.error(error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  return (
    <div className="flex h-[100dvh] min-h-[100svh] flex-col overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <AdminNav />
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingBottom: 'calc(11.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Header */}
        <div className="relative border-b border-white/8 px-4 py-4 pt-16" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-omega-orange via-omega-orange-dark to-omega-red flex items-center justify-center shadow-lg shadow-omega-orange/30 animate-glow">
              <IoSparkles className="text-white" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-black text-lg flex items-center gap-2">
                مساعد OMEGA الذكي
                <span className="badge bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-blink" /> متصل
                </span>
              </h1>
              <p className="text-omega-text-dim text-[11px]" dir="ltr">inclusionai/ring-2.6-1t:free</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <div className="text-6xl animate-float">🤖</div>
                  <div className="absolute inset-0 bg-omega-orange/20 blur-3xl rounded-full" />
                </div>
                <h3 className="text-white font-black text-xl mb-2">مرحباً بك!</h3>
                <p className="text-omega-text-muted text-sm mb-6 max-w-md mx-auto">
                  أنا مساعدك الذكي لإدارة مطعم OMEGA. اختر سؤالاً سريعاً أو اكتب ما تريد.
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 stagger">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action.prompt)}
                      className="card-premium p-3 hover:border-omega-orange/30 text-right transition-all group"
                    >
                      <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{action.emoji}</div>
                      <p className="text-white text-[11px] font-bold leading-tight">{action.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                <div className={`max-w-[88%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-omega-orange/20 to-omega-orange/5 border border-omega-orange/15 text-white'
                    : msg.error
                      ? 'bg-omega-red/10 border border-omega-red/20 text-omega-red'
                      : 'card-premium text-omega-text'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>

                  {msg.role === 'ai' && !msg.error && (
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
                      <button onClick={() => copyToClipboard(msg.content)}
                        className="flex items-center gap-1 text-omega-text-muted text-xs hover:text-omega-orange transition-colors">
                        <IoCopy size={12} /> نسخ
                      </button>
                      {msg.tokensUsed && (
                        <span className="text-omega-text-dim text-[10px]">🔤 {msg.tokensUsed} توكن</span>
                      )}
                    </div>
                  )}

                  {msg.suggestedActions?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-omega-text-muted text-xs font-bold flex items-center gap-1">
                        <IoSparkles size={12} className="text-omega-orange" /> إجراءات مقترحة
                      </p>
                      {msg.suggestedActions.map((action, j) => (
                        <div key={j} className="bg-omega-dark/40 border border-white/5 rounded-xl p-3">
                          <p className="text-white text-xs mb-2">{action.description || JSON.stringify(action)}</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleExecuteAction(action)}
                              className="flex-1 py-2 rounded-lg bg-omega-orange/20 text-omega-orange text-xs font-bold hover:bg-omega-orange/30 transition-colors flex items-center justify-center gap-1">
                              <IoCheckmark size={14} /> تأكيد التنفيذ
                            </button>
                            <button className="px-3 py-2 rounded-lg bg-omega-red/10 text-omega-red text-xs hover:bg-omega-red/20 transition-colors">
                              <IoClose size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end animate-fade-in">
                <div className="card-premium p-4 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-omega-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-omega-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-omega-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-omega-text-muted text-xs">يفكر...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick suggestions chip row */}
        {messages.length > 0 && (
          <div className="px-4 lg:px-8 pb-2">
            <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
              {quickActions.slice(0, 5).map((action, i) => (
                <button key={i} onClick={() => sendMessage(action.prompt)} disabled={loading}
                  className="chip disabled:opacity-50 flex-shrink-0">
                  <span>{action.emoji}</span> {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className="fixed inset-x-0 z-30 border-t border-white/8 px-4 py-3 lg:px-8 bg-gradient-to-t from-omega-black via-omega-black to-omega-dark"
          style={{ bottom: 'calc(6.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="اسأل المساعد الذكي..."
              disabled={loading}
              className="input-modern flex-1 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-omega-orange via-omega-orange-dark to-omega-red text-white flex items-center justify-center shadow-lg shadow-omega-orange/30 hover:shadow-omega-orange/50 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
            >
              <IoSend size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

