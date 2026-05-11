import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { isToday, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import {
  IoReceipt, IoTrendingUp, IoCash, IoAlert, IoCheckmarkCircle,
  IoTime, IoFastFood, IoStatsChart, IoFlash, IoArrowUp
} from 'react-icons/io5';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [o, p] = await Promise.all([getAllOrders(), getAllProducts()]);
      setOrders(o);
      setProducts(p);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const todayOrders = orders.filter(o => isToday(o.createdAt));
  const monthOrders = orders.filter(o => isThisMonth(o.createdAt));
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const todayDelivered = todayOrders.filter(o => o.status === 'delivered');
  const monthDelivered = monthOrders.filter(o => o.status === 'delivered');

  const todaySales = todayDelivered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const monthSales = monthDelivered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalSales = deliveredOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);

  const todayProfit = todayDelivered.reduce((s, o) => s + calculateOrderProfit(o).profit, 0);
  const monthProfit = monthDelivered.reduce((s, o) => s + calculateOrderProfit(o).profit, 0);
  const totalProfit = deliveredOrders.reduce((s, o) => s + calculateOrderProfit(o).profit, 0);

  const lowStock = products.filter(p => p.stock <= 5);

  // أفضل منتج مبيعاً
  const productSales = {};
  orders.forEach(o => {
    o.items?.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });
  });
  const bestProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];

  // الطلبات الأخيرة
  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  const primary = [
    {
      label: 'مبيعات اليوم', value: formatCurrency(todaySales), icon: IoCash,
      bg: 'from-emerald-500 via-emerald-600 to-emerald-700',
      sub: `${todayDelivered.length} طلب مكتمل`
    },
    {
      label: 'فائدة اليوم', value: formatCurrency(todayProfit), icon: IoTrendingUp,
      bg: 'from-omega-orange via-omega-orange-dark to-omega-red',
      sub: 'صافي الربح'
    },
    {
      label: 'طلبات معلقة', value: pendingOrders.length, icon: IoTime,
      bg: 'from-amber-500 via-amber-600 to-orange-700',
      sub: pendingOrders.length ? 'تحتاج متابعة' : 'لا شيء معلق'
    },
    {
      label: 'الفائدة الكلية', value: formatCurrency(totalProfit), icon: IoStatsChart,
      bg: 'from-fuchsia-500 via-purple-600 to-indigo-700',
      sub: `من ${deliveredOrders.length} طلب`
    },
  ];

  const secondary = [
    { label: 'طلبات اليوم', value: todayOrders.length, icon: IoReceipt, color: 'text-blue-400' },
    { label: 'إجمالي الطلبات', value: orders.length, icon: IoReceipt, color: 'text-purple-400' },
    { label: 'مبيعات الشهر', value: formatCurrency(monthSales), icon: IoCash, color: 'text-teal-400' },
    { label: 'فائدة الشهر', value: formatCurrency(monthProfit), icon: IoTrendingUp, color: 'text-cyan-400' },
    { label: 'المبيعات الكلية', value: formatCurrency(totalSales), icon: IoTrendingUp, color: 'text-omega-orange' },
    { label: 'طلبات مكتملة', value: deliveredOrders.length, icon: IoCheckmarkCircle, color: 'text-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-8">
          {/* رأس الصفحة */}
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="page-header-icon">
                <IoFlash size={22} />
              </div>
              <div>
                <h1 className="page-title">لوحة التحكم</h1>
                <p className="page-subtitle">نظرة عامة على أداء مطعم OMEGA</p>
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-omega-text-muted text-xs">اليوم</span>
              <span className="text-white text-sm font-bold">
                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          {loading ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-32" />)}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-20" />)}
              </div>
            </>
          ) : (
            <>
              {/* البطاقات الرئيسية */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 stagger">
                {primary.map((card, i) => (
                  <div key={i} className={`stat-card bg-gradient-to-br ${card.bg}`}>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                          <card.icon className="text-white" size={18} />
                        </div>
                        <IoArrowUp className="text-white/50" size={14} />
                      </div>
                      <p className="text-white/85 text-[11px] font-medium mb-1">{card.label}</p>
                      <p className="text-white font-black text-lg lg:text-xl leading-tight">{card.value}</p>
                      <p className="text-white/70 text-[10px] mt-1">{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* بطاقات ثانوية */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 stagger">
                {secondary.map((card, i) => (
                  <div key={i} className="card-premium p-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center ${card.color}`}>
                        <card.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-omega-text-muted text-[10px] font-medium truncate">{card.label}</p>
                        <p className="text-white font-bold text-base truncate">{card.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* صفوف معلومات */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* أفضل منتج */}
                <div className="card-premium p-5 animate-fade-in">
                  <h3 className="section-title">
                    <IoFastFood className="text-omega-orange" size={18} /> أفضل منتج مبيعاً
                  </h3>
                  {bestProduct ? (
                    <div className="bg-gradient-to-br from-omega-orange/10 via-transparent to-transparent rounded-xl p-5 text-center border border-omega-orange/15">
                      <div className="text-4xl mb-2">🏆</div>
                      <p className="gradient-text font-black text-xl">{bestProduct[0]}</p>
                      <p className="text-omega-text-muted text-xs mt-1">{bestProduct[1]} وحدة مباعة</p>
                    </div>
                  ) : (
                    <p className="text-omega-text-muted text-sm text-center py-6">لا توجد بيانات بعد</p>
                  )}
                </div>

                {/* مخزون منخفض */}
                <div className="card-premium p-5 animate-fade-in">
                  <h3 className="section-title">
                    <IoAlert className="text-omega-red" size={18} /> مخزون منخفض
                  </h3>
                  {lowStock.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                      {lowStock.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white/3 hover:bg-white/5 rounded-xl px-3 py-2 transition-colors border border-white/5">
                          <span className="text-white text-sm">{p.name}</span>
                          <span className={`badge ${p.stock === 0 ? 'bg-omega-red/15 text-omega-red border-omega-red/25' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'}`}>
                            {p.stock} متبقي
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <IoCheckmarkCircle className="text-omega-success mx-auto mb-2" size={32} />
                      <p className="text-omega-text-muted text-sm">المخزون بحالة جيدة</p>
                    </div>
                  )}
                </div>

                {/* آخر الطلبات */}
                <div className="card-premium p-5 animate-fade-in">
                  <h3 className="section-title">
                    <IoReceipt className="text-omega-info" size={18} /> آخر الطلبات
                  </h3>
                  {recentOrders.length > 0 ? (
                    <div className="space-y-2">
                      {recentOrders.map(o => (
                        <div key={o.id} className="flex justify-between items-center bg-white/3 rounded-xl px-3 py-2 border border-white/5">
                          <div className="min-w-0">
                            <p className="text-white text-xs font-bold truncate">{o.customerName}</p>
                            <p className="text-omega-text-dim text-[10px]">#{o.id?.slice(-6)}</p>
                          </div>
                          <span className="text-omega-orange font-bold text-xs">{formatCurrency(o.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-omega-text-muted text-sm text-center py-6">لا توجد طلبات</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
