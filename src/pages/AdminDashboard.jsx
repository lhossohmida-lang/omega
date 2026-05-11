import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { isToday, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import { IoReceipt, IoTrendingUp, IoCash, IoAlert, IoCheckmarkCircle, IoTime, IoFastFood } from 'react-icons/io5';

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

  const statCards = [
    { label: 'طلبات اليوم', value: todayOrders.length, icon: IoReceipt, color: 'from-blue-500 to-blue-700' },
    { label: 'إجمالي الطلبات', value: orders.length, icon: IoReceipt, color: 'from-purple-500 to-purple-700' },
    { label: 'مبيعات اليوم', value: formatCurrency(todaySales), icon: IoCash, color: 'from-green-500 to-green-700' },
    { label: 'مبيعات الشهر', value: formatCurrency(monthSales), icon: IoCash, color: 'from-teal-500 to-teal-700' },
    { label: 'المبيعات الكلية', value: formatCurrency(totalSales), icon: IoTrendingUp, color: 'from-omega-orange to-omega-red' },
    { label: 'فائدة اليوم', value: formatCurrency(todayProfit), icon: IoTrendingUp, color: 'from-emerald-500 to-emerald-700' },
    { label: 'فائدة الشهر', value: formatCurrency(monthProfit), icon: IoTrendingUp, color: 'from-cyan-500 to-cyan-700' },
    { label: 'الفائدة الكلية', value: formatCurrency(totalProfit), icon: IoTrendingUp, color: 'from-amber-500 to-amber-700' },
    { label: 'طلبات معلقة', value: pendingOrders.length, icon: IoTime, color: 'from-yellow-500 to-yellow-700' },
    { label: 'طلبات مكتملة', value: deliveredOrders.length, icon: IoCheckmarkCircle, color: 'from-green-600 to-green-800' },
  ];

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 lg:pr-0 pb-safe">
        <div className="max-w-4xl mx-auto px-4 pt-16 lg:pt-6">
          <h1 className="text-2xl font-black text-white mb-1">لوحة التحكم</h1>
          <p className="text-omega-text-muted text-sm mb-6">نظرة عامة على مطعم OMEGA</p>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* بطاقات الإحصائيات */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {statCards.map((card, i) => (
                  <div key={i} className={`rounded-xl p-4 bg-gradient-to-br ${card.color} animate-fade-in shadow-lg`}
                    style={{ animationDelay: `${i * 40}ms` }}>
                    <card.icon className="text-white/70 mb-2" size={20} />
                    <p className="text-white/80 text-[11px] font-medium">{card.label}</p>
                    <p className="text-white font-black text-lg mt-0.5">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* أفضل منتج ومنتجات منخفضة المخزون */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {bestProduct && (
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <IoFastFood className="text-omega-orange" /> أفضل منتج مبيعاً
                    </h3>
                    <div className="bg-omega-dark/30 rounded-xl p-4 text-center">
                      <p className="text-omega-orange font-black text-xl">{bestProduct[0]}</p>
                      <p className="text-omega-text-muted text-sm mt-1">{bestProduct[1]} وحدة مباعة</p>
                    </div>
                  </div>
                )}

                {lowStock.length > 0 && (
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <IoAlert className="text-omega-red" /> مخزون منخفض
                    </h3>
                    <div className="space-y-2">
                      {lowStock.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-omega-dark/30 rounded-xl px-3 py-2">
                          <span className="text-white text-sm">{p.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${p.stock === 0 ? 'bg-omega-red/15 text-omega-red' : 'bg-yellow-500/15 text-yellow-500'}`}>
                            {p.stock} متبقي
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
