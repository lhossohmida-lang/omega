import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import AdminNav from '../components/AdminNav';
import { IoSettings, IoTrash, IoWarning } from 'react-icons/io5';
import { timeAgo } from '../utils/formatDate';
import toast from 'react-hot-toast';

export default function AdminAISettings() {
  const [settings, setSettings] = useState({
    model: 'inclusionai/ring-2.6-1t:free',
    isEnabled: true,
    temperature: 0.3,
    maxTokens: 1200,
    allowedActions: true,
    systemPrompt: '',
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // تحميل الإعدادات
      const settingsDoc = await getDoc(doc(db, 'ai_settings', 'config'));
      if (settingsDoc.exists()) setSettings({ ...settings, ...settingsDoc.data() });

      // تحميل السجل
      const q = query(collection(db, 'ai_logs'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'ai_settings', 'config'), settings);
      toast.success('تم حفظ الإعدادات');
    } catch (err) { toast.error('خطأ في الحفظ'); }
    setSaving(false);
  };

  const clearLogs = async () => {
    if (!confirm('هل تريد حذف جميع سجلات AI؟')) return;
    try {
      for (const log of logs) {
        await deleteDoc(doc(db, 'ai_logs', log.id));
      }
      setLogs([]);
      toast.success('تم حذف السجلات');
    } catch (err) { toast.error('خطأ'); }
  };

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-3xl mx-auto px-4 pt-16 lg:pt-6">
          <h1 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <IoSettings className="text-omega-orange" /> إعدادات الذكاء الاصطناعي
          </h1>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : (
            <>
              {/* تنبيه */}
              <div className="glass rounded-xl p-4 mb-4 border border-yellow-500/20 animate-fade-in">
                <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium mb-1">
                  <IoWarning size={16} /> تنبيه
                </div>
                <p className="text-omega-text-muted text-xs">
                  النسخة المستعملة مجانية (inclusionai/ring-2.6-1t:free) وقد تكون لها حدود في الاستخدام والسرعة.
                </p>
              </div>

              {/* الإعدادات */}
              <div className="glass rounded-2xl p-4 mb-6 space-y-4">
                {/* تفعيل/تعطيل */}
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">تفعيل الذكاء الاصطناعي</span>
                  <button onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${settings.isEnabled ? 'bg-omega-success' : 'bg-omega-gray'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.isEnabled ? 'right-1' : 'right-6'}`} />
                  </button>
                </div>

                {/* النموذج */}
                <div>
                  <label className="text-omega-text-muted text-xs block mb-1">النموذج</label>
                  <input type="text" value={settings.model} onChange={e => setSettings({ ...settings, model: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50" dir="ltr" />
                </div>

                {/* Temperature */}
                <div>
                  <label className="text-omega-text-muted text-xs block mb-1">Temperature: {settings.temperature}</label>
                  <input type="range" min="0" max="1" step="0.1" value={settings.temperature}
                    onChange={e => setSettings({ ...settings, temperature: Number(e.target.value) })}
                    className="w-full accent-omega-orange" />
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="text-omega-text-muted text-xs block mb-1">Max Tokens</label>
                  <input type="number" value={settings.maxTokens} onChange={e => setSettings({ ...settings, maxTokens: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50" />
                </div>

                {/* السماح بالإجراءات */}
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">السماح بإجراءات AI</span>
                  <button onClick={() => setSettings({ ...settings, allowedActions: !settings.allowedActions })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${settings.allowedActions ? 'bg-omega-success' : 'bg-omega-gray'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.allowedActions ? 'right-1' : 'right-6'}`} />
                  </button>
                </div>

                <button onClick={saveSettings} disabled={saving}
                  className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'حفظ الإعدادات'}
                </button>
              </div>

              {/* سجل AI */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">سجل المحادثات ({logs.length})</h3>
                {logs.length > 0 && (
                  <button onClick={clearLogs} className="text-omega-red text-xs flex items-center gap-1 hover:text-omega-red-light">
                    <IoTrash size={14} /> حذف الكل
                  </button>
                )}
              </div>
              <div className="space-y-2 mb-6">
                {logs.length === 0 ? (
                  <p className="text-omega-text-muted text-sm text-center py-8">لا توجد سجلات</p>
                ) : logs.map((log, i) => (
                  <div key={log.id} className="glass rounded-xl p-3 animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                    <div className="flex justify-between mb-1">
                      <span className="text-omega-orange text-xs font-medium">{log.adminName || 'مدير'}</span>
                      <span className="text-omega-text-muted text-[10px]">{timeAgo(log.createdAt)}</span>
                    </div>
                    <p className="text-white text-xs mb-1">❓ {log.question}</p>
                    <p className="text-omega-text-muted text-xs line-clamp-2">💬 {log.answer}</p>
                    {log.tokensUsed && <p className="text-omega-text-muted text-[10px] mt-1">🔤 {log.tokensUsed} توكن</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
