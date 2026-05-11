import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sendAIChat, executeAIAction } from '../services/aiService';
import AdminNav from '../components/AdminNav';
import { IoSend, IoSparkles, IoCopy, IoCheckmark, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

const quickActions = [
  { label: '📊 تحليل مبيعات اليوم', prompt: 'حلل مبيعات اليوم واعطني ملخصاً' },
  { label: '💰 تحليل الأرباح', prompt: 'حلل أرباح المطعم واعطني تقريراً' },
  { label: '📦 المنتجات الناقصة', prompt: 'ما هي المنتجات التي مخزونها منخفض أو ناقص؟' },
  { label: '⏰ الطلبات المتأخرة', prompt: 'هل توجد طلبات متأخرة أو معلقة لفترة طويلة؟' },
  { label: '🚗 أداء السائقين', prompt: 'حلل أداء السائقين واعطني إحصائيات' },
  { label: '🎯 اقتراح عروض', prompt: 'اقترح لي عروضاً وترويجات للمطعم' },
  { label: '📋 تقرير أسبوعي', prompt: 'أعطني تقريراً أسبوعياً شاملاً عن المطعم' },
  { label: '📝 منشور إعلاني', prompt: 'اكتب لي منشوراً إعلانياً جذاباً للمطعم على وسائل التواصل' },
];

export default function AdminAI() {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (text) => {
    const question = text || input;
    if (!question.trim()) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const response = await sendAIChat(question, userData.uid);
      
      const aiMessage = {
        role: 'ai',
        content: response.answer || response.message || 'لا يوجد رد',
        suggestedActions: response.suggestedActions || [],
        tokensUsed: response.tokensUsed,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.suggestedActions?.length > 0) {
        setPendingActions(response.suggestedActions);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `❌ ${error.message}`, error: true }]);
    }
    setLoading(false);
  };

  const handleExecuteAction = async (action) => {
    try {
      toast.loading('جاري تنفيذ الإجراء...');
      await executeAIAction(action, userData.uid);
      toast.dismiss();
      toast.success('تم تنفيذ الإجراء بنجاح');
      setPendingActions(prev => prev.filter(a => a !== action));
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
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="glass border-b border-white/10 px-4 py-3 pt-16 lg:pt-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center">
              <IoSparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-white font-bold">مساعد OMEGA الذكي</h1>
              <p className="text-omega-text-muted text-[11px]">inclusionai/ring-2.6-1t:free</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 animate-fade-in">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-white font-bold mb-2">مرحباً بك!</h3>
                <p className="text-omega-text-muted text-sm mb-6">أنا مساعدك الذكي لإدارة مطعم OMEGA. اسألني أي شيء!</p>
                
                {/* الأزرار السريعة */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action.prompt)}
                      className="px-3 py-2 rounded-xl bg-omega-gray/50 border border-white/10 text-omega-text text-xs hover:border-omega-orange/30 hover:bg-omega-orange/5 transition-all"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                <div className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-omega-orange/15 text-white' 
                    : msg.error ? 'bg-omega-red/10 text-omega-red' : 'glass text-omega-text'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  
                  {msg.role === 'ai' && !msg.error && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                      <button onClick={() => copyToClipboard(msg.content)}
                        className="flex items-center gap-1 text-omega-text-muted text-xs hover:text-omega-orange transition-colors">
                        <IoCopy size={12} /> نسخ
                      </button>
                      {msg.tokensUsed && (
                        <span className="text-omega-text-muted text-[10px]">🔤 {msg.tokensUsed} توكن</span>
                      )}
                    </div>
                  )}

                  {/* الإجراءات المقترحة */}
                  {msg.suggestedActions?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-omega-text-muted text-xs font-medium">إجراءات مقترحة:</p>
                      {msg.suggestedActions.map((action, j) => (
                        <div key={j} className="bg-omega-dark/30 rounded-xl p-3">
                          <p className="text-white text-xs mb-2">{action.description || JSON.stringify(action)}</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleExecuteAction(action)}
                              className="flex-1 py-2 rounded-lg bg-omega-orange/20 text-omega-orange text-xs font-medium hover:bg-omega-orange/30 transition-colors flex items-center justify-center gap-1">
                              <IoCheckmark size={14} /> تأكيد التنفيذ
                            </button>
                            <button onClick={() => setPendingActions(prev => prev.filter(a => a !== action))}
                              className="px-3 py-2 rounded-lg bg-omega-red/10 text-omega-red text-xs hover:bg-omega-red/20 transition-colors">
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
                <div className="glass rounded-2xl p-4 max-w-[85%]">
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

        {/* Quick Actions when messages exist */}
        {messages.length > 0 && (
          <div className="px-4 pb-2">
            <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
              {quickActions.slice(0, 4).map((action, i) => (
                <button key={i} onClick={() => sendMessage(action.prompt)} disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-omega-gray/30 border border-white/5 text-omega-text-muted text-[10px] whitespace-nowrap hover:border-omega-orange/20 transition-all disabled:opacity-50">
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="glass border-t border-white/10 p-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="اسأل المساعد الذكي..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-omega-orange to-omega-red text-white flex items-center justify-center hover:shadow-lg hover:shadow-omega-orange/25 transition-all disabled:opacity-50 active:scale-95"
            >
              <IoSend size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
