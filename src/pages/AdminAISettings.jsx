import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import AdminNav from '../components/AdminNav';
import { IoSettings, IoTrash, IoWarning, IoSparkles, IoServer, IoFlash } from 'react-icons/io5';
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
      const settingsDoc = await getDoc(doc(db, 'ai_settings', 'config'));
      if (settingsDoc.exists()) setSettings(prev => ({ ...prev, ...settingsDoc.data() }));

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
        <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="page-header-icon">
                <IoSettings size={22} />
              </div>
              <div>
                <h1 className="page-title">إعدادات الذكاء</h1>
                <p className="page-subtitle">تخصيص المساعد الذكي</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20" />)}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Settings */}
              <div className="lg:col-span-2 space-y-4">
                {/* تنبيه */}
                <div className="rounded-2xl p-4 border border-yellow-500/25 bg-yellow-500/5 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center text-yellow-400 flex-shrink-0">
                      <IoWarning size={18} />
                    </div>
                    <div>
                      <p className="text-yellow-400 text-sm font-bold mb-1">تنبيه</p>
                      <p className="text-omega-text-muted text-xs leading-relaxed">
                        النسخة المستعملة مجانية (inclusionai/ring-2.6-1t:free) وقد تكون لها حدود في الاستخدام والسرعة.
                      </p>
                    </div>
                  </div>
                </div>

                {/* General */}
                <div className="card-premium p-5">
                  <h3 className="section-title"><IoFlash className="text-omega-orange" size={18} /> الإعدادات العامة</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <p className="text-white text-sm font-bold">تفعيل الذكاء الاصطناعي</p>
                        <p className="text-omega-text-dim text-[11px]">السماح باستخدام المساعد</p>
                      </div>
                      <div className={`toggle ${settings.isEnabled ? 'on' : ''}`}
                        onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })} />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <p className="text-white text-sm font-bold">السماح بإجراءات AI</p>
                        <p className="text-omega-text-dim text-[11px]">السماح بتنفيذ الأوامر</p>
                      </div>
                      <div className={`toggle ${settings.allowedActions ? 'on' : ''}`}
                        onClick={() => setSettings({ ...settings, allowedActions: !settings.allowedActions })} />
                    </div>
                  </div>
                </div>

                {/* Model */}
                <div className="card-premium p-5">
                  <h3 className="section-title"><IoServer className="text-omega-info" size={18} /> النموذج والمعاملات</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">معرّف النموذج</label>
                      <input type="text" value={settings.model} onChange={e => setSettings({ ...settings, model: e.target.value })}
                        className="input-modern" dir="ltr" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-omega-text-muted text-[11px] mr-1">Temperature</label>
                        <span className="text-omega-orange text-xs font-bold">{settings.temperature}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.1" value={settings.temperature}
                        onChange={e => setSettings({ ...settings, temperature: Number(e.target.value) })}
                        style={{ '--val': `${settings.temperature * 100}%` }}
                        className="slider-orange w-full" />
                      <div className="flex justify-between text-[10px] text-omega-text-dim mt-1 mr-1">
                        <span>دقيق</span>
                        <span>إبداعي</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">Max Tokens</label>
                      <input type="number" value={settings.maxTokens} onChange={e => setSettings({ ...settings, maxTokens: Number(e.target.value) })}
                        className="input-modern" />
                    </div>
                  </div>
                </div>

                <button onClick={saveSettings} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'حفظ الإعدادات'}
                </button>
              </div>

              {/* Logs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="section-title m-0"><IoSparkles className="text-omega-orange" size={16} /> السجلات</h3>
                  {logs.length > 0 && (
                    <button onClick={clearLogs} className="text-omega-red text-[11px] flex items-center gap-1 hover:text-omega-red-light">
                      <IoTrash size={12} /> حذف الكل
                    </button>
                  )}
                </div>
                <p className="text-omega-text-dim text-[10px] mb-3">{logs.length} محادثة</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar">
                  {logs.length === 0 ? (
                    <div className="card-premium p-8 text-center">
                      <IoSparkles className="text-omega-text-dim mx-auto mb-2" size={32} />
                      <p className="text-omega-text-muted text-sm">لا توجد سجلات</p>
                    </div>
                  ) : logs.map((log) => (
                    <div key={log.id} className="card-premium p-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-omega-orange text-[10px] font-bold">{log.adminName || 'مدير'}</span>
                        <span className="text-omega-text-dim text-[10px]">{timeAgo(log.createdAt)}</span>
                      </div>
                      <p className="text-white text-xs mb-1 line-clamp-2">❓ {log.question}</p>
                      <p className="text-omega-text-muted text-xs line-clamp-2">💬 {log.answer}</p>
                      {log.tokensUsed && <p className="text-omega-text-dim text-[10px] mt-1">🔤 {log.tokensUsed} توكن</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
