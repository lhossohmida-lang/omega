import { useState, useEffect, useMemo } from 'react';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import {
  getAllWorkers,
  getAllSessions,
  updateWorkerHourlyRate,
  registerNewWorker,
  registerManualSession,
  checkOutWorker,
  deleteSession,
  addWithdrawal,
  getAllWithdrawals,
  deleteWithdrawal,
  deleteWorker,
} from '../services/attendanceService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import {
  IoTimeOutline,
  IoCashOutline,
  IoPeopleOutline,
  IoSettingsOutline,
  IoCalendarOutline,
  IoSaveOutline,
  IoRefreshOutline,
  IoPersonAddOutline,
  IoStopOutline,
  IoTrashOutline,
  IoGridOutline,
  IoListOutline,
  IoWalletOutline,
  IoCloseOutline,
  IoAddOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

// تحويل timestamp إلى مفتاح تاريخ YYYY-MM-DD
function getDateKey(ts) {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toISOString().split('T')[0];
}

// تجميع الجلسات والسحوبات حسب التاريخ لعامل واحد
function getWorkerDailyData(workerSessions, workerWithdrawals) {
  const map = {};
  workerSessions.forEach((s) => {
    const key = getDateKey(s.checkIn || s.createdAt);
    if (!key) return;
    if (!map[key]) map[key] = { dateKey: key, sessions: [], withdrawals: [] };
    map[key].sessions.push(s);
  });
  workerWithdrawals.forEach((w) => {
    const key = getDateKey(w.date || w.createdAt);
    if (!key) return;
    if (!map[key]) map[key] = { dateKey: key, sessions: [], withdrawals: [] };
    map[key].withdrawals.push(w);
  });
  return Object.values(map).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export default function AdminAttendance() {
  const [workers, setWorkers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rates, setRates] = useState({});
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // مودال تأكيد تعديل سعر الساعة
  const [rateConfirmModal, setRateConfirmModal] = useState(null); // { uid, name, oldRate, newRate }

  // مودال تأكيد حذف عامل
  const [deleteWorkerModal, setDeleteWorkerModal] = useState(null); // { uid, name }
  const [deletingWorker, setDeletingWorker] = useState(false);

  // نموذج إضافة عامل جديد
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', hourlyRate: '' });
  const [registering, setRegistering] = useState(false);

  // نموذج تسجيل حضور يدوي
  const [manualSession, setManualSession] = useState({ uid: '', checkIn: '', checkOut: '', hourlyRate: '' });
  const [registeringManual, setRegisteringManual] = useState(false);

  // مودال السحب
  const [withdrawalModal, setWithdrawalModal] = useState(null); // { worker }
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [addingWithdrawal, setAddingWithdrawal] = useState(false);

  const handleManualWorkerChange = (uid) => {
    const selected = workers.find((w) => w.uid === uid);
    setManualSession((prev) => ({
      ...prev,
      uid,
      hourlyRate: selected ? (selected.hourlyRate || 0) : '',
    }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersData, sessionsData, withdrawalsData] = await Promise.all([
        getAllWorkers(),
        getAllSessions(),
        getAllWithdrawals(),
      ]);
      setWorkers(workersData);
      setSessions(sessionsData);
      setWithdrawals(withdrawalsData);

      const ratesMap = {};
      workersData.forEach((w) => { ratesMap[w.uid] = w.hourlyRate || 0; });
      setRates(ratesMap);
    } catch (error) {
      console.error('Error loading admin attendance data:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الحضور والأجور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRateChange = (uid, val) => setRates((prev) => ({ ...prev, [uid]: val }));

  const handleDeleteWorker = async () => {
    if (!deleteWorkerModal) return;
    setDeletingWorker(true);
    try {
      await deleteWorker(deleteWorkerModal.uid);
      toast.success(`تم حذف الموظف ${deleteWorkerModal.name} بنجاح ✅`);
      setDeleteWorkerModal(null);
      loadData();
    } catch (e) {
      toast.error(e.message || 'فشل حذف الموظف');
    } finally {
      setDeletingWorker(false);
    }
  };

  const handleSaveRate = async (uid) => {
    const rate = Number(rates[uid]);
    if (isNaN(rate) || rate < 0) { toast.error('يرجى إدخال سعر ساعة صحيح'); return; }
    setUpdatingUid(uid);
    try {
      await updateWorkerHourlyRate(uid, rate);
      toast.success('تم تحديث سعر ساعة العامل بنجاح ✅');
      loadData();
    } catch (e) {
      toast.error(e.message || 'فشل تحديث سعر الساعة');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleRegisterWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.hourlyRate) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    setRegistering(true);
    try {
      await registerNewWorker({ name: newWorker.name, phone: newWorker.phone, hourlyRate: Number(newWorker.hourlyRate) || 0 });
      toast.success(`تم تسجيل الموظف ${newWorker.name} بنجاح ✅`);
      setNewWorker({ name: '', phone: '', hourlyRate: '' });
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل تسجيل حساب العامل الجديد');
    } finally {
      setRegistering(false);
    }
  };

  const handleRegisterManualSession = async (e) => {
    e.preventDefault();
    const { uid, checkIn, checkOut, hourlyRate } = manualSession;
    if (!uid || !checkIn || !checkOut || !hourlyRate) { toast.error('يرجى ملء جميع حقول الوردية اليدوية'); return; }
    const selectedWorker = workers.find((w) => w.uid === uid);
    if (!selectedWorker) return;
    setRegisteringManual(true);
    try {
      await registerManualSession({ uid, name: selectedWorker.name, checkIn, checkOut, hourlyRate: Number(hourlyRate) || 0 });
      toast.success(`تم تسجيل حضور وانصراف الموظف ${selectedWorker.name} يدوياً بنجاح ✅`);
      setManualSession({ uid: '', checkIn: '', checkOut: '', hourlyRate: '' });
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل تسجيل الوردية اليدوية');
    } finally {
      setRegisteringManual(false);
    }
  };

  const handleForceCheckOut = async (session) => {
    const ok = confirm(`هل أنت متأكد من إنهاء وردية الموظف ${session.name} وتسجيل خروجه النهائي؟`);
    if (!ok) return;
    try {
      await checkOutWorker(session.id, session, session.hourlyRate || 0);
      toast.success(`تم تسجيل خروج الموظف ${session.name} بنجاح ✅`);
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل تسجيل خروج الموظف');
    }
  };

  const handleDeleteSession = async (session) => {
    const ok = confirm(`هل تريد حذف سجل حضور الموظف ${session.name}؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!ok) return;
    setDeletingId(session.id);
    try {
      await deleteSession(session.id);
      toast.success('تم حذف سجل الحضور بنجاح');
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل حذف السجل');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddWithdrawal = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawalAmount);
    if (!amount || amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return; }
    setAddingWithdrawal(true);
    try {
      await addWithdrawal(withdrawalModal.worker.uid, withdrawalModal.worker.name, amount, withdrawalNote);
      toast.success(`تم تسجيل سحب ${formatCurrency(amount)} للموظف ${withdrawalModal.worker.name} ✅`);
      setWithdrawalModal(null);
      setWithdrawalAmount('');
      setWithdrawalNote('');
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل تسجيل السحب');
    } finally {
      setAddingWithdrawal(false);
    }
  };

  const handleDeleteWithdrawal = async (w) => {
    const ok = confirm(`هل تريد حذف سجل السحب ${formatCurrency(w.amount)}؟`);
    if (!ok) return;
    try {
      await deleteWithdrawal(w.id);
      toast.success('تم حذف السحب بنجاح');
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل حذف السحب');
    }
  };

  // إحصائيات عامة
  const stats = useMemo(() => {
    let totalHours = 0;
    let totalPay = 0;
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    completedSessions.forEach((s) => { totalHours += s.totalHours || 0; totalPay += s.totalPay || 0; });
    return {
      totalHours: Number(totalHours.toFixed(2)),
      totalPay: Math.round(totalPay),
      completedCount: completedSessions.length,
      activeCount: sessions.filter((s) => ['active', 'break'].includes(s.status)).length,
    };
  }, [sessions]);

  const formatTime = (ts) => {
    if (!ts) return '-';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateLabel = (dateKey) => {
    if (!dateKey) return '';
    const date = new Date(dateKey + 'T00:00:00');
    return date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getBreakCountAndDuration = (breaks) => {
    if (!breaks || breaks.length === 0) return 'لا يوجد';
    let totalBreakMs = 0;
    breaks.forEach((b) => {
      const outMs = new Date(b.out).getTime();
      const inMs = b.in ? new Date(b.in).getTime() : new Date().getTime();
      totalBreakMs += (inMs - outMs);
    });
    const totalMins = Math.round(totalBreakMs / (1000 * 60));
    return `${breaks.length} استراحة (${totalMins} دقيقة)`;
  };

  return (
    <div className="admin-page omega-admin-page">
      <AdminNav />

      <main className="admin-container omega-admin-container" dir="rtl">
        <AdminHeader title="الدوام والأجور" subtitle="حساب ساعات عمل الموظفين والرواتب" />

        {/* إحصائيات عامة */}
        <section className="omega-stats-grid mb-6">
          <article className="omega-stat-card omega-stat-red">
            <div className="omega-stat-icon"><IoCashOutline size={28} /></div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">إجمالي الأجور المستحقة</p>
              <strong className="omega-stat-value">{formatCurrency(stats.totalPay)}</strong>
              <span className="omega-stat-hint">للورديات المكتملة</span>
            </div>
          </article>

          <article className="omega-stat-card omega-stat-gold">
            <div className="omega-stat-icon"><IoTimeOutline size={28} /></div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">إجمالي ساعات العمل</p>
              <strong className="omega-stat-value">{formatNumber(stats.totalHours)} ساعة</strong>
              <span className="omega-stat-hint">لكافة العمال</span>
            </div>
          </article>

          <article className="omega-stat-card omega-stat-green">
            <div className="omega-stat-icon"><IoPeopleOutline size={28} /></div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">العمال النشطون حالياً</p>
              <strong className="omega-stat-value">{stats.activeCount} عمال</strong>
              <span className="omega-stat-hint">قيد العمل أو الاستراحة الآن</span>
            </div>
          </article>

          <article className="omega-stat-card omega-stat-gold">
            <div className="omega-stat-icon"><IoCalendarOutline size={28} /></div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">عدد الورديات المسجلة</p>
              <strong className="omega-stat-value">{stats.completedCount} وردية</strong>
              <span className="omega-stat-hint">مكتملة ومحسوبة</span>
            </div>
          </article>
        </section>

        {loading ? (
          <div className="omega-loading-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton omega-loading-card h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* 1. العمود الجانبي */}
            <section className="xl:col-span-1 flex flex-col gap-6">

              {/* نموذج إضافة عامل جديد */}
              <div className="omega-panel">
                <div className="omega-section-head mb-4">
                  <IoPersonAddOutline size={20} className="text-omega-orange" />
                  <h2>إضافة موظف (عامل) جديد</h2>
                </div>
                <form onSubmit={handleRegisterWorker} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">الاسم الكامل للموظف</label>
                    <input type="text" required value={newWorker.name}
                      onChange={(e) => setNewWorker((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold"
                      placeholder="مثال: الشيف أحمد علي" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">رقم الهاتف</label>
                      <input type="tel" value={newWorker.phone}
                        onChange={(e) => setNewWorker((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold"
                        placeholder="0550000000" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">سعر الساعة (د.ج)</label>
                      <input type="number" required min="0" value={newWorker.hourlyRate}
                        onChange={(e) => setNewWorker((p) => ({ ...p, hourlyRate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center"
                        placeholder="200" />
                    </div>
                  </div>
                  <button type="submit" disabled={registering}
                    className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-omega-orange/10 active:scale-95 transition-all disabled:opacity-50">
                    <IoPersonAddOutline size={16} />
                    <span>{registering ? 'جاري تسجيل العامل...' : 'تسجيل الموظف الجديد في النظام'}</span>
                  </button>
                </form>
              </div>

              {/* نموذج تسجيل حضور يدوي */}
              <div className="omega-panel">
                <div className="omega-section-head mb-4">
                  <IoCalendarOutline size={20} className="text-omega-orange" />
                  <h2>تسجيل حضور وانصراف يدوي</h2>
                </div>
                <form onSubmit={handleRegisterManualSession} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">اختر الموظف</label>
                    <select required value={manualSession.uid}
                      onChange={(e) => handleManualWorkerChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold cursor-pointer">
                      <option value="">-- اختر الموظف --</option>
                      {workers.map((w) => <option key={w.uid} value={w.uid}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">وقت الدخول</label>
                      <input type="datetime-local" required value={manualSession.checkIn}
                        onChange={(e) => setManualSession((p) => ({ ...p, checkIn: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">وقت الخروج</label>
                      <input type="datetime-local" required value={manualSession.checkOut}
                        onChange={(e) => setManualSession((p) => ({ ...p, checkOut: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">سعر الساعة للوردية (د.ج)</label>
                    <input type="number" required min="0" value={manualSession.hourlyRate}
                      onChange={(e) => setManualSession((p) => ({ ...p, hourlyRate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center"
                      placeholder="200" />
                  </div>
                  <button type="submit" disabled={registeringManual}
                    className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-omega-orange/10 active:scale-95 transition-all disabled:opacity-50">
                    <IoCalendarOutline size={16} />
                    <span>{registeringManual ? 'جاري تسجيل الوردية...' : 'تسجيل الوردية اليدوية في النظام'}</span>
                  </button>
                </form>
              </div>

              {/* لوحة تعديل أجور العمال */}
              <div className="omega-panel">
                <div className="omega-section-head mb-4">
                  <IoSettingsOutline size={20} className="text-omega-orange" />
                  <h2>تعديل سعر ساعة العمال المسجلين</h2>
                </div>
                {workers.length === 0 ? (
                  <p className="text-center py-6 text-omega-text-dim text-sm">لا يوجد عمال مسجلين حالياً.</p>
                ) : (
                  <div className="space-y-4">
                    {workers.map((worker) => (
                      <div key={worker.uid} className="flex items-center justify-between p-3.5 rounded-2xl bg-omega-gray/20 border border-omega-border">
                        <div className="text-right flex-1 min-w-0">
                          <h4 className="font-black text-gray-900 text-sm">{worker.name}</h4>
                          <p className="text-[11px] text-omega-text-muted mt-0.5">{worker.phone || 'بدون رقم هاتف'}</p>
                          <p className="text-[10px] text-omega-text-dim mt-0.5">الحالي: {worker.hourlyRate || 0} د.ج</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="relative">
                            <input type="number"
                              value={rates[worker.uid] !== undefined ? rates[worker.uid] : ''}
                              onChange={(e) => handleRateChange(worker.uid, e.target.value)}
                              className="w-20 px-2 py-1.5 rounded-xl border border-omega-border bg-white text-gray-900 font-bold text-center text-xs focus:outline-none focus:border-omega-orange"
                              placeholder="0" min="0" />
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold">د.ج</span>
                          </div>
                          <button
                            onClick={() => setRateConfirmModal({
                              uid: worker.uid,
                              name: worker.name,
                              oldRate: worker.hourlyRate || 0,
                              newRate: Number(rates[worker.uid]) || 0
                            })}
                            disabled={updatingUid === worker.uid}
                            className="p-2 rounded-xl bg-omega-orange text-white hover:bg-omega-orange-dark active:scale-95 transition-all disabled:opacity-50"
                            title="تأكيد تعديل سعر الساعة">
                            <IoSaveOutline size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteWorkerModal({ uid: worker.uid, name: worker.name })}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 active:scale-95 transition-all"
                            title="حذف الموظف">
                            <IoTrashOutline size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 2. قسم السجلات */}
            <section className="xl:col-span-2 flex flex-col gap-6">
              <div className="omega-panel">

                {/* رأس القسم مع التبديل */}
                <div className="omega-section-head mb-4 flex justify-between items-center w-full flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {/* أزرار تبديل العرض */}
                    <div className="flex items-center bg-omega-gray/30 rounded-xl p-1 gap-1">
                      <button onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'table' ? 'bg-omega-orange text-white shadow-sm' : 'text-omega-text-muted hover:text-gray-700'}`}>
                        <IoListOutline size={15} />
                        <span>جدول الورديات</span>
                      </button>
                      <button onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'cards' ? 'bg-omega-orange text-white shadow-sm' : 'text-omega-text-muted hover:text-gray-700'}`}>
                        <IoGridOutline size={15} />
                        <span>بطاقات العمال</span>
                      </button>
                    </div>
                  </div>
                  <button onClick={loadData}
                    className="p-2 rounded-xl bg-omega-gray hover:bg-omega-gray-light text-gray-800 transition-colors flex items-center gap-1 text-xs font-bold">
                    <IoRefreshOutline size={16} />
                    <span>تحديث البيانات</span>
                  </button>
                </div>

                {/* ── عرض الجدول ── */}
                {viewMode === 'table' && (
                  sessions.length === 0 ? (
                    <div className="text-center py-16 text-omega-text-dim text-sm flex flex-col items-center justify-center gap-3">
                      <IoTimeOutline size={40} className="text-omega-text-muted opacity-50" />
                      <span>لا توجد سجلات حضور مسجلة في المطعم حتى الآن.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-omega-border text-omega-text-muted font-black">
                            <th className="pb-3 text-right">الموظف</th>
                            <th className="pb-3 text-right">التاريخ</th>
                            <th className="pb-3 text-right">دخول — خروج</th>
                            <th className="pb-3 text-right">الاستراحات</th>
                            <th className="pb-3 text-right">الساعات</th>
                            <th className="pb-3 text-right">سعر الساعة</th>
                            <th className="pb-3 text-left">الأجر</th>
                            <th className="pb-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-omega-border/40 text-gray-800">
                          {sessions.map((session) => (
                            <tr key={session.id} className="hover:bg-omega-gray/10 transition-colors font-bold">
                              <td className="py-3.5 text-gray-900 font-black">{session.name}</td>
                              <td className="py-3.5">{formatDate(session.createdAt || session.checkIn)}</td>
                              <td className="py-3.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-900 font-bold">
                                    <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 text-[10px] font-black">دخول</span>
                                    <span>{formatTime(session.checkIn)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-omega-text-muted">
                                    {session.checkOut ? (
                                      <>
                                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 text-[10px] font-black">خروج</span>
                                        <span>{formatTime(session.checkOut)}</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-green-600 font-black animate-pulse flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-ping" />
                                        {session.status === 'break' ? 'في استراحة ☕' : 'قيد العمل الآن 👨‍🍳'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 text-[10px] text-omega-text-muted">{getBreakCountAndDuration(session.breaks)}</td>
                              <td className="py-3.5 text-gray-900 font-black">
                                {session.status !== 'completed' ? (
                                  <span className="text-green-600 font-black animate-pulse text-[10px]">يُحسب عند الخروج</span>
                                ) : `${session.totalHours || 0} ساعة`}
                              </td>
                              <td className="py-3.5">{session.hourlyRate || 0} د.ج</td>
                              <td className="py-3.5 text-left font-black text-omega-orange text-sm">
                                {session.status !== 'completed' ? (
                                  <span className="text-green-600 font-black animate-pulse text-[10px]">يُحسب عند الخروج</span>
                                ) : formatCurrency(session.totalPay || 0)}
                              </td>
                              <td className="py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {session.status !== 'completed' ? (
                                    <button onClick={() => handleForceCheckOut(session)}
                                      className="px-2 py-1.5 rounded-lg bg-omega-red hover:bg-omega-red-dark text-white font-black text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
                                      title="تسجيل الخروج النهائي">
                                      <IoStopOutline size={12} />
                                      <span>خروج</span>
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-[10px] font-black">مكتملة ✅</span>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSession(session)}
                                    disabled={deletingId === session.id}
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                                    title="حذف هذا السجل">
                                    <IoTrashOutline size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* ── عرض البطاقات ── */}
                {viewMode === 'cards' && (
                  workers.length === 0 ? (
                    <div className="text-center py-16 text-omega-text-dim text-sm flex flex-col items-center justify-center gap-3">
                      <IoPeopleOutline size={40} className="text-omega-text-muted opacity-50" />
                      <span>لا يوجد عمال مسجلين حتى الآن.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 pb-3" style={{ minWidth: 'max-content' }}>
                        {workers.map((worker) => {
                          const workerSessions = sessions.filter((s) => s.uid === worker.uid && s.status === 'completed');
                          const workerWithdrawals = withdrawals.filter((w) => w.uid === worker.uid);
                          const dailyData = getWorkerDailyData(workerSessions, workerWithdrawals);
                          const totalEarned = workerSessions.reduce((sum, s) => sum + (s.totalPay || 0), 0);
                          const totalWithdrawn = workerWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
                          const balance = totalEarned - totalWithdrawn;

                          return (
                            <div key={worker.uid} className="w-72 flex-shrink-0 omega-panel flex flex-col">
                              {/* رأس البطاقة */}
                              <div className="flex items-center justify-between mb-4 pb-3 border-b border-omega-border">
                                <div className="w-10 h-10 rounded-full bg-omega-orange/10 flex items-center justify-center flex-shrink-0">
                                  <IoPeopleOutline size={20} className="text-omega-orange" />
                                </div>
                                <div className="text-right">
                                  <h3 className="font-black text-gray-900 text-sm">{worker.name}</h3>
                                  <p className="text-[10px] text-omega-text-muted mt-0.5">{worker.hourlyRate || 0} د.ج / ساعة</p>
                                </div>
                              </div>

                              {/* السجلات اليومية */}
                              <div className="flex-1 space-y-2.5 max-h-80 overflow-y-auto mb-3 pl-1">
                                {dailyData.length === 0 ? (
                                  <p className="text-center py-8 text-omega-text-dim text-xs">لا توجد سجلات بعد</p>
                                ) : (
                                  dailyData.map((day) => (
                                    <div key={day.dateKey} className="p-2.5 rounded-xl bg-omega-gray/20 border border-omega-border/60">
                                      {/* التاريخ */}
                                      <p className="text-[10px] font-black text-gray-600 mb-2 border-b border-omega-border/40 pb-1">
                                        {formatDateLabel(day.dateKey)}
                                      </p>

                                      {/* الورديات */}
                                      {day.sessions.map((s, si) => (
                                        <div key={si} className="mb-2">
                                          <div className="flex justify-between items-center text-[10px] mb-1">
                                            <span className="text-green-600 font-bold">{formatTime(s.checkIn)}</span>
                                            <span className="text-omega-text-muted">→</span>
                                            <span className="text-red-500 font-bold">{formatTime(s.checkOut)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-black text-omega-orange">{formatCurrency(s.totalPay || 0)}</span>
                                            <span className="text-gray-600">{s.totalHours || 0} ساعة</span>
                                          </div>
                                        </div>
                                      ))}

                                      {/* السحوبات لهذا اليوم */}
                                      {day.withdrawals.map((w, wi) => (
                                        <div key={wi} className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-dashed border-red-200">
                                          <div className="flex items-center gap-1">
                                            <button onClick={() => handleDeleteWithdrawal(w)}
                                              className="text-red-300 hover:text-red-500 transition-colors cursor-pointer"
                                              title="حذف السحب">
                                              <IoTrashOutline size={10} />
                                            </button>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-black text-red-500">- {formatCurrency(w.amount)}</span>
                                            {w.note && <span className="text-omega-text-muted mr-1">({w.note})</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* الإجماليات */}
                              <div className="p-3 rounded-xl bg-gradient-to-b from-omega-gray/30 to-omega-gray/10 border border-omega-border space-y-1.5 mb-3">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-black text-green-600">{formatCurrency(totalEarned)}</span>
                                  <span className="text-omega-text-muted text-[10px]">إجمالي المستحق</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-black text-red-500">{formatCurrency(totalWithdrawn)}</span>
                                  <span className="text-omega-text-muted text-[10px]">إجمالي المسحوب</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-omega-border pt-1.5 mt-1">
                                  <span className={`font-black text-sm ${balance >= 0 ? 'text-omega-orange' : 'text-red-600'}`}>
                                    {formatCurrency(Math.abs(balance))}
                                  </span>
                                  <span className="text-gray-800 font-black text-[10px]">{balance >= 0 ? 'المتبقي له' : '⚠️ عليه'}</span>
                                </div>
                              </div>

                              {/* زر سحب مبلغ */}
                              <button
                                onClick={() => { setWithdrawalModal({ worker }); setWithdrawalAmount(''); setWithdrawalNote(''); }}
                                className="w-full py-2.5 rounded-xl border-2 border-dashed border-omega-orange/40 text-omega-orange text-xs font-black hover:bg-omega-orange/5 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                                <IoWalletOutline size={15} />
                                سحب مبلغ من الراتب
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}

              </div>
            </section>

          </div>
        )}
      </main>

      {/* مودال تأكيد تعديل سعر الساعة */}
      {rateConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRateConfirmModal(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setRateConfirmModal(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer">
                <IoCloseOutline size={20} />
              </button>
              <div className="text-right">
                <h3 className="font-black text-gray-900 text-base">تأكيد تعديل سعر الساعة</h3>
                <p className="text-xs text-gray-500 mt-0.5">{rateConfirmModal.name}</p>
              </div>
            </div>

            {/* تفاصيل التغيير */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-500 text-sm">{rateConfirmModal.oldRate} د.ج</span>
                <span className="text-xs text-gray-400">السعر الحالي</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="mx-3 text-lg">↓</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-omega-orange text-base">{rateConfirmModal.newRate} د.ج</span>
                <span className="text-xs text-gray-400">السعر الجديد</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-right mb-5">
              هل أنت متأكد من تعديل سعر ساعة الموظف <strong>{rateConfirmModal.name}</strong> من <strong>{rateConfirmModal.oldRate} د.ج</strong> إلى <strong>{rateConfirmModal.newRate} د.ج</strong>؟
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setRateConfirmModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-black text-sm hover:bg-gray-50 active:scale-95 transition-all cursor-pointer">
                إلغاء
              </button>
              <button
                disabled={updatingUid === rateConfirmModal.uid}
                onClick={async () => {
                  await handleSaveRate(rateConfirmModal.uid);
                  setRateConfirmModal(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-sm flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                <IoSaveOutline size={16} />
                {updatingUid === rateConfirmModal.uid ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال سحب الراتب */}
      {withdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWithdrawalModal(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setWithdrawalModal(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer">
                <IoCloseOutline size={20} />
              </button>
              <div className="text-right">
                <h3 className="font-black text-gray-900 text-base">سحب مبلغ من الراتب</h3>
                <p className="text-xs text-gray-500 mt-0.5">{withdrawalModal.worker.name}</p>
              </div>
            </div>

            <form onSubmit={handleAddWithdrawal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 text-right">المبلغ المسحوب (د.ج)</label>
                <input
                  type="number" required min="1"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-black text-center focus:outline-none focus:border-omega-orange"
                  placeholder="0" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 text-right">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={withdrawalNote}
                  onChange={(e) => setWithdrawalNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-omega-orange text-right"
                  placeholder="سبب السحب..." />
              </div>
              <button type="submit" disabled={addingWithdrawal}
                className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-sm flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                <IoAddOutline size={18} />
                {addingWithdrawal ? 'جاري التسجيل...' : 'تسجيل السحب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* مودال تأكيد حذف الموظف */}
      {deleteWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteWorkerModal(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            {/* أيقونة تحذير */}
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <IoTrashOutline size={30} className="text-red-500" />
            </div>
            <h3 className="font-black text-gray-900 text-lg text-center mb-1">حذف الموظف</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              هل أنت متأكد من حذف <strong className="text-gray-800">{deleteWorkerModal.name}</strong>؟
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-5 text-center">
              <p className="text-red-600 text-xs font-bold">⚠️ سيتم حذف بيانات الموظف نهائياً ولا يمكن التراجع</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteWorkerModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-black text-sm hover:bg-gray-50 active:scale-95 transition-all cursor-pointer">
                إلغاء
              </button>
              <button
                onClick={handleDeleteWorker}
                disabled={deletingWorker}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                <IoTrashOutline size={16} />
                {deletingWorker ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
