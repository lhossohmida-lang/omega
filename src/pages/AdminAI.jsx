import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { streamAIChat, executeAIAction } from '../services/aiService';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { getAllOrders } from '../services/orderService';
import { isToday } from '../utils/formatDate';
import AdminNav from '../components/AdminNav';
import {
  IoMic, IoMicOff, IoSend, IoSparkles, IoSearch,
  IoNotificationsOutline, IoCheckmarkCircle,
  IoStatsChart, IoTimeOutline,
  IoTrendingUp, IoTrendingDown,
  IoDocumentTextOutline, IoCubeOutline, IoAlarmOutline,
  IoChatbubbleEllipsesOutline,
  IoRestaurant,
  IoCopy, IoCheckmark, IoClose, IoPricetagOutline,
  IoFlash, IoBulbOutline, IoChevronDown,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

/* ─── Static data ─────────────────────────────────────────── */
const QUICK_SUGGESTIONS = [
  {
    icon: IoStatsChart,
    title: 'تحليل المبيعات',
    sub: 'تقرير المبيعات اليومي',
    prompt: 'حلل مبيعات اليوم وأعطني ملخصاً عن أكثر المنتجات مبيعاً.',
  },
  {
    icon: IoCubeOutline,
    title: 'توقع نفاد المخزون',
    sub: 'تنبيهات تلقائية',
    prompt: 'ما هي المنتجات التي قد ينفد مخزونها قريباً؟',
  },
  {
    icon: IoTimeOutline,
    title: 'أفضل الأوقات ازدحاماً',
    sub: 'تحليل أوقات الذروة',
    prompt: 'ما هي أكثر الأوقات ازدحاماً في المطعم؟',
  },
  {
    icon: IoPricetagOutline,
    title: 'اقتراح عروض',
    sub: 'عروض مخصصة بالذكاء',
    prompt: 'اقترح لي عروضاً وترويجات لزيادة المبيعات.',
  },
  {
    icon: IoDocumentTextOutline,
    title: 'ملخص نهاية اليوم',
    sub: 'ملخص شامل للأداء',
    prompt: 'اعطني ملخصاً شاملاً لأداء اليوم.',
  },
];

const AI_LANGS = [
  { code: 'ar-SA', label: 'العربية الفصحى' },
  { code: 'ar-DZ', label: 'الجزائرية' },
  { code: 'ar-EG', label: 'المصرية' },
  { code: 'ar-MA', label: 'المغربية' },
  { code: 'en-US', label: 'English' },
  { code: 'fr-FR', label: 'Français' },
];

/* ─── Clock helper ─────────────────────────────────────────── */
function fmtClock(d = new Date()) {
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function fmtMsgTime(d = new Date()) {
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function AdminAI() {
  const { userData } = useAuth();

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'مرحباً 👋\nيمكنني مساعدتك في تحليل المبيعات والطلبات والمخزون وتقديم توصيات ذكية لتحسين الأداء.',
      time: fmtMsgTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [clock, setClock] = useState(fmtClock());
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem('omega_voice_lang') || 'ar-SA');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [orders, setOrders] = useState([]);

  const messagesEndRef = useRef(null);
  const langMenuRef = useRef(null);

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Load orders for stats */
  useEffect(() => {
    getAllOrders().then(setOrders).catch(console.error);
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Close lang menu on outside click */
  useEffect(() => {
    function onDoc(e) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    }
    if (showLangMenu) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showLangMenu]);

  /* Voice input */
  const handleVoiceResult = (text) => {
    setInput((prev) => (prev ? prev + ' ' + text : text));
  };
  const handleVoiceError = (msg) => {
    toast.error(msg);
  };

  const {
    isListening,
    interimText,
    duration,
    start: startVoice,
    stop: stopVoice,
    isSupported: voiceSupported,
  } = useVoiceInput({
    lang: voiceLang,
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const toggleVoice = () => {
    if (!voiceSupported) {
      toast.error('المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.');
      return;
    }
    if (isListening) {
      stopVoice();
    } else {
      startVoice();
      toast('جاري الاستماع... تحدث الآن 🎤', { icon: '🎙️' });
    }
  };

  const changeLang = (code) => {
    setVoiceLang(code);
    localStorage.setItem('omega_voice_lang', code);
    setShowLangMenu(false);
  };

  /* Send message */
  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    if (!userData?.uid) {
      toast.error('تعذر التعرف على حساب المدير. أعد تسجيل الدخول.');
      return;
    }
    if (isListening) stopVoice();

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question, time: fmtMsgTime() },
      { role: 'ai', content: '', streaming: true, time: fmtMsgTime(), suggestedActions: [] },
    ]);
    setLoading(true);

    const updateLastAi = (updater) => {
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'ai') {
            next[i] = { ...next[i], ...updater(next[i]) };
            break;
          }
        }
        return next;
      });
    };

    try {
      await streamAIChat(question, userData.uid, {
        onDelta: (chunk) => updateLastAi((msg) => ({ content: (msg.content || '') + chunk })),
        onDone: ({ suggestedActions, tokensUsed }) => {
          updateLastAi(() => ({
            streaming: false,
            suggestedActions: suggestedActions || [],
            tokensUsed,
          }));
        },
        onError: (errMsg) => {
          updateLastAi((msg) => ({
            content: (msg.content || '') + `\n❌ ${errMsg}`,
            error: true,
            streaming: false,
          }));
        },
      });
    } catch (err) {
      updateLastAi(() => ({ content: `❌ ${err.message}`, error: true, streaming: false }));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action) => {
    try {
      toast.loading('جاري تنفيذ الإجراء...');
      await executeAIAction(action, userData.uid);
      toast.dismiss();
      toast.success('تم تنفيذ الإجراء بنجاح');
    } catch (err) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  /* ── Stats derived from data ── */
  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => isToday(o.createdAt));
    const aiAnswered = messages.filter((m) => m.role === 'ai' && !m.streaming && !m.error).length;
    const lateOrders = orders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.status) && timeSinceMinutes(o.createdAt) > 30
    ).length;
    return {
      analyzed: todayOrders.length,
      inventory: 14, // placeholder
      late: lateOrders,
      answered: aiAnswered,
    };
  }, [orders, messages]);

  /* ── Top categories chart data ── */
  const topCategories = useMemo(() => {
    const counter = {};
    let total = 0;
    for (const o of orders) {
      for (const item of o.items || []) {
        const key = item.name || 'غير معروف';
        counter[key] = (counter[key] || 0) + (item.quantity || 1);
        total += item.quantity || 1;
      }
    }
    const sorted = Object.entries(counter)
      .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    if (sorted.length === 0) {
      return {
        items: [
          { name: 'برجر لحم', count: 48, pct: 22 },
          { name: 'بيتزا مارجريتا', count: 36, pct: 17 },
          { name: 'برجر دجاج حار', count: 28, pct: 13 },
          { name: 'تاكوس دجاج', count: 22, pct: 10 },
          { name: 'أصناف أخرى', count: 82, pct: 38 },
        ],
        total: 216,
      };
    }
    const rest = total - sorted.reduce((s, x) => s + x.count, 0);
    if (rest > 0) sorted.push({ name: 'أصناف أخرى', count: rest, pct: Math.round((rest / total) * 100) });
    return { items: sorted, total };
  }, [orders]);

  /* ── Active sidebar nav handler ── */
  const handleNavClick = (item) => {
    if (item.to && item.id !== 'ai') {
      navigate(item.to);
    }
  };

  return (
    <div className="kitchen-page" dir="rtl">
      {/* ───── Sidebar ───── */}
      <aside className="kitchen-sidebar">
        <div className="kitchen-brand">
          <div className="kitchen-brand-icon">
            <IoRestaurant size={32} />
          </div>
          <div className="kitchen-brand-text">
            <h2>OMEGA</h2>
            <span>مطعم</span>
          </div>
        </div>

        <nav className="kitchen-nav">
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleNavClick(SIDEBAR_ITEMS.find((s) => s.id === id))}
              className={`kitchen-nav-item${id === 'ai' ? ' active' : ''}`}
            >
              <span className="kitchen-nav-label">{label}</span>
              <span className="kitchen-nav-icon-wrap">
                <Icon size={20} />
              </span>
            </button>
          ))}
        </nav>

        <div className="kitchen-profile">
          <div className="kitchen-profile-card">
            <div className="kitchen-profile-info">
              <p className="kitchen-profile-name">
                الشيف {userData?.name?.split(' ')?.[0] || 'المدير'}
              </p>
              <span className="kitchen-profile-role">مدير النظام</span>
            </div>
            <div className="kitchen-profile-avatar">
              {userData?.name?.[0] || '👨‍💼'}
              <span className="kitchen-profile-online" />
            </div>
          </div>
          <button type="button" onClick={logout} className="kitchen-logout-btn">
            <span>تسجيل خروج</span>
            <IoLogOutOutline size={18} />
          </button>
        </div>
      </aside>

      {/* ───── Main ───── */}
      <main className="kitchen-main ai-main">
        {/* Header */}
        <header className="kitchen-header">
          <div className="kitchen-header-actions ai-header-actions">
            <button type="button" className="kitchen-bell" aria-label="إشعارات">
              <IoNotificationsOutline size={20} />
              <span className="kitchen-bell-badge">5</span>
            </button>
            <label className="ai-search-box">
              <IoSearch size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث هنا..."
              />
            </label>
            <span className="ai-connected-pill">
              <span className="ai-pill-dot" />
              <IoChatbubbleEllipsesOutline size={14} />
              متصل
            </span>
          </div>
          <div className="kitchen-header-title">
            <div className="kitchen-header-text">
              <h1>واجهة الذكاء الاصطناعي</h1>
              <p>مساعد ذكي لإدارة الطلبات والمخزون واتخاذ القرارات</p>
            </div>
            <div className="kitchen-header-logo">
              <IoRestaurant size={28} />
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="kitchen-stats ai-stats">
          <StatCard
            icon={<IoDocumentTextOutline size={22} />}
            value={stats.analyzed}
            label="الطلبات المحللة اليوم"
            sub="18% عن أمس"
            tone="red"
          />
          <StatCard
            icon={<IoCubeOutline size={22} />}
            value={stats.inventory}
            label="اقتراحات المخزون"
            sub="جاهزة للمراجعة"
            tone="orange"
          />
          <StatCard
            icon={<IoAlarmOutline size={22} />}
            value={stats.late}
            label="تنبيهات التأخير"
            sub="تحتاج متابعة"
            tone="yellow"
          />
          <StatCard
            icon={<IoChatbubbleEllipsesOutline size={22} />}
            value={stats.answered}
            label="الأسئلة المجاب عنها"
            sub="اليوم"
            tone="pink"
          />
        </section>

        {/* Three-column grid */}
        <section className="ai-grid">
          {/* Chat */}
          <div className="ai-chat-panel">
            <div className="ai-panel-head">
              <span className="ai-status-pill">
                <span className="ai-status-dot" />
                الذكاء الاصطناعي نشط
              </span>
              <h2>
                المساعد الذكي
                <span className="ai-panel-icon">
                  <IoSparkles size={16} />
                </span>
              </h2>
            </div>

            <div className="ai-messages">
              {messages.map((msg, i) => (
                <Message
                  key={i}
                  msg={msg}
                  onCopy={() => copyToClipboard(msg.content)}
                  onAction={handleExecuteAction}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice listening banner */}
            {isListening && (
              <div className="ai-listening-banner">
                <div className="ai-listening-bars">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="ai-listening-text">
                  <strong>جاري الاستماع...</strong>
                  <span>{interimText || 'تحدث الآن، وسيتم تحويل كلامك إلى رسالة نصية'}</span>
                </div>
                <span className="ai-listening-time">{formatDuration(duration)}</span>
                <button
                  type="button"
                  onClick={stopVoice}
                  className="ai-listening-stop"
                  aria-label="إيقاف"
                >
                  <IoClose size={18} />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="ai-input-bar">
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="ai-send-btn"
                aria-label="إرسال"
              >
                <IoSend size={18} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
                placeholder="اكتب سؤالك للذكاء الاصطناعي..."
                disabled={loading}
                className="ai-input"
                dir="rtl"
              />

              <div className="ai-input-tools">
                <div className="ai-lang-wrap" ref={langMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowLangMenu((v) => !v)}
                    className="ai-lang-btn"
                    title="لغة التعرّف"
                  >
                    {AI_LANGS.find((l) => l.code === voiceLang)?.label || voiceLang}
                    <IoChevronDown size={12} />
                  </button>
                  {showLangMenu && (
                    <div className="ai-lang-menu">
                      {AI_LANGS.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => changeLang(l.code)}
                          className={`ai-lang-item${l.code === voiceLang ? ' active' : ''}`}
                        >
                          {l.code === voiceLang && <IoCheckmark size={12} />}
                          <span>{l.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`ai-mic-btn${isListening ? ' is-listening' : ''}`}
                  aria-label={isListening ? 'إيقاف التسجيل' : 'بدء التسجيل الصوتي'}
                  title={isListening ? 'إيقاف' : 'تحدث الآن'}
                >
                  {isListening ? <IoMicOff size={20} /> : <IoMic size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="ai-side-panel">
            <div className="ai-panel-head">
              <span className="ai-panel-icon"><IoFlash size={16} /></span>
              <h2>اقتراحات سريعة</h2>
            </div>
            <div className="ai-suggestions-list">
              {QUICK_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(s.prompt)}
                  className="ai-suggestion-card"
                  disabled={loading}
                >
                  <div className="ai-suggestion-icon">
                    <s.icon size={20} />
                  </div>
                  <div className="ai-suggestion-text">
                    <p className="ai-suggestion-title">{s.title}</p>
                    <span className="ai-suggestion-sub">{s.sub}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Smart insights */}
          <div className="ai-side-panel">
            <div className="ai-panel-head">
              <span className="ai-panel-icon ai-panel-icon-bulb"><IoBulbOutline size={16} /></span>
              <h2>رؤى ذكية</h2>
            </div>
            <div className="ai-insights">
              <InsightCard
                trend="up"
                title="البرجر الأكثر مبيعاً"
                desc="برجر لحم يتصدر المبيعات اليوم"
                badge="48 طلب بنسبة 22٪"
              />
              <InsightCard
                trend="up"
                title="ارتفاع طلبات التوصيل"
                desc="يزداد الطلب على التوصيل مساءً"
                badge="بين 6 م - 10 م"
              />
              <InsightCard
                trend="down"
                title="ينصح بإعادة طلب المشروبات"
                desc="المشروبات الغازية على وشك النفاد"
                badge="المخزون المتبقي: 12 عبوة"
              />
            </div>
          </div>
        </section>

        {/* Bottom: top categories chart */}
        <section className="ai-chart-panel">
          <div className="ai-panel-head">
            <span className="ai-chart-total">إجمالي الطلبات: {topCategories.total} طلب</span>
            <h2>أكثر الأصناف طلباً اليوم</h2>
          </div>
          <div className="ai-chart-body">
            <DonutChart data={topCategories.items} />
            <div className="ai-chart-legend">
              {topCategories.items.map((item, i) => (
                <div key={i} className="ai-legend-row">
                  <span className="ai-legend-value">
                    {item.count} ({item.pct}%)
                  </span>
                  <span className="ai-legend-name">{item.name}</span>
                  <span
                    className="ai-legend-dot"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="kitchen-footer">
          <div className="kitchen-footer-msg">
            <IoSparkles size={16} />
            <span>الذكاء الاصطناعي هنا لمساعدتك على اتخاذ قرارات أفضل كل يوم</span>
          </div>
          <div className="kitchen-footer-clock">
            <span dir="ltr">{clock}</span>
            <span>: آخر تحديث</span>
            <IoTimeOutline size={16} />
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatCard({ icon, value, label, sub, tone }) {
  return (
    <article className={`kitchen-stat kitchen-stat-${tone}`}>
      <div className="kitchen-stat-icon">{icon}</div>
      <div className="kitchen-stat-body">
        <strong className="kitchen-stat-value">{value}</strong>
        <p className="kitchen-stat-label">{label}</p>
        <span className="kitchen-stat-sub">{sub}</span>
      </div>
    </article>
  );
}

function Message({ msg, onCopy, onAction }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`ai-msg-row${isUser ? ' is-user' : ''}`}>
      {!isUser && (
        <div className="ai-msg-avatar">
          <span>🤖</span>
        </div>
      )}
      <div className={`ai-msg-bubble${isUser ? ' is-user' : ''}${msg.error ? ' is-error' : ''}`}>
        <div className="ai-msg-content">
          {msg.content}
          {msg.streaming && <span className="ai-msg-cursor" />}
        </div>
        <div className="ai-msg-meta">
          {msg.role === 'ai' && !msg.error && !msg.streaming && (
            <button type="button" onClick={onCopy} className="ai-msg-copy" title="نسخ">
              <IoCopy size={11} />
            </button>
          )}
          <span className="ai-msg-time">{msg.time}</span>
          {msg.role === 'user' && <IoCheckmarkCircle className="ai-msg-read" size={12} />}
        </div>

        {msg.suggestedActions?.length > 0 && (
          <div className="ai-actions-list">
            {msg.suggestedActions.map((action, j) => (
              <div key={j} className="ai-action-card">
                <p>{action.description || JSON.stringify(action)}</p>
                <div className="ai-action-buttons">
                  <button type="button" onClick={() => onAction(action)} className="ai-action-confirm">
                    <IoCheckmark size={12} /> تأكيد
                  </button>
                  <button type="button" className="ai-action-cancel">
                    <IoClose size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ trend, title, desc, badge }) {
  const TrendIcon = trend === 'up' ? IoTrendingUp : IoTrendingDown;
  const trendClass = trend === 'up' ? 'ai-insight-up' : 'ai-insight-down';
  return (
    <div className="ai-insight-card">
      <div className={`ai-insight-icon ${trendClass}`}>
        <TrendIcon size={16} />
      </div>
      <div className="ai-insight-body">
        <p className="ai-insight-title">{title}</p>
        <span className="ai-insight-desc">{desc}</span>
        <span className="ai-insight-badge">{badge}</span>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#dc2626', '#f97316', '#f59e0b', '#84cc16', '#94a3b8'];

function DonutChart({ data }) {
  const size = 140;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.pct, 0) || 100;

  let offset = 0;
  return (
    <div className="ai-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        {data.map((d, i) => {
          const length = (d.pct / total) * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const rotation = (offset / circumference) * 360 - 90;
          offset += length;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */
function timeSinceMinutes(ts) {
  if (!ts) return 0;
  const ms = ts.toMillis ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime();
  return Math.floor((Date.now() - ms) / 60000);
}

function formatDuration(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
