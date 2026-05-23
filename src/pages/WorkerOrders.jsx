import { useState, useEffect, useMemo, useRef } from 'react';
import {
  subscribeToWorkerOrders,
  setItemStatus,
  archiveWorkerOrder,
  archiveAllReadyOrders,
} from '../services/orderService';
import {
  getAllWorkers,
  getActiveSession,
  checkInWorker,
  goOnBreak,
  returnFromBreak,
  checkOutWorker,
  getWorkerSessions
} from '../services/attendanceService';
import localSync, { SYNC_EVENTS } from '../services/localSync';
import { playLoudAlarm } from '../utils/soundUtils';
import { timeAgo } from '../utils/formatDate';
import WorkerSidebar from '../components/WorkerSidebar';
import InstallAppButton from '../components/InstallAppButton';
import CategoryIcon from '../components/CategoryIcon';
import {
  IoNotificationsOutline,
  IoRestaurant,
  IoTimeOutline,
  IoRestaurantOutline,
  IoAlarmOutline,
  IoDocumentTextOutline,
  IoCallOutline,
  IoFlame,
  IoCheckmarkCircle,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoTrashOutline,
  IoArrowUndoOutline,
  IoCarOutline,
  IoPlayOutline,
  IoStopOutline,
  IoCafeOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoArrowForward,
  IoArrowBack
} from 'react-icons/io5';
import toast from 'react-hot-toast';

// أقسام المطبخ — كل قسم يجمع كل أصنافه من جميع الطلبات النشطة
const CATEGORIES = [
  { id: 'offers',     label: 'عروض خاصة', emoji: '🏷️', tone: 'yellow' },
  { id: 'pizza',      label: 'بيتزا',   emoji: '🍕', tone: 'red'    },
  { id: 'tacos',      label: 'تاكوس',   emoji: '🌮', tone: 'orange' },
  { id: 'burger',     label: 'برغر',    emoji: '🍔', tone: 'yellow' },
  { id: 'appetizers', label: 'مقبلات',  emoji: '🍟', tone: 'pink'   },
  { id: 'drinks',     label: 'مشروبات', emoji: '🥤', tone: 'blue'   },
  { id: 'desserts',   label: 'حلويات',  emoji: '🍰', tone: 'red'    },
  { id: 'sofli',      label: 'سوفلي',   emoji: '🍮', iconUrl: '/sofli-icon.png', tone: 'yellow' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

function fmtClock(d = new Date()) {
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function categoryFromItem(item) {
  if (item.type === 'offer') return 'offers';
  const cat = (item.category || '').toLowerCase();
  return CATEGORY_MAP[cat] ? cat : 'appetizers';
}

export default function WorkerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState(fmtClock());
  const previousCountRef = useRef(0);

  // Attendance states — per-worker selection (no Firebase login required)
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load all workers once on mount
  useEffect(() => {
    getAllWorkers().then(setWorkers).catch(console.error);
  }, []);

  // Clock ticker
  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load session data whenever selected worker or tab changes
  const loadAttendanceData = async (uid) => {
    const id = uid ?? selectedWorkerId;
    if (!id) return;
    setAttendanceLoading(true);
    try {
      const active = await getActiveSession(id);
      setActiveSession(active);
      const history = await getWorkerSessions(id);
      setAttendanceHistory(history);
    } catch (e) {
      console.error('Error fetching attendance data:', e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleWorkerSelect = async (uid) => {
    setSelectedWorkerId(uid);
    if (!uid) {
      setSelectedWorker(null);
      setActiveSession(null);
      setAttendanceHistory([]);
      return;
    }
    const w = workers.find(wk => wk.uid === uid) || null;
    setSelectedWorker(w);
    await loadAttendanceData(uid);
  };

  useEffect(() => {
    if (activeTab === 'attendance' && selectedWorkerId) {
      loadAttendanceData(selectedWorkerId);
    }
  }, [activeTab]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 6000);

    const unsubOrders = subscribeToWorkerOrders((data) => {
      clearTimeout(timeout);
      const visible = data.filter((o) => !o.workerArchived);
      setOrders(visible);
      setLoading(false);
 
      if (
        soundOn &&
        previousCountRef.current > 0 &&
        visible.length > previousCountRef.current
      ) {
        playLoudAlarm();
        toast('طلب جديد وصل! 🍽️', { icon: '🔔' });
      }
      previousCountRef.current = visible.length;
    });

    // إشعار من الإدارة بطلب جديد (شبكة محلية)
    const unsubNew = localSync.on(SYNC_EVENTS.ORDER_CREATED, () => {
      if (soundOn) playLoudAlarm();
      toast('🔔 طلب جديد من الإدارة!', { duration: 4000 });
    });
    // تحديث حالة طلب من الإدارة (ex: تسليم)
    const unsubUpd = localSync.on(SYNC_EVENTS.ORDER_UPDATED, () => {
      toast('🔄 تحديث من الإدارة', { duration: 1500 });
    });

    return () => {
      clearTimeout(timeout);
      unsubOrders();
      unsubNew();
      unsubUpd();
    };
  }, [soundOn]);

  // Attendance handlers
  const handleCheckIn = async () => {
    if (!selectedWorker) return;
    setActionLoading(true);
    try {
      const session = await checkInWorker(selectedWorker.uid, selectedWorker.name, selectedWorker.hourlyRate || 0);
      setActiveSession(session);
      toast.success(`أهلاً ${selectedWorker.name}! تم تسجيل دخولك للدوام بنجاح 👨‍🍳 بالتوفيق!`);
      loadAttendanceData();
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل الدخول للدوام');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoOnBreak = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await goOnBreak(activeSession.id, activeSession.breaks || []);
      toast('تم تسجيل خروجك المؤقت للاستراحة ☕', { icon: '⏸️' });
      loadAttendanceData();
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل الخروج المؤقت');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnFromBreak = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await returnFromBreak(activeSession.id, activeSession.breaks || []);
      toast.success('مرحباً بعودتك! تم استئناف الدوام 🔥');
      loadAttendanceData();
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل عودة الدخول');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeSession || !selectedWorker) return;
    const ok = confirm(`هل أنت متأكد من إنهاء دوام ${selectedWorker.name} وتسجيل الخروج النهائي؟`);
    if (!ok) return;

    setActionLoading(true);
    try {
      const result = await checkOutWorker(activeSession.id, activeSession, selectedWorker.hourlyRate || 0);
      setActiveSession(null);
      toast.success(
        `تم تسجيل خروج ${selectedWorker.name} بنجاح! ✅\nساعات العمل: ${result.totalHours} ساعة\nالأجر المحتسب: ${result.totalPay} د.ج`,
        { duration: 6000 }
      );
      loadAttendanceData();
    } catch (e) {
      toast.error(e.message || 'فشل تسجيل الخروج النهائي');
    } finally {
      setActionLoading(false);
    }
  };

  // Format Helpers
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

  // بناء قسم واحد لكل تصنيف يحتوي كل صفوف الأصناف من جميع الطلبات
  const categoryGroups = useMemo(() => {
    const groups = Object.fromEntries(CATEGORIES.map(c => [c.id, []]));
    for (const order of orders) {
      (order.items || []).forEach((item, index) => {
        const cat = categoryFromItem(item);
        const itemStatus = order.itemStatuses?.[String(index)] || 'new';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push({
          order,
          item,
          index,
          itemStatus,
          key: `${order.id}-${index}`,
        });
      });
    }
    const rank = { new: 0, preparing: 1, ready: 2 };
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        const r = rank[a.itemStatus] - rank[b.itemStatus];
        if (r !== 0) return r;
        const at = a.order.createdAt?.seconds || 0;
        const bt = b.order.createdAt?.seconds || 0;
        return bt - at;
      });
    }
    return groups;
  }, [orders]);

  const counts = useMemo(() => {
    let totalItems = 0, preparing = 0, ready = 0, newItems = 0;
    for (const order of orders) {
      (order.items || []).forEach((_, i) => {
        totalItems++;
        const s = order.itemStatuses?.[String(i)] || 'new';
        if (s === 'preparing') preparing++;
        else if (s === 'ready') ready++;
        else newItems++;
      });
    }
    return { total: totalItems, preparing, ready, new: newItems };
  }, [orders]);

  const handleStartItem = async (orderId, itemIndex) => {
    setActing(`${orderId}-${itemIndex}`);
    try {
      await setItemStatus(orderId, itemIndex, 'preparing');
      toast.success('بدأ التحضير 🔥');
      localSync.emit(SYNC_EVENTS.ORDER_UPDATED, { orderId, itemIndex, status: 'preparing' });
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleReadyItem = async (orderId, itemIndex) => {
    setActing(`${orderId}-${itemIndex}`);
    try {
      await setItemStatus(orderId, itemIndex, 'ready');
      toast.success('جاهز ✅');
      localSync.emit(SYNC_EVENTS.ORDER_UPDATED, { orderId, itemIndex, status: 'ready' });
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleResetItem = async (orderId, itemIndex) => {
    setActing(`${orderId}-${itemIndex}`);
    try {
      await setItemStatus(orderId, itemIndex, null);
      toast('تم إعادة الصنف للحالة الأولى', { icon: '↩️' });
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleArchive = async (orderId) => {
    setActing(`archive-${orderId}`);
    try {
      await archiveWorkerOrder(orderId);
      toast.success('تم حذف الطلب من الواجهة 🗑️');
    } catch (e) {
      toast.error(e.message || 'فشل الحذف');
    }
    setActing(null);
  };

  const handleClearAllReady = async () => {
    const readyOrders = orders.filter((o) => o.workerReady && !o.workerArchived);
    if (readyOrders.length === 0) {
      toast('لا توجد طلبات جاهزة لحذفها', { icon: 'ℹ️' });
      return;
    }
    const ok = confirm(`حذف ${readyOrders.length} طلب جاهز من الواجهة؟`);
    if (!ok) return;
    try {
      await archiveAllReadyOrders(readyOrders.map((o) => o.id));
      toast.success(`تم حذف ${readyOrders.length} طلب ✅`);
    } catch (e) {
      toast.error(e.message || 'فشل الحذف');
    }
  };

  return (
    <div className="kitchen-page" dir="rtl">
      <WorkerSidebar
        active={activeTab}
        onChangeTab={setActiveTab}
      />

      <main className="kitchen-main">
        <header className="kitchen-header">
          <div className="kitchen-header-actions">
            <InstallAppButton target="worker" className="kitchen-install-header-btn" compact />
            {activeTab === 'orders' && (
              <>
                <button type="button" className="kitchen-bell" aria-label="إشعارات">
                  <IoNotificationsOutline size={20} />
                  {counts.new > 0 && <span className="kitchen-bell-badge">{counts.new}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setSoundOn((v) => !v)}
                  className="kitchen-sound-toggle"
                >
                  {soundOn ? (
                    <IoVolumeHighOutline size={18} />
                  ) : (
                    <IoVolumeMuteOutline size={18} />
                  )}
                  <span>تنبيه صوتي</span>
                  <span className={`kitchen-toggle${soundOn ? ' on' : ''}`}>
                    <span />
                  </span>
                </button>
                {counts.ready > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllReady}
                    className="kitchen-clear-btn"
                    title="حذف كل الطلبات الجاهزة من الواجهة"
                  >
                    <IoTrashOutline size={16} />
                    <span>حذف الجاهزة</span>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="kitchen-header-title">
            <div className="kitchen-header-text">
              <h1>{activeTab === 'orders' ? 'واجهة المطبخ' : 'تسجيل الدوام والأجور'}</h1>
              <p>
                {activeTab === 'orders' 
                  ? 'كل قسم في مكان واحد — توصيل أخضر، طاولة أحمر'
                  : 'سجل دخولك عند بدء العمل، وخروجك عند الانتهاء لحساب أجرك اليومي تلقائياً'
                }
              </p>
            </div>
            <div className="kitchen-header-logo">
              {activeTab === 'orders' ? <IoRestaurant size={28} /> : <IoTimeOutline size={28} />}
            </div>
          </div>
        </header>

        {activeTab === 'orders' ? (
          <>
            {/* مفاتيح اللون */}
            <div className="kitchen-legend">
              <span className="kitchen-legend-chip kitchen-legend-delivery">
                <IoCarOutline size={14} /> توصيل
              </span>
              <span className="kitchen-legend-chip kitchen-legend-table">
                <IoRestaurantOutline size={14} /> طاولة (داخل المطعم)
              </span>
            </div>

            <section className="kitchen-stats">
              <StatCard
                icon={<IoDocumentTextOutline size={22} />}
                value={counts.total}
                label="إجمالي الأصناف"
                sub="كل الأصناف المطلوبة"
                tone="red"
              />
              <StatCard
                icon={<IoTimeOutline size={22} />}
                value={counts.preparing}
                label="قيد التحضير"
                sub="أصناف جارية"
                tone="orange"
              />
              <StatCard
                icon={<IoRestaurantOutline size={22} />}
                value={counts.ready}
                label="جاهز للتقديم"
                sub="جاهز للاستلام"
                tone="yellow"
              />
              <StatCard
                icon={<IoAlarmOutline size={22} />}
                value={counts.new}
                label="جديدة"
                sub="تحتاج انتباه"
                tone="pink"
              />
            </section>

            {loading ? (
              <div className="kitchen-loading">
                <div className="kitchen-spinner" />
                <p>جاري التحميل...</p>
              </div>
            ) : counts.total === 0 ? (
              <div className="kitchen-empty">
                <span className="kitchen-empty-emoji">🍽️</span>
                <p>لا توجد طلبات حالياً</p>
              </div>
            ) : (
              <div className="kitchen-category-grid">
                {CATEGORIES.map((cat) => {
                  const rows = categoryGroups[cat.id] || [];
                  if (rows.length === 0) return null;
                  const newCount = rows.filter(r => r.itemStatus === 'new').length;
                  const prepCount = rows.filter(r => r.itemStatus === 'preparing').length;
                  const readyCount = rows.filter(r => r.itemStatus === 'ready').length;
                  return (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      rows={rows}
                      counts={{ new: newCount, preparing: prepCount, ready: readyCount }}
                      acting={acting}
                      onStart={handleStartItem}
                      onReady={handleReadyItem}
                      onReset={handleResetItem}
                      onArchive={handleArchive}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* =========================================================
             ATTENDANCE VIEW (تسجيل الدوام والورديات)
             ========================================================= */
          <div className="space-y-6 animate-fade-in text-white">
            
            {/* اختيار اسم الموظف */}
            <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-right flex-1">
                <h3 className="text-sm font-black text-white">من أنت؟</h3>
                <p className="text-xs text-omega-text-dim mt-0.5">اختر اسمك من القائمة لتسجيل دوامك الخاص</p>
              </div>
              <select
                value={selectedWorkerId}
                onChange={(e) => handleWorkerSelect(e.target.value)}
                className="w-full sm:w-64 px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white font-bold text-sm focus:outline-none focus:border-omega-orange appearance-none cursor-pointer"
              >
                <option value="" className="text-black">-- اختر اسمك --</option>
                {workers.map((w) => (
                  <option key={w.uid} value={w.uid} className="text-black">
                    {w.name} {w.phone ? `(${w.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!selectedWorkerId ? (
              <div className="glass rounded-3xl p-12 border border-white/5 text-center flex flex-col items-center gap-4">
                <span className="text-5xl animate-bounce">👋</span>
                <h3 className="text-lg font-black text-white">اختر اسمك أولاً</h3>
                <p className="text-sm text-omega-text-dim max-w-sm leading-relaxed">اختر اسمك من القائمة بالأعلى لتسجيل دخولك أو خروجك من الدوام.</p>
              </div>
            ) : attendanceLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-omega-orange border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-omega-text-dim text-sm">جاري جلب تفاصيل الدوام...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. لوحة الدخول والخروج والتحكم */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  
                  {/* بطاقة الحالة الحالية */}
                  <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden bg-white/[0.02]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full -mr-10 -mt-10" />
                    
                    <h3 className="text-sm font-black text-omega-text-dim mb-1">حالة الدوام الحالية</h3>
                    <p className="text-xs font-bold text-omega-orange mb-4">{selectedWorker?.name}</p>
                    
                    <div className="flex items-center gap-3 mb-6">
                      {activeSession?.status === 'active' ? (
                        <>
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                          </span>
                          <strong className="text-green-400 text-lg font-black">قيد العمل والدوام الآن 👨‍🍳</strong>
                        </>
                      ) : activeSession?.status === 'break' ? (
                        <>
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                          </span>
                          <strong className="text-orange-400 text-lg font-black">في استراحة مؤقتة ☕</strong>
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                          </span>
                          <strong className="text-red-400 text-lg font-black">خارج الدوام حالياً 🚪</strong>
                        </>
                      )}
                    </div>

                    {activeSession && (
                      <div className="space-y-3 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-right text-xs text-omega-text-muted font-bold">
                        <div className="flex justify-between">
                          <span>ساعة بدء الدوام:</span>
                          <span className="text-white">{formatTime(activeSession.checkIn)}</span>
                        </div>
                        {activeSession.breaks?.length > 0 && (
                          <div className="flex justify-between">
                            <span>فترات الاستراحة:</span>
                            <span className="text-orange-400">{getBreakCountAndDuration(activeSession.breaks)}</span>
                          </div>
                        )}
                        <div className="border-t border-white/5 my-2 pt-2 flex justify-between">
                          <span>سعر الساعة الحالي:</span>
                          <span className="text-omega-orange font-black">{activeSession.hourlyRate || 0} د.ج/ساعة</span>
                        </div>
                      </div>
                    )}

                    {!activeSession && (
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-right text-xs text-omega-text-muted font-bold mb-6">
                        <div className="flex justify-between items-center">
                          <span>سعر ساعة عملك الحالي:</span>
                          <span className="text-omega-orange font-black text-sm">{(selectedWorker?.hourlyRate) || 0} د.ج/ساعة</span>
                        </div>
                        <p className="text-[10px] text-omega-text-dim mt-2 leading-relaxed">
                          * سعر الساعة يحدده صاحب الإدارة من لوحة التحكم، وسوف يُستخدم لحساب أجر فترات العمل بدقة.
                        </p>
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div className="space-y-3">
                      {!activeSession ? (
                        <button
                          onClick={handleCheckIn}
                          disabled={actionLoading}
                          className="w-full py-4 rounded-2xl bg-gradient-to-l from-green-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 hover:shadow-green-500/25 active:scale-95 transition-all duration-300 disabled:opacity-50"
                        >
                          <IoPlayOutline size={20} />
                          <span>بدء الدوام وتسجيل الدخول</span>
                        </button>
                      ) : (
                        <>
                          {activeSession.status === 'active' ? (
                            <button
                              onClick={handleGoOnBreak}
                              disabled={actionLoading}
                              className="w-full py-3.5 rounded-2xl bg-orange-500/15 border border-orange-500/20 text-orange-400 font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-500/20 active:scale-95 transition-all duration-300 disabled:opacity-50"
                            >
                              <IoCafeOutline size={20} />
                              <span>خروج مؤقت (استراحة)</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleReturnFromBreak}
                              disabled={actionLoading}
                              className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-green-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 hover:shadow-green-500/25 active:scale-95 transition-all duration-300 disabled:opacity-50"
                            >
                              <IoPlayOutline size={20} />
                              <span>عودة من الاستراحة</span>
                            </button>
                          )}

                          <button
                            onClick={handleCheckOut}
                            disabled={actionLoading}
                            className="w-full py-4 rounded-2xl bg-gradient-to-l from-red-500 to-rose-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:shadow-red-500/25 active:scale-95 transition-all duration-300 disabled:opacity-50"
                          >
                            <IoStopOutline size={20} />
                            <span>إنهاء الدوام وتسجيل خروج نهائي</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* بطاقة نصائح للدوام */}
                  <div className="glass rounded-3xl p-5 border border-white/5 bg-white/[0.01] text-xs text-omega-text-muted leading-relaxed text-right">
                    <h4 className="font-black text-omega-orange mb-2 flex items-center gap-1.5">
                      <IoFlame size={14} /> إرشادات الدوام المعتمدة
                    </h4>
                    <ul className="space-y-1.5 list-disc list-inside">
                      <li>تأكد من تسجيل الدخول مباشرة فور وصولك للمطعم.</li>
                      <li>إذا غادرت المطعم في منتصف العمل لأي سبب شخصي، يرجى تسجيل <strong>الخروج المؤقت (الاستراحة)</strong> لخصمها من وقت العمل.</li>
                      <li>سعر الساعة يخضع لتحديثات الإدارة ويتم تثبيته لكل وردية عند تسجيل الدخول الخاص بها.</li>
                    </ul>
                  </div>
                </div>

                {/* 2. جدول الفترات السابقة والأجور المحتسبة */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <IoCalendarOutline className="text-omega-orange" size={20} />
                        <h2 className="text-base font-black">سجل الورديات والأجور السابقة</h2>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-omega-text-muted font-bold">
                        إجمالي الورديات: {attendanceHistory.length}
                      </span>
                    </div>

                    {attendanceHistory.length === 0 ? (
                      <div className="text-center py-16 text-omega-text-dim text-sm flex flex-col items-center justify-center gap-3">
                        <IoTimeOutline size={40} className="text-omega-text-muted opacity-50" />
                        <span>لم تقم بتسجيل أي دوام سابق حتى الآن.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                          <thead>
                            <tr className="border-b border-white/5 text-omega-text-dim text-xs font-black">
                              <th className="pb-3 text-right">التاريخ</th>
                              <th className="pb-3 text-right">فترة العمل (دخول - خروج)</th>
                              <th className="pb-3 text-right">الاستراحات</th>
                              <th className="pb-3 text-right">ساعات العمل</th>
                              <th className="pb-3 text-right">سعر الساعة</th>
                              <th className="pb-3 text-left">الأجر المحتسب</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {attendanceHistory.map((session) => (
                              <tr key={session.id} className="text-omega-text-muted hover:text-white transition-colors">
                                <td className="py-3.5 font-bold">{formatDate(session.createdAt || session.checkIn)}</td>
                                <td className="py-3.5">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-white">دخول: {formatTime(session.checkIn)}</span>
                                    {session.checkOut ? (
                                      <span className="text-[10px] text-omega-text-dim">خروج: {formatTime(session.checkOut)}</span>
                                    ) : (
                                      <span className="text-[10px] text-green-400 font-bold animate-pulse">مستمر...</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 text-xs">
                                  {getBreakCountAndDuration(session.breaks)}
                                </td>
                                <td className="py-3.5 font-black text-white">
                                  {session.status !== 'completed' ? (
                                    <span className="text-green-400 text-xs font-bold animate-pulse">قيد الحساب</span>
                                  ) : (
                                    `${session.totalHours || 0} ساعة`
                                  )}
                                </td>
                                <td className="py-3.5 font-bold">{session.hourlyRate || 0} د.ج</td>
                                <td className="py-3.5 text-left font-black text-omega-orange text-sm">
                                  {session.status !== 'completed' ? (
                                    <span className="text-green-400 text-xs font-bold animate-pulse">قيد الحساب</span>
                                  ) : (
                                    `${session.totalPay || 0} د.ج`
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
          </div>
        )}

        <footer className="kitchen-footer">
          <div className="kitchen-footer-msg">
            <IoFlame size={18} />
            <span>التركيز على الجودة ... السرعة في الأداء ...</span>
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

function CategoryCard({ category, rows, counts, acting, onStart, onReady, onReset, onArchive }) {
  return (
    <article className="kitchen-category-card">
      <header className="kitchen-category-head">
        <div className="kitchen-category-counts">
          {counts.new > 0 && <span className="kitchen-category-badge new">جديد {counts.new}</span>}
          {counts.preparing > 0 && <span className="kitchen-category-badge preparing">{counts.preparing} قيد التحضير</span>}
          {counts.ready > 0 && <span className="kitchen-category-badge ready">{counts.ready} جاهز</span>}
        </div>
        <h2 className="kitchen-category-title">
          <CategoryIcon
            iconUrl={category.iconUrl}
            emoji={category.emoji}
            className="kitchen-category-emoji"
            style={category.iconUrl ? { width: '1.2em', height: '1.2em', objectFit: 'contain' } : undefined}
          />
          {category.label}
        </h2>
      </header>

      <ul className="kitchen-category-list">
        {rows.map((row) => (
          <ItemRow
            key={row.key}
            row={row}
            categoryEmoji={category.emoji}
            categoryIconUrl={category.iconUrl}
            acting={acting}
            onStart={onStart}
            onReady={onReady}
            onReset={onReset}
            onArchive={onArchive}
          />
        ))}
      </ul>
    </article>
  );
}

function ItemRow({ row, categoryEmoji, categoryIconUrl, acting, onStart, onReady, onReset, onArchive }) {
  const { order, item, index, itemStatus } = row;
  const isDelivery = !!order.isDelivery;
  const rowKey = `${order.id}-${index}`;
  const isBusy = acting === rowKey;

  return (
    <li className={`kitchen-row kitchen-row-${isDelivery ? 'delivery' : 'table'} kitchen-row-${itemStatus}`}>
      <div className="kitchen-row-main">
        <div className="kitchen-row-thumb">
          {item.image
            ? <img src={item.image} alt={item.name} />
            : <CategoryIcon iconUrl={categoryIconUrl} emoji={categoryEmoji} />}
        </div>
        <div className="kitchen-row-info">
          <div className="kitchen-row-line1">
            <strong className="kitchen-row-name">{item.name}</strong>
            <span className="kitchen-row-qty">×{item.quantity}</span>
          </div>
          <div className="kitchen-row-line2">
            <span className={`kitchen-type-chip ${isDelivery ? 'delivery' : 'table'}`}>
              {isDelivery
                ? (<><IoCarOutline size={12} /> توصيل</>)
                : (<><IoRestaurantOutline size={12} /> طاولة</>)}
            </span>
            <span className="kitchen-row-order">#{order.id?.slice(-6).toUpperCase()}</span>
            <span className="kitchen-row-time">
              <IoTimeOutline size={11} /> {timeAgo(order.createdAt)}
            </span>
          </div>
          {(order.customerName || (isDelivery && order.customerPhone)) && (
            <div className="kitchen-row-line3">
              {order.customerName ? <span>{order.customerName}</span> : null}
              {isDelivery && order.customerPhone ? (
                <span dir="ltr"><IoCallOutline size={11} /> {order.customerPhone}</span>
              ) : null}
            </div>
          )}
          {isDelivery && order.customerAddress ? (
            <div className="kitchen-row-line3">
              <span className="kitchen-row-address">📍 {order.customerAddress}</span>
            </div>
          ) : null}
          {order.customerNote ? (
            <div className="kitchen-row-line3">
              <span className="kitchen-row-note">📝 {order.customerNote}</span>
            </div>
          ) : null}
          {item.type === 'offer' && item.components?.length > 0 ? (
            <div className="kitchen-row-line3">
              <span className="kitchen-row-note">
                مكونات العرض: {item.components.map(component => `${component.quantity}x ${component.name}`).join(' + ')}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="kitchen-row-actions">
        {itemStatus === 'new' && (
          <button
            type="button"
            onClick={() => onStart(order.id, index)}
            disabled={isBusy}
            className="kitchen-row-btn kitchen-row-btn-start"
          >
            {isBusy ? '...' : '👨‍🍳 بدء'}
          </button>
        )}
        {itemStatus === 'preparing' && (
          <button
            type="button"
            onClick={() => onReady(order.id, index)}
            disabled={isBusy}
            className="kitchen-row-btn kitchen-row-btn-ready-action"
          >
            {isBusy ? '...' : '✓ جاهز'}
          </button>
        )}
        {itemStatus === 'ready' && (
          <>
            <button
              type="button"
              onClick={() => onReset(order.id, index)}
              disabled={isBusy}
              className="kitchen-row-btn kitchen-row-btn-undo"
              title="تراجع"
              aria-label="تراجع"
            >
              <IoArrowUndoOutline size={14} />
            </button>
            <span className="kitchen-row-done">
              <IoCheckmarkCircle size={16} /> جاهز
            </span>
            {order.workerReady ? (
              <button
                type="button"
                onClick={() => onArchive?.(order.id)}
                disabled={acting === `archive-${order.id}`}
                className="kitchen-row-btn kitchen-row-btn-archive"
                title="حذف الطلب من الواجهة"
                aria-label="حذف"
              >
                <IoTrashOutline size={14} />
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
