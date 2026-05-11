import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { isToday, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import { IoBarChart, IoTrendingUp, IoTrophy, IoStatsChart } from 'react-icons/io5';

const catLabels = {
  burger: { label: 'برجر', emoji: '🍔', color: 'from-amber-500 to-orange-700' },
  pizza: { label: 'بيتزا', emoji: '🍕', color: 'from-red-500 to-red-700' },
  tacos: { label: 'تاكوس', emoji: '🌮', color: 'from-emerald-500 to-emerald-700' },
  drinks: { label: 'مشروبات', emoji: '🥤', color: 'from-blue-500 to-blue-700' },
  other: { label: 'أخرى', emoji: '📦', color: 'from-gray-500 to-gray-700' }
};

export default function AdminReports() {
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

  const delivered = orders.filter(o => o.status === 'delivered');
  const todayDel = delivered.filter(o => isToday(o.createdAt));
  const monthDel = delivered.filter(o => isThisMonth(o.createdAt));

  // مبيعات حسب الفئة
  const categorySales = {};
  delivered.forEach(o => {
    o.items?.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cat = product?.category || 'other';
      if (!categorySales[cat]) categorySales[cat] = { sales: 0, quantity: 0, profit: 0 };
      categorySales[cat].sales += item.price * item.quantity;
      categorySales[cat].quantity += item.quantity;
      categorySales[cat].profit += (item.price - (item.costPrice || 0)) * item.quantity;
    });
  });

  // Top products
  const productSales = {};
  delivered.forEach(o => {
    o.items?.forEach(item => {
      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
      productSales[item.name].qty += item.quantity;
      productSales[item.name].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const maxQty = topProducts[0]?.[1]?.qty || 1;

  const totalCategorySales = Object.values(categorySales).reduce((s, c) => s + c.sales, 0);

  const summary = [
    { label: 'مبيعات اليوم', value: formatCurrency(todayDel.reduce((s, o) => s + (o.totalPrice || 0), 0)), color: 'from-emerald-500 to-emerald-700' },
    { label: 'فائدة اليوم', value: formatCurrency(todayDel.reduce((s, o) => s + calculateOrderProfit(o).profit, 0)), color: 'from-omega-orange to-omega-red' },
    { label: 'مبيعات الشهر', value: formatCurrency(monthDel.reduce((s, o) => s + (o.totalPrice || 0), 0)), color: 'from-blue-500 to-indigo-700' },
    { label: 'فائدة الشهر', value: formatCurrency(monthDel.reduce((s, o) => s + calculateOrderProfit(o).profit, 0)), color: 'from-cyan-500 to-teal-700' },
    { label: 'المبيعات الكلية', value: formatCurrency(delivered.reduce((s, o) => s + (o.totalPrice || 0), 0)), color: 'from-fuchsia-500 to-purple-700' },
    { label: 'الفائدة الكلية', value: formatCurrency(delivered.reduce((s, o) => s + calculateOrderProfit(o).profit, 0)), color: 'from-amber-500 to-orange-700' },
  ];

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="page-header-icon">
                <IoBarChart size={22} />
              </div>
              <div>
                <h1 className="page-title">التقارير والإحصائيات</h1>
                <p className="page-subtitle">تحليل أداء المطعم</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
          ) : (
            <>
              {/* ملخص */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6 stagger">
                {summary.map((item, i) => (
                  <div key={i} className={`stat-card bg-gradient-to-br ${item.color}`}>
                    <div className="relative z-10">
                      <p className="text-white/85 text-[11px] mb-1">{item.label}</p>
                      <p className="text-white font-black text-lg lg:text-xl">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Sales by category */}
                <div className="card-premium p-5">
                  <h3 className="section-title"><IoStatsChart className="text-omega-orange" size={18} /> المبيعات حسب الفئة</h3>
                  {Object.entries(categorySales).length === 0 ? (
                    <p className="text-omega-text-muted text-sm text-center py-8">لا توجد بيانات</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(categorySales).sort((a, b) => b[1].sales - a[1].sales).map(([cat, data]) => {
                        const c = catLabels[cat] || catLabels.other;
                        const pct = totalCategorySales > 0 ? (data.sales / totalCategorySales) * 100 : 0;
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
                              <div className={`h-full bg-gradient-to-l ${c.color} rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top products */}
                <div className="card-premium p-5">
                  <h3 className="section-title"><IoTrophy className="text-amber-400" size={18} /> أفضل المنتجات</h3>
                  {topProducts.length === 0 ? (
                    <p className="text-omega-text-muted text-sm text-center py-8">لا توجد بيانات</p>
                  ) : (
                    <div className="space-y-2">
                      {topProducts.map(([name, data], i) => {
                        const pct = (data.qty / maxQty) * 100;
                        const medals = ['🥇', '🥈', '🥉'];
                        return (
                          <div key={name} className="bg-white/3 border border-white/5 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-6 text-center font-black text-xs">
                                  {medals[i] || <span className="text-omega-text-dim">#{i + 1}</span>}
                                </span>
                                <span className="text-white text-sm truncate">{name}</span>
                              </div>
                              <div className="text-left flex-shrink-0">
                                <span className="text-omega-orange text-xs font-bold">{formatCurrency(data.revenue)}</span>
                                <p className="text-omega-text-dim text-[10px]">{data.qty} وحدة</p>
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-l from-omega-orange to-omega-red rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
