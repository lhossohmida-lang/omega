import { useState, useEffect, useMemo } from 'react';
import {
  getAllWorkers,
  getActiveSession,
  checkInWorker,
  goOnBreak,
  returnFromBreak,
  checkOutWorker,
  getWorkerSessions
} from '../services/attendanceService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import {
  IoTimeOutline,
  IoPlayOutline,
  IoStopOutline,
  IoCafeOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoPersonOutline,
  IoChevronDown,
  IoFlame,
  IoRestaurant
} from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function PublicAttendance() {
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  
  // Attendance states
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. جلب قائمة العمال المسجلين عند تحميل الصفحة
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const data = await getAllWorkers();
        setWorkers(data);
      } catch (e) {
        console.error('Error loading workers:', e);
      }
    };
    loadWorkers();
  }, []);

  // 2. تحميل بيانات الحضور والرواتب للموظف المختار
  const loadWorkerData = async (uid) => {
    if (!uid) {
      setSelectedWorker(null);
      setActiveSession(null);
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const worker = workers.find((w) => w.uid === uid);
      setSelectedWorker(worker);
      
      const active = await getActiveSession(uid);
      setActiveSession(active);
      
      const logs = await getWorkerSessions(uid);
      setHistory(logs);
    } catch (e) {
      console.error('Error loading worker details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWorkerId) {
      loadWorkerData(selectedWorkerId);
    }
  }, [selectedWorkerId, workers]);

  // 3. معالجات الدخول والخروج والاستراحة
  const handleCheckIn = async () => {
    if (!selectedWorker) return;
    setActionLoading(true);
    try {
      const session = await checkInWorker(selectedWorker.uid, selectedWorker.name, selectedWorker.hourlyRate || 0);
      setActiveSession(session);
      toast.success(`أهلاً بك شيف ${selectedWorker.name}! تم تسجيل دخولك للدوام بنجاح 👨‍🍳 بالتوفيق!`);
      loadWorkerData(selectedWorker.uid);
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل الدخول للدوام');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoOnBreak = async () => {
    if (!activeSession || !selectedWorker) return;
    setActionLoading(true);
    try {
      await goOnBreak(activeSession.id, activeSession.breaks || []);
      toast('تم تسجيل خروجك المؤقت للاستراحة ☕ خذ وقتاً ممتعاً!', { icon: '⏸️' });
      loadWorkerData(selectedWorker.uid);
    } catch (e) {
      toast.error(e.message || 'فشل المغادرة المؤقتة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnFromBreak = async () => {
    if (!activeSession || !selectedWorker) return;
    setActionLoading(true);
    try {
      await returnFromBreak(activeSession.id, activeSession.breaks || []);
      toast.success('مرحباً بعودتك! تم استئناف وردية العمل بنجاح 🔥');
      loadWorkerData(selectedWorker.uid);
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل عودة الدخول');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeSession || !selectedWorker) return;
    const ok = confirm('هل أنت متأكد من إنهاء الدوام وتسجيل الخروج النهائي؟');
    if (!ok) return;

    setActionLoading(true);
    try {
      const result = await checkOutWorker(activeSession.id, activeSession, selectedWorker.hourlyRate || 0);
      setActiveSession(null);
      toast.success(
        `عمل رائع! تم تسجيل خروجك بنجاح ✅\nساعات العمل المنجزة: ${result.totalHours} ساعة\nالأجر المالي المستحق: ${result.totalPay} د.ج`,
        { duration: 7000 }
      );
      loadWorkerData(selectedWorker.uid);
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل الخروج النهائي');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. مساعدي تنسيق البيانات
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800" dir="rtl">
      
      {/* الهيدر العلوي */}
      <header className="bg-white border-b border-gray-150 py-4 px-6 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-l from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white shadow-md">
            <IoRestaurant size={22} />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">بوابة تسجيل دوام موظفي OMEGA</h1>
            <p className="text-[10px] font-bold text-gray-400">سجل حضورك وانصرافك وراجع راتبك اليومي بضغطة زر</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-xl bg-orange-50 text-orange-600 text-xs font-black">
          بوابة عامة 🔓
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* اختيار اسم الموظف */}
        <section className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-right">
            <h2 className="text-sm font-black text-gray-900">مرحباً بك في نظام الحضور اليومي</h2>
            <p className="text-xs text-gray-500 mt-0.5">يرجى تحديد اسمك من القائمة أدناه للوصول إلى لوحة التحكم الخاصة بك:</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-250 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
            >
              <option value="">-- اختر اسمك من القائمة --</option>
              {workers.map((w) => (
                <option key={w.uid} value={w.uid}>
                  {w.name} {w.phone ? `(${w.phone})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <IoChevronDown size={18} />
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none">
              <IoPersonOutline size={18} />
            </div>
          </div>
        </section>

        {!selectedWorkerId ? (
          /* واجهة الاستقبال والترحيب في حال عدم اختيار أي اسم */
          <section className="bg-white rounded-3xl border border-gray-150 p-8 text-center flex flex-col items-center justify-center gap-4 py-16 shadow-sm">
            <span className="text-6xl animate-bounce">👋</span>
            <h3 className="text-lg font-black text-gray-900 mt-2">يرجى اختيار اسمك للبدء</h3>
            <p className="text-sm text-gray-500 max-w-md leading-relaxed">
              لقد ألغينا الحاجة لتسجيل الدخول ببريد إلكتروني وكلمة مرور لتسهيل العمل! اختر اسمك فقط من القائمة بالأعلى لتسجيل الدخول اليومي أو مراجعة أجور فترات عملك السابقة.
            </p>
          </section>
        ) : loading ? (
          /* واجهة التحميل */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-150">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 text-sm font-bold">جاري جلب سجلات حضورك وأجورك...</p>
          </div>
        ) : (
          /* لوحة التحكم الخاصة بالموظف المحدد */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* 1. العمود الجانبي: حالة الموظف وأزرار الحضور والانصراف */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* بطاقة التحكم بالوردية */}
              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm relative overflow-hidden">
                <h3 className="text-xs font-black text-gray-400 mb-4 uppercase">حالة الدوام للوردية الحالية</h3>
                
                <div className="flex items-center gap-3 mb-6">
                  {activeSession?.status === 'active' ? (
                    <>
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                      </span>
                      <strong className="text-green-600 text-base font-black">أنت قيد العمل والدوام الآن 👨‍🍳</strong>
                    </>
                  ) : activeSession?.status === 'break' ? (
                    <>
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                      </span>
                      <strong className="text-orange-500 text-base font-black">أنت في استراحة مؤقتة ☕</strong>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                      </span>
                      <strong className="text-red-500 text-base font-black">خارج أوقات العمل حالياً 🚪</strong>
                    </>
                  )}
                </div>

                {activeSession && (
                  <div className="space-y-3 mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600">
                    <div className="flex justify-between">
                      <span>ساعة بدء الدوام:</span>
                      <span className="text-gray-900">{formatTime(activeSession.checkIn)}</span>
                    </div>
                    {activeSession.breaks?.length > 0 && (
                      <div className="flex justify-between">
                        <span>الاستراحات المأخوذة:</span>
                        <span className="text-orange-500">{getBreakCountAndDuration(activeSession.breaks)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200/60 my-2 pt-2 flex justify-between">
                      <span>سعر ساعة عملك:</span>
                      <span className="text-orange-600 font-black">{activeSession.hourlyRate || 0} د.ج/ساعة</span>
                    </div>
                  </div>
                )}

                {!activeSession && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 mb-6">
                    <div className="flex justify-between items-center">
                      <span>سعر ساعة عملك اليوم:</span>
                      <span className="text-orange-600 font-black text-sm">{selectedWorker.hourlyRate || 0} د.ج/ساعة</span>
                    </div>
                  </div>
                )}

                {/* أزرار التحكم بالدوام */}
                <div className="space-y-3">
                  {!activeSession ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={actionLoading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-l from-green-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 hover:shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <IoPlayOutline size={20} />
                      <span>تسجيل دخول وبدء الدوام</span>
                    </button>
                  ) : (
                    <>
                      {activeSession.status === 'active' ? (
                        <button
                          onClick={handleGoOnBreak}
                          disabled={actionLoading}
                          className="w-full py-3.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <IoCafeOutline size={20} />
                          <span>خروج مؤقت (استراحة)</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleReturnFromBreak}
                          disabled={actionLoading}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-green-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 hover:shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <IoPlayOutline size={20} />
                          <span>عودة للعمل واستئناف</span>
                        </button>
                      )}

                      <button
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-l from-red-500 to-rose-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <IoStopOutline size={20} />
                        <span>تسجيل خروج نهائي للدوام</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* إرشادات الدوام */}
              <div className="bg-white rounded-3xl p-5 border border-gray-150 text-xs text-gray-500 leading-relaxed text-right">
                <h4 className="font-black text-orange-500 mb-2 flex items-center gap-1.5">
                  <IoFlame size={14} /> إرشادات هامة للموظف
                </h4>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>يرجى الضغط على <strong>تسجيل دخول</strong> عند بداية استلام ورديتك فوراً.</li>
                  <li>إذا خرجت من المطعم لأي سبب شخصي في منتصف العمل، سجل <strong>استراحة</strong> ثم سجل <strong>عودة للعمل</strong> عند رجوعك.</li>
                  <li>عند انتهاء ساعات عملك، سجل <strong>خروج نهائي</strong> لحساب صافي أجرك المالي وإرساله للوحة تحكم صاحب الإدارة.</li>
                </ul>
              </div>
            </div>

            {/* 2. العمود الأيسر: سجل الحضور وتفاصيل الرواتب */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <IoCalendarOutline className="text-orange-500" size={20} />
                    <h3 className="text-sm font-black text-gray-900">سجل وردياتك وأجورك السابقة</h3>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500 font-bold">
                    عدد الورديات: {history.length}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-xs flex flex-col items-center justify-center gap-3">
                    <IoTimeOutline size={40} className="text-gray-300 opacity-80" />
                    <span>لا توجد أي سجلات دوام سابقة مسجلة لاسمك حالياً.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-black">
                          <th className="pb-3 text-right">التاريخ</th>
                          <th className="pb-3 text-right">وقت الوردية (دخول - خروج)</th>
                          <th className="pb-3 text-right">الاستراحات</th>
                          <th className="pb-3 text-right">الساعات</th>
                          <th className="pb-3 text-right">سعر الساعة</th>
                          <th className="pb-3 text-left">الأجر المستحق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {history.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50/50 transition-colors font-bold">
                            <td className="py-3.5 text-gray-900 font-bold">{formatDate(session.createdAt || session.checkIn)}</td>
                            
                            {/* عرض الدخول والخروج في نفس الخانة بتناسق كامل */}
                            <td className="py-3.5">
                              <div className="flex flex-col gap-1 text-right">
                                <div className="flex items-center gap-1.5 text-xs text-gray-900 font-bold">
                                  <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 text-[10px] font-black">دخول</span>
                                  <span>{formatTime(session.checkIn)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  {session.checkOut ? (
                                    <>
                                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-black">خروج</span>
                                      <span>{formatTime(session.checkOut)}</span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-green-600 font-black animate-pulse flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-ping" />
                                      {session.status === 'break' ? 'في استراحة ☕' : 'قيد العمل 👨‍🍳'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 text-[10px] text-gray-400">
                              {getBreakCountAndDuration(session.breaks)}
                            </td>
                            <td className="py-3.5 text-gray-900 font-black">
                              {session.status !== 'completed' ? (
                                <span className="text-green-600 font-black animate-pulse">يُحسب عند الخروج</span>
                              ) : (
                                `${session.totalHours || 0} ساعة`
                              )}
                            </td>
                            <td className="py-3.5 text-gray-500">{session.hourlyRate || 0} د.ج</td>
                            <td className="py-3.5 text-left font-black text-orange-600 text-sm">
                              {session.status !== 'completed' ? (
                                <span className="text-green-600 font-black animate-pulse">يُحسب عند الخروج</span>
                              ) : (
                                `${formatCurrency(session.totalPay || 0)}`
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-150 py-4 text-center text-xs text-gray-400 font-bold mt-auto">
        OMEGA Restaurant App © {new Date().getFullYear()} — طعام بجودة عالية وأداء سريع.
      </footer>
    </div>
  );
}
