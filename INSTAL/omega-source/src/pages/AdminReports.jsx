import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { getAllWorkers } from '../services/attendanceService';
import { getAllSchedulePlans, saveWorkerSchedule } from '../services/scheduleService';
import { formatCurrency } from '../utils/formatCurrency';
import { isToday, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import { IoStatsChart, IoTrophy, IoCalendarOutline, IoCloseOutline, IoSaveOutline, IoAddOutline, IoTrashOutline, IoTimeOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

const catLabels = {
  burger: { label: 'برجر', emoji: '🍔', color: 'from-amber-500 to-orange-700' },
  pizza:  { label: 'بيتزا', emoji: '🍕', color: 'from-red-500 to-red-700' },
  tacos:  { label: 'تاكوس', emoji: '🌮', color: 'from-emerald-500 to-emerald-700' },
  drinks: { label: 'مشروبات', emoji: '🥤', color: 'from-blue-500 to-blue-700' },
  other:  { label: 'أخرى', emoji: '📦', color: 'from-gray-500 to-gray-700' },
};

const DAYS = [
  { key: '0', label: 'الأحد',    color: '#f97316' },
  { key: '1', label: 'الاثنين', color: '#3b82f6' },
  { key: '2', label: 'الثلاثاء',color: '#8b5cf6' },
  { key: '3', label: 'الأربعاء',color: '#10b981' },
  { key: '4', label: 'الخميس',  color: '#f59e0b' },
  { key: '5', label: 'الجمعة',  color: '#ef4444' },
  { key: '6', label: 'السبت',   color: '#6366f1' },
];

const WORKER_COLORS = [
  '#f97316','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#6366f1','#ec4899',
];

const SHIFT_PRESETS = [
  { label: 'صباحي',  start: '07:00', end: '15:00' },
  { label: 'مسائي',  start: '15:00', end: '23:00' },
  { label: 'ليلي',   start: '23:00', end: '07:00' },
  { label: 'كامل',   start: '08:00', end: '20:00' },
];

export default function AdminReports() {
  const [orders, setOrders]     = useState([]);
  const [products, setProducts] = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [plans, setPlans]       = useState({});   // uid -> { days: { '0': [{start,end,label}] } }
  const [loading, setLoading]   = useState(true);
  const [savingUid, setSavingUid] = useState(null);

  // مودال تعديل خلية
  const [modal, setModal] = useState(null); // { uid, name, dayKey, dayLabel, shifts: [...] }
  const [editShifts, setEditShifts] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [o, p, w, sc] = await Promise.all([
        getAllOrders(), getAllProducts(), getAllWorkers(), getAllSchedulePlans(),
      ]);
      setOrders(o); setProducts(p); setWorkers(w);
      const map = {};
      sc.forEach(s => { map[s.uid] = s; });
      setPlans(map);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ─── إحصائيات المبيعات ───
  const delivered = orders.filter(o => o.status === 'delivered');
  const todayDel  = delivered.filter(o => isToday(o.createdAt));
  const monthDel  = delivered.filter(o => isThisMonth(o.createdAt));

  const categorySales = {};
  delivered.forEach(o => {
    o.items?.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cat = product?.category || 'other';
      if (!categorySales[cat]) categorySales[cat] = { sales: 0, quantity: 0, profit: 0 };
      categorySales[cat].sales    += item.price * item.quantity;
      categorySales[cat].quantity += item.quantity;
      categorySales[cat].profit   += (item.price - (item.costPrice || 0)) * item.quantity;
    });
  });

  const productSales = {};
  delivered.forEach(o => {
    o.items?.forEach(item => {
      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
      productSales[item.name].qty     += item.quantity;
      productSales[item.name].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.entries(productSales).sort((a,b) => b[1].qty - a[1].qty).slice(0, 10);
  const maxQty = topProducts[0]?.[1]?.qty || 1;
  const totalCategorySales = Object.values(categorySales).reduce((s,c) => s + c.sales, 0);

  const summary = [
    { label: 'مبيعات اليوم',   value: formatCurrency(todayDel.reduce((s,o)=>s+(o.totalPrice||0),0)),  color:'from-emerald-500 to-emerald-700' },
    { label: 'فائدة اليوم',    value: formatCurrency(todayDel.reduce((s,o)=>s+calculateOrderProfit(o).profit,0)), color:'from-omega-orange to-omega-red' },
    { label: 'مبيعات الشهر',  value: formatCurrency(monthDel.reduce((s,o)=>s+(o.totalPrice||0),0)),  color:'from-blue-500 to-indigo-700' },
    { label: 'فائدة الشهر',   value: formatCurrency(monthDel.reduce((s,o)=>s+calculateOrderProfit(o).profit,0)), color:'from-cyan-500 to-teal-700' },
    { label: 'المبيعات الكلية',value: formatCurrency(delivered.reduce((s,o)=>s+(o.totalPrice||0),0)), color:'from-fuchsia-500 to-purple-700' },
    { label: 'الفائدة الكلية', value: formatCurrency(delivered.reduce((s,o)=>s+calculateOrderProfit(o).profit,0)), color:'from-amber-500 to-orange-700' },
  ];

  // ─── فتح مودال تعديل خلية ───
  const openCell = (worker, dayKey, dayLabel) => {
    const shifts = plans[worker.uid]?.days?.[dayKey] ? [...plans[worker.uid].days[dayKey]] : [];
    setEditShifts(shifts.map(s => ({ ...s })));
    setModal({ uid: worker.uid, name: worker.name, dayKey, dayLabel });
  };

  const addShift = () => setEditShifts(prev => [...prev, { start: '08:00', end: '16:00', label: '' }]);

  const removeShift = (i) => setEditShifts(prev => prev.filter((_, idx) => idx !== i));

  const updateShift = (i, field, val) =>
    setEditShifts(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const applyPreset = (preset) =>
    setEditShifts([{ start: preset.start, end: preset.end, label: preset.label }]);

  const saveCell = async () => {
    if (!modal) return;
    setSavingUid(modal.uid + modal.dayKey);
    try {
      const existing = plans[modal.uid]?.days || {};
      const newDays = { ...existing, [modal.dayKey]: editShifts };
      // حذف الأيام الفارغة
      if (editShifts.length === 0) delete newDays[modal.dayKey];
      await saveWorkerSchedule(modal.uid, modal.name, newDays);
      setPlans(prev => ({
        ...prev,
        [modal.uid]: { ...(prev[modal.uid] || {}), uid: modal.uid, name: modal.name, days: newDays },
      }));
      toast.success('تم حفظ الجدول ✅');
      setModal(null);
    } catch (e) {
      toast.error(e.message || 'فشل الحفظ');
    }
    setSavingUid(null);
  };

  const getCellShifts = (uid, dayKey) => plans[uid]?.days?.[dayKey] || [];

  return (
    <div className="admin-page">
      <AdminNav />
      <main className="admin-container">
        <AdminHeader title="والإحصائيات" accent="التقارير" subtitle="تحليل أداء المطعم" />

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24"/>)}</div>
        ) : (<>

          {/* ملخص */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 stagger">
            {summary.map((item,i) => (
              <div key={i} className={`stat-card bg-gradient-to-br ${item.color}`}>
                <div className="relative z-10">
                  <p className="text-white/85 text-[11px] mb-1">{item.label}</p>
                  <p className="text-white font-black text-lg lg:text-xl">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* مبيعات حسب الفئة */}
            <div className="card-premium p-5">
              <h3 className="section-title"><IoStatsChart className="text-omega-orange" size={18}/> المبيعات حسب الفئة</h3>
              {Object.entries(categorySales).length === 0 ? (
                <p className="text-omega-text-muted text-sm text-center py-8">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categorySales).sort((a,b)=>b[1].sales-a[1].sales).map(([cat,data]) => {
                    const c = catLabels[cat] || catLabels.other;
                    const pct = totalCategorySales > 0 ? (data.sales/totalCategorySales)*100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-sm font-bold flex items-center gap-2">
                            <span className="text-lg">{c.emoji}</span> {c.label}
                            <span className="text-omega-text-dim text-[10px]">{data.quantity} وحدة</span>
                          </span>
                          <div className="text-left">
                            <p className="text-omega-orange text-sm font-bold">{formatCurrency(data.sales)}</p>
                            <p className="text-emerald-400 text-[10px]">ربح {formatCurrency(data.profit)}</p>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-l ${c.color} rounded-full transition-all duration-700`} style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* أفضل المنتجات */}
            <div className="card-premium p-5">
              <h3 className="section-title"><IoTrophy className="text-amber-400" size={18}/> أفضل المنتجات</h3>
              {topProducts.length === 0 ? (
                <p className="text-omega-text-muted text-sm text-center py-8">لا توجد بيانات</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map(([name,data],i) => {
                    const pct=(data.qty/maxQty)*100;
                    const medals=['🥇','🥈','🥉'];
                    return (
                      <div key={name} className="bg-white/3 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 text-center font-black text-xs">{medals[i]||<span className="text-omega-text-dim">#{i+1}</span>}</span>
                            <span className="text-white text-sm truncate">{name}</span>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <span className="text-omega-orange text-xs font-bold">{formatCurrency(data.revenue)}</span>
                            <p className="text-omega-text-dim text-[10px]">{data.qty} وحدة</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-l from-omega-orange to-omega-red rounded-full transition-all duration-700" style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══════════ جدول تخطيط الورديات ══════════ */}
          <div className="card-premium p-5" dir="rtl">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="section-title mb-0">
                <IoCalendarOutline className="text-indigo-400" size={18}/>
                جدول تخطيط ورديات الموظفين
              </h3>
              <p className="text-omega-text-dim text-[11px]">اضغط على أي خلية لتعيين أو تعديل وردية</p>
            </div>

            {workers.length === 0 ? (
              <div className="text-center py-16 text-omega-text-muted text-sm">لا يوجد موظفون مسجلون بعد</div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table style={{width:'100%', borderCollapse:'separate', borderSpacing:'3px', minWidth:680}}>
                  <thead>
                    <tr>
                      <th style={{background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:900, color:'#9ca3af', minWidth:120}}>
                        👤 الموظف
                      </th>
                      {DAYS.map(day => (
                        <th key={day.key} style={{background:`${day.color}20`, borderRadius:10, borderTop:`3px solid ${day.color}`, padding:'10px 6px', textAlign:'center', fontSize:11, fontWeight:900, color:day.color, minWidth:90}}>
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((worker, wi) => {
                      const color = WORKER_COLORS[wi % WORKER_COLORS.length];
                      return (
                        <tr key={worker.uid}>
                          {/* اسم الموظف */}
                          <td style={{background:`${color}15`, borderRadius:10, padding:'10px 12px', verticalAlign:'middle'}}>
                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                              <div style={{width:28, height:28, borderRadius:'50%', background:`${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0}}>
                                👤
                              </div>
                              <span style={{fontWeight:900, fontSize:12, color}}>{worker.name}</span>
                            </div>
                          </td>

                          {/* خلية كل يوم */}
                          {DAYS.map(day => {
                            const shifts = getCellShifts(worker.uid, day.key);
                            const isEmpty = shifts.length === 0;
                            return (
                              <td key={day.key}
                                onClick={() => openCell(worker, day.key, day.label)}
                                title="اضغط لتعديل الوردية"
                                style={{
                                  background: isEmpty ? 'rgba(255,255,255,0.02)' : `${color}12`,
                                  border: isEmpty ? '1.5px dashed rgba(255,255,255,0.08)' : `1.5px solid ${color}40`,
                                  borderRadius:10, padding:'6px 5px', verticalAlign:'top', textAlign:'center',
                                  cursor:'pointer', transition:'all 0.2s', minHeight:60,
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = isEmpty ? 'rgba(255,255,255,0.06)' : `${color}22`}
                                onMouseLeave={e => e.currentTarget.style.background = isEmpty ? 'rgba(255,255,255,0.02)' : `${color}12`}
                              >
                                {isEmpty ? (
                                  <span style={{color:'rgba(255,255,255,0.12)', fontSize:18, lineHeight:'50px', userSelect:'none'}}>＋</span>
                                ) : (
                                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                                    {shifts.map((s, si) => (
                                      <div key={si} style={{background:`${color}22`, border:`1px solid ${color}55`, borderRadius:7, padding:'4px 5px', fontSize:10, fontWeight:800, color}}>
                                        {s.label && <div style={{fontSize:9, marginBottom:2, opacity:0.8}}>{s.label}</div>}
                                        <div style={{display:'flex', justifyContent:'center', gap:3, alignItems:'center'}}>
                                          <span style={{color:'#16a34a', fontWeight:900}}>{s.start}</span>
                                          <span style={{opacity:0.4, fontSize:8}}>←</span>
                                          <span style={{color:'#dc2626', fontWeight:900}}>{s.end}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* مفتاح الألوان */}
                <div style={{marginTop:14, display:'flex', flexWrap:'wrap', gap:10, justifyContent:'flex-end'}}>
                  {workers.map((w, wi) => (
                    <div key={w.uid} style={{display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:WORKER_COLORS[wi%WORKER_COLORS.length]}}>
                      <span style={{width:10, height:10, borderRadius:3, background:WORKER_COLORS[wi%WORKER_COLORS.length]+'33', border:`1.5px solid ${WORKER_COLORS[wi%WORKER_COLORS.length]}`, display:'inline-block'}}/>
                      {w.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </>)}
      </main>

      {/* ══════════ مودال تعديل الوردية ══════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md">
            {/* رأس المودال */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setModal(null)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer">
                <IoCloseOutline size={20}/>
              </button>
              <div className="text-right">
                <h3 className="font-black text-gray-900 text-base">{modal.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">وردية يوم {modal.dayLabel}</p>
              </div>
            </div>

            {/* قوالب سريعة */}
            <div className="mb-4">
              <p className="text-[11px] font-bold text-gray-400 mb-2">قوالب سريعة:</p>
              <div className="flex flex-wrap gap-2">
                {SHIFT_PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 text-xs font-bold transition-all cursor-pointer border border-gray-200 hover:border-orange-300">
                    {p.label} · {p.start}–{p.end}
                  </button>
                ))}
                <button onClick={() => setEditShifts([])}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-all cursor-pointer border border-red-200">
                  مسح اليوم
                </button>
              </div>
            </div>

            {/* قائمة الورديات */}
            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
              {editShifts.length === 0 ? (
                <div className="text-center py-8 text-gray-300 text-sm">
                  <IoTimeOutline size={32} className="mx-auto mb-2 opacity-40"/>
                  <p>لا توجد وردية محددة لهذا اليوم</p>
                </div>
              ) : editShifts.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <button onClick={() => removeShift(i)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 transition-colors cursor-pointer flex-shrink-0">
                    <IoTrashOutline size={13}/>
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gray-400 font-bold">خروج</span>
                      <input type="time" value={s.end} onChange={e => updateShift(i,'end',e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-red-600 font-black text-xs text-center focus:outline-none focus:border-red-300"/>
                    </div>
                    <span className="text-gray-300 text-lg">←</span>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gray-400 font-bold">دخول</span>
                      <input type="time" value={s.start} onChange={e => updateShift(i,'start',e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-green-600 font-black text-xs text-center focus:outline-none focus:border-green-300"/>
                    </div>
                  </div>
                  <input type="text" value={s.label||''} onChange={e => updateShift(i,'label',e.target.value)}
                    placeholder="تسمية..." maxLength={12}
                    className="w-20 px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-[10px] font-bold text-right focus:outline-none focus:border-orange-300"/>
                </div>
              ))}
            </div>

            {/* إضافة وردية */}
            <button onClick={addShift}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 text-gray-400 hover:text-orange-500 text-xs font-bold transition-all flex items-center justify-center gap-1.5 mb-4 cursor-pointer">
              <IoAddOutline size={15}/>
              إضافة وردية إضافية
            </button>

            {/* زر الحفظ */}
            <button onClick={saveCell} disabled={!!savingUid}
              className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-white font-black text-sm flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
              <IoSaveOutline size={16}/>
              {savingUid ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
