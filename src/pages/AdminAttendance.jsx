import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import {
  getAllWorkers,
  getAllSessions,
  updateWorkerHourlyRate,
  registerNewWorker,
  registerManualSession,
  checkOutWorker
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
  IoCheckmarkCircle,
  IoPersonAddOutline,
  IoStopOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function AdminAttendance() {
  const [workers, setWorkers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState(null);
  const [rates, setRates] = useState({}); // لتخزين المدخلات المؤقتة لسعر الساعة

  // استمارة إضافة عامل جديد
  const [newWorker, setNewWorker] = useState({
    name: '',
    phone: '',
    hourlyRate: ''
  });
  const [registering, setRegistering] = useState(false);

  // استمارة تسجيل حضور وانصراف يدوي
  const [manualSession, setManualSession] = useState({
    uid: '',
    checkIn: '',
    checkOut: '',
    hourlyRate: ''
  });
  const [registeringManual, setRegisteringManual] = useState(false);

  const handleManualWorkerChange = (uid) => {
    const selected = workers.find(w => w.uid === uid);
    setManualSession(prev => ({
      ...prev,
      uid,
      hourlyRate: selected ? (selected.hourlyRate || 0) : ''
    }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersData, sessionsData] = await Promise.all([
        getAllWorkers(),
        getAllSessions()
      ]);
      setWorkers(workersData);
      setSessions(sessionsData);

      // تعبئة المدخلات المؤقتة لسعر الساعة لكل عامل
      const ratesMap = {};
      workersData.forEach(w => {
        ratesMap[w.uid] = w.hourlyRate || 0;
      });
      setRates(ratesMap);
    } catch (error) {
      console.error('Error loading admin attendance data:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الحضور والأجور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRateChange = (uid, val) => {
    setRates(prev => ({
      ...prev,
      [uid]: val
    }));
  };

  const handleSaveRate = async (uid) => {
    const rate = Number(rates[uid]);
    if (isNaN(rate) || rate < 0) {
      toast.error('يرجى إدخال سعر ساعة صحيح');
      return;
    }
    setUpdatingUid(uid);
    try {
      await updateWorkerHourlyRate(uid, rate);
      toast.success('تم تحديث سعر ساعة العامل بنجاح ✅');
      loadData(); // إعادة التحميل لتحديث البيانات
    } catch (e) {
      toast.error(e.message || 'فشل تحديث سعر الساعة');
    } finally {
      setUpdatingUid(null);
    }
  };

  // تسجيل موظف جديد دون تسجيل خروج المسؤول
  const handleRegisterWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.hourlyRate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setRegistering(true);
    try {
      await registerNewWorker({
        name: newWorker.name,
        phone: newWorker.phone,
        hourlyRate: Number(newWorker.hourlyRate) || 0
      });
      
      toast.success(`تم تسجيل الموظف ${newWorker.name} بنجاح ✅`);
      setNewWorker({
        name: '',
        phone: '',
        hourlyRate: ''
      });
      loadData(); // تحديث القائمة فوراً
    } catch (error) {
      toast.error(error.message || 'فشل تسجيل حساب العامل الجديد');
    } finally {
      setRegistering(false);
    }
  };

  // تسجيل وردية حضور يدوية لعامل
  const handleRegisterManualSession = async (e) => {
    e.preventDefault();
    const { uid, checkIn, checkOut, hourlyRate } = manualSession;
    if (!uid || !checkIn || !checkOut || !hourlyRate) {
      toast.error('يرجى ملء جميع حقول الوردية اليدوية');
      return;
    }

    const selectedWorker = workers.find(w => w.uid === uid);
    if (!selectedWorker) return;

    setRegisteringManual(true);
    try {
      await registerManualSession({
        uid,
        name: selectedWorker.name,
        checkIn,
        checkOut,
        hourlyRate: Number(hourlyRate) || 0
      });

      toast.success(`تم تسجيل حضور وانصراف الموظف ${selectedWorker.name} يدوياً بنجاح ✅`);
      setManualSession({
        uid: '',
        checkIn: '',
        checkOut: '',
        hourlyRate: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.message || 'فشل تسجيل الوردية اليدوية');
    } finally {
      setRegisteringManual(false);
    }
  };

  // تسجيل خروج قسري لموظف قيد العمل
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

  // إحصائيات عامة
  const stats = useMemo(() => {
    let totalHours = 0;
    let totalPay = 0;
    const completedSessions = sessions.filter(s => s.status === 'completed');

    completedSessions.forEach(s => {
      totalHours += s.totalHours || 0;
      totalPay += s.totalPay || 0;
    });

    return {
      totalHours: Number(totalHours.toFixed(2)),
      totalPay: Math.round(totalPay),
      completedCount: completedSessions.length,
      activeCount: sessions.filter(s => ['active', 'break'].includes(s.status)).length
    };
  }, [sessions]);

  // تنسيق الوقت والتاريخ
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
            <div className="omega-stat-icon">
              <IoCashOutline size={28} />
            </div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">إجمالي الأجور المستحقة</p>
              <strong className="omega-stat-value">{formatCurrency(stats.totalPay)}</strong>
              <span className="omega-stat-hint">للورديات المكتملة</span>
            </div>
          </article>

          <article className="omega-stat-card omega-stat-gold">
            <div className="omega-stat-icon">
              <IoTimeOutline size={28} />
            </div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">إجمالي ساعات العمل</p>
              <strong className="omega-stat-value">{formatNumber(stats.totalHours)} ساعة</strong>
              <span className="omega-stat-hint">لكافة العمال</span>
            </div>
          </article>

          <article className="omega-stat-card omega-stat-green">
            <div className="omega-stat-icon">
              <IoPeopleOutline size={28} />
            </div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">العمال النشطون حالياً</p>
              <strong className="omega-stat-value">{stats.activeCount} عمال</strong>
              <span className="omega-stat-hint">قيد العمل أو الاستراحة الآن</span>
            </div>
          </article>

          <article className="omega-stat-card omega-stat-gold">
            <div className="omega-stat-icon">
              <IoCalendarOutline size={28} />
            </div>
            <div className="omega-stat-content">
              <p className="omega-stat-label">عدد الورديات المسجلة</p>
              <strong className="omega-stat-value">{stats.completedCount} وردية</strong>
              <span className="omega-stat-hint">مكتملة ومحسوبة</span>
            </div>
          </article>
        </section>

        {loading ? (
          <div className="omega-loading-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton omega-loading-card h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* 1. العمود الجانبي: إضافة العمال وتعديل الأجور */}
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
                    <input
                      type="text"
                      required
                      value={newWorker.name}
                      onChange={(e) => setNewWorker(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold"
                      placeholder="مثال: الشيف أحمد علي"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={newWorker.phone}
                        onChange={(e) => setNewWorker(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold"
                        placeholder="0550000000"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">سعر الساعة (د.ج)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newWorker.hourlyRate}
                        onChange={(e) => setNewWorker(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center"
                        placeholder="200"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-omega-orange/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <IoPersonAddOutline size={16} />
                    <span>{registering ? 'جاري تسجيل العامل...' : 'تسجيل الموظف الجديد في النظام'}</span>
                  </button>
                </form>
              </div>

              {/* نموذج تسجيل حضور وانصراف يدوي */}
              <div className="omega-panel">
                <div className="omega-section-head mb-4">
                  <IoCalendarOutline size={20} className="text-omega-orange" />
                  <h2>تسجيل حضور وانصراف يدوي</h2>
                </div>
                <form onSubmit={handleRegisterManualSession} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">اختر الموظف</label>
                    <select
                      required
                      value={manualSession.uid}
                      onChange={(e) => handleManualWorkerChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold cursor-pointer"
                    >
                      <option value="">-- اختر الموظف --</option>
                      {workers.map((w) => (
                        <option key={w.uid} value={w.uid}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">وقت الدخول</label>
                      <input
                        type="datetime-local"
                        required
                        value={manualSession.checkIn}
                        onChange={(e) => setManualSession(prev => ({ ...prev, checkIn: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">وقت الخروج</label>
                      <input
                        type="datetime-local"
                        required
                        value={manualSession.checkOut}
                        onChange={(e) => setManualSession(prev => ({ ...prev, checkOut: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-omega-text-muted mb-1 text-right">سعر الساعة للوردية (د.ج)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={manualSession.hourlyRate}
                      onChange={(e) => setManualSession(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-omega-border bg-white text-gray-900 text-xs focus:outline-none focus:border-omega-orange font-bold text-center"
                      placeholder="200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registeringManual}
                    className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-omega-orange/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <IoCalendarOutline size={16} />
                    <span>{registeringManual ? 'جاري تسجيل الوردية...' : 'تسجيل الوردية اليدوية في النظام'}</span>
                  </button>
                </form>
              </div>

              {/* لوحة إعدادات أجور العمال */}
              <div className="omega-panel">
                <div className="omega-section-head mb-4">
                  <IoSettingsOutline size={20} className="text-omega-orange" />
                  <h2>تعديل سعر ساعة العمال المسجلين</h2>
                </div>

                {workers.length === 0 ? (
                  <p className="text-center py-6 text-omega-text-dim text-sm">لا يوجد عمال مسجلين حالياً دور worker.</p>
                ) : (
                  <div className="space-y-4">
                    {workers.map((worker) => (
                      <div key={worker.uid} className="flex items-center justify-between p-3.5 rounded-2xl bg-omega-gray/20 border border-omega-border">
                        <div className="text-right">
                          <h4 className="font-black text-gray-900 text-sm">{worker.name}</h4>
                          <p className="text-[11px] text-omega-text-muted mt-0.5">{worker.phone || 'بدون رقم هاتف'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              value={rates[worker.uid] !== undefined ? rates[worker.uid] : ''}
                              onChange={(e) => handleRateChange(worker.uid, e.target.value)}
                              className="w-20 px-2 py-1.5 rounded-xl border border-omega-border bg-white text-gray-900 font-bold text-center text-xs focus:outline-none focus:border-omega-orange"
                              placeholder="0"
                              min="0"
                            />
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold">د.ج</span>
                          </div>

                          <button
                            onClick={() => handleSaveRate(worker.uid)}
                            disabled={updatingUid === worker.uid}
                            className="p-2 rounded-xl bg-omega-orange text-white hover:bg-omega-orange-dark active:scale-95 transition-all disabled:opacity-50"
                            title="حفظ سعر الساعة"
                          >
                            <IoSaveOutline size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 2. سجل الحضور والورديات بالكامل */}
            <section className="xl:col-span-2 flex flex-col gap-6">
              <div className="omega-panel">
                <div className="omega-section-head mb-4 flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <IoCalendarOutline size={20} className="text-omega-orange" />
                    <h2>سجل الحضور والورديات التفصيلي</h2>
                  </div>
                  <button
                    onClick={loadData}
                    className="p-2 rounded-xl bg-omega-gray hover:bg-omega-gray-light text-gray-800 transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <IoRefreshOutline size={16} />
                    <span>تحديث البيانات</span>
                  </button>
                </div>

                {sessions.length === 0 ? (
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
                          <th className="pb-3 text-right">وقت الدوام (دخول - خروج)</th>
                          <th className="pb-3 text-right">الاستراحات</th>
                          <th className="pb-3 text-right">صافي الساعات</th>
                          <th className="pb-3 text-right">سعر الساعة</th>
                          <th className="pb-3 text-left">الأجر المحتسب</th>
                          <th className="pb-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-omega-border/40 text-gray-800">
                        {sessions.map((session) => (
                          <tr key={session.id} className="hover:bg-omega-gray/10 transition-colors font-bold">
                            <td className="py-3.5 text-gray-900 font-black">{session.name}</td>
                            <td className="py-3.5">{formatDate(session.createdAt || session.checkIn)}</td>
                            
                            {/* الخانة الموحدة لتسجيل الدخول والخروج معاً */}
                            <td className="py-3.5">
                              <div className="flex flex-col gap-1 text-right">
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
                                      {session.status === 'break' ? 'في استراحة مؤقتة ☕' : 'قيد العمل الآن 👨‍🍳'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 text-[10px] text-omega-text-muted">
                              {getBreakCountAndDuration(session.breaks)}
                            </td>
                            <td className="py-3.5 text-gray-900 font-black text-xs">
                              {session.status !== 'completed' ? (
                                <span className="text-green-600 font-black animate-pulse">يُحسب عند الخروج</span>
                              ) : (
                                `${session.totalHours || 0} ساعة`
                              )}
                            </td>
                            <td className="py-3.5">{session.hourlyRate || 0} د.ج</td>
                            <td className="py-3.5 text-left font-black text-omega-orange text-sm">
                              {session.status !== 'completed' ? (
                                <span className="text-green-600 font-black animate-pulse">يُحسب عند الخروج</span>
                              ) : (
                                `${formatCurrency(session.totalPay || 0)}`
                              )}
                            </td>
                            <td className="py-3.5 text-center">
                              {session.status !== 'completed' ? (
                                <button
                                  onClick={() => handleForceCheckOut(session)}
                                  className="px-2.5 py-1.5 rounded-lg bg-omega-red hover:bg-omega-red-dark text-white font-black text-[10px] flex items-center justify-center gap-1 mx-auto active:scale-95 transition-all shadow-sm shadow-omega-red/10 cursor-pointer"
                                  title="تسجيل الخروج النهائي للموظف"
                                >
                                  <IoStopOutline size={12} />
                                  <span>تسجيل خروج</span>
                                </button>
                              ) : (
                                <span className="text-gray-400 text-[10px] font-black">مكتملة ✅</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
