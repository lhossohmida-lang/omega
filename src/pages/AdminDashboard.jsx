import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { isToday, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import { useAuth } from '../hooks/useAuth';
import AdminNav from '../components/AdminNav';
import {
  IoCheckmarkCircle, IoCash, IoTrendingUp, IoReceipt,
  IoStar, IoAlert,
} from 'react-icons/io5';

const STATUS_COLORS = {
  pending:            '#f59e0b',
  preparing:          '#ff6b00',
  on_the_way:         '#a855f7',
  delivered:          '#22c55e',
  cancelled:          '#e53935',
  accepted_by_driver: '#3b82f6',
};
const STATUS_LABELS = {
  pending: 'معلقة', preparing: 'تحضير', on_the_way: 'في الطريق',
  delivered: 'مكتملة', cancelled: 'ملغية', accepted_by_driver: 'مقبولة',
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [o, p] = await Promise.all([getAllOrders(), getAllProducts()]);
      setOrders(o);
      setProducts(p);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const todayOrders   = orders.filter(o => isToday(o.createdAt));
  const deliveredAll  = orders.filter(o => o.status === 'delivered');
  const todayDeliv    = todayOrders.filter(o => o.status === 'delivered');
  const monthOrders   = orders.filter(o => isThisMonth(o.createdAt));
  const monthDeliv    = monthOrders.filter(o => o.status === 'delivered');

  const todaySales  = todayDeliv.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const monthSales  = monthDeliv.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalSales  = deliveredAll.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const todayProfit = todayDeliv.reduce((s, o) => s + calculateOrderProfit(o).profit, 0);
  const totalProfit = deliveredAll.reduce((s, o) => s + calculateOrderProfit(o).profit, 0);

  const lowStock = products.filter(p => (p.stock ?? 999) <= 5);

  const productSales = {};
  orders.forEach(o => o.items?.forEach(item => {
    productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
  }));
  const [bestName, bestQty] = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0] || [];
  const bestProductData = products.find(p => p.name === bestName);

  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  const firstName = userData?.name?.split(' ')?.[0] || 'المدير';

  const statRow1 = [
    { label: 'الطلبات المكتملة', value: deliveredAll.length,       icon: IoCheckmarkCircle, color: '#ff6b00', bg: 'rgba(255,107,0,0.1)'   },
    { label: 'إجمالي المبيعات',  value: formatCurrency(totalSales), icon: IoCash,            color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
    { label: 'أرباح اليوم',      value: formatCurrency(todayProfit), icon: IoTrendingUp,     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'مبيعات اليوم',     value: formatCurrency(todaySales), icon: IoCash,            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  ];

  const statRow2 = [
    { label: 'إجمالي المبيعات',  value: formatCurrency(monthSales),  sub: 'هذا الشهر',              bar: '#ff6b00' },
    { label: 'إجمالي الطلبات',   value: orders.length,               sub: 'جميع الطلبات',            bar: '#22c55e' },
    { label: 'إجمالي الأرباح',   value: formatCurrency(totalProfit), sub: 'منذ البداية',             bar: '#3b82f6' },
    { label: 'إجمالي المنتجات',  value: products.length,             sub: `${lowStock.length} منخفض`, bar: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#0a0a0a' }}>
      <AdminNav />

      <div className="px-4 pt-28 pb-4">
        <h1 className="text-white font-black text-3xl tracking-tight mb-0.5">OMEGA</h1>
        <p className="text-omega-text-muted text-sm mb-5">لوحة تحكم المطعم</p>

        {/* Greeting */}
        <div
          className="mb-5 p-4 rounded-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.12), rgba(229,57,53,0.05))', border: '1px solid rgba(255,107,0,0.15)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">☀️</span>
            <span className="text-white font-black text-xl">مرحباً {firstName}</span>
          </div>
          <p className="text-omega-text-muted text-xs">إليك ملخص اليوم من OMEGA</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-3xl skeleton" />)}</div>
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats row 1 */}
            <div className="grid grid-cols-2 gap-3">
              {statRow1.map((s, i) => (
                <div key={i} className="p-4 rounded-3xl" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold text-omega-text-muted leading-tight">{s.label}</p>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
                      <s.icon size={16} style={{ color: s.color }} />
                    </div>
                  </div>
                  <p className="text-white font-black text-xl leading-tight">{s.value}</p>
                  <p className="text-omega-text-dim text-[10px] mt-1">{todayDeliv.length} طلب اليوم</p>
                </div>
              ))}
            </div>

            {/* Stats row 2 */}
            <div className="grid grid-cols-2 gap-3">
              {statRow2.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-3xl" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: s.bar, minHeight: '40px' }} />
                  <div className="min-w-0">
                    <p className="text-omega-text-muted text-[10px] mb-0.5">{s.label}</p>
                    <p className="text-white font-black text-base truncate">{s.value}</p>
                    <p className="text-omega-text-dim text-[9px]">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Best product */}
            {bestName && (
              <div className="p-4 rounded-3xl" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <IoStar size={16} className="text-omega-orange" />
                  <p className="text-white text-sm font-bold">المنتج الأكثر مبيعاً</p>
                </div>
                <div className="flex items-center gap-3">
                  {bestProductData?.image ? (
                    <img src={bestProductData.image} alt={bestName} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ backgroundColor: '#1f2026' }}>🍕</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-black text-base truncate">{bestName}</p>
                    <p className="text-omega-orange text-sm font-bold">{bestQty} وحدة مباعة</p>
                    {bestProductData && <p className="text-omega-text-muted text-xs">{formatCurrency(bestProductData.price)}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Recent orders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-omega-text-muted text-xs">{recentOrders.length} آخر طلبات</p>
                <p className="text-white font-bold text-sm">أحدث الطلبات</p>
              </div>
              <div className="space-y-2">
                {recentOrders.length === 0 ? (
                  <div className="p-8 rounded-3xl text-center" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <IoReceipt className="text-omega-text-dim mx-auto mb-3" size={36} />
                    <p className="text-omega-text-muted text-sm">لا توجد طلبات بعد</p>
                  </div>
                ) : recentOrders.map(o => {
                  const sc = STATUS_COLORS[o.status] || '#8e8e93';
                  return (
                    <div key={o.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{o.customerName}</p>
                        <p className="text-omega-text-dim text-[10px]">#{o.id?.slice(-6)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc + '20', color: sc }}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                        <p className="text-omega-orange font-black text-sm">{formatCurrency(o.totalPrice)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low stock alert */}
            {lowStock.length > 0 && (
              <div className="p-4 rounded-3xl" style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <IoAlert size={16} className="text-omega-warning" />
                  <p className="text-omega-warning text-sm font-bold">{lowStock.length} منتج مخزونه منخفض</p>
                </div>
                <div className="space-y-1.5">
                  {lowStock.slice(0, 3).map(p => (
                    <div key={p.id} className="flex justify-between items-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: p.stock === 0 ? 'rgba(229,57,53,0.15)' : 'rgba(245,158,11,0.12)', color: p.stock === 0 ? '#e53935' : '#f59e0b' }}>
                        {p.stock ?? 0} متبقي
                      </span>
                      <span className="text-omega-text-muted text-xs">{p.name}</span>
                    </div>
                  ))}
                  {lowStock.length > 3 && <p className="text-omega-warning/50 text-[10px] text-center pt-1">و {lowStock.length - 3} منتجات أخرى</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
