import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { isToday, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import AdminNav from '../components/AdminNav';
import { IoBarChart, IoTrendingUp } from 'react-icons/io5';

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

  const catLabels = { burger: '🍔 برجر', pizza: '🍕 بيتزا', tacos: '🌮 تاكوس', drinks: '🥤 مشروبات', other: '📦 أخرى' };

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-4xl mx-auto px-4 pt-16 lg:pt-6">
          <h1 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <IoBarChart className="text-omega-orange" /> التقارير
          </h1>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
          ) : (
            <>
              {/* ملخص سريع */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'مبيعات اليوم', value: formatCurrency(todayDel.reduce((s, o) => s + (o.totalPrice || 0), 0)) },
                  { label: 'فائدة اليوم', value: formatCurrency(todayDel.reduce((s, o) => s + calculateOrderProfit(o).profit, 0)) },
                  { label: 'مبيعات الشهر', value: formatCurrency(monthDel.reduce((s, o) => s + (o.totalPrice || 0), 0)) },
                  { label: 'فائدة الشهر', value: formatCurrency(monthDel.reduce((s, o) => s + calculateOrderProfit(o).profit, 0)) },
                  { label: 'المبيعات الكلية', value: formatCurrency(delivered.reduce((s, o) => s + (o.totalPrice || 0), 0)) },
                  { label: 'الفائدة الكلية', value: formatCurrency(delivered.reduce((s, o) => s + calculateOrderProfit(o).profit, 0)) },
                ].map((item, i) => (
                  <div key={i} className="glass rounded-xl p-4 text-center animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <p className="text-omega-text-muted text-xs mb-1">{item.label}</p>
                    <p className="text-white font-black">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* مبيعات حسب الفئة */}
              <div className="glass rounded-2xl p-4 mb-6">
                <h3 className="text-white font-bold mb-4">المبيعات حسب الفئة</h3>
                {Object.entries(categorySales).map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-white font-medium">{catLabels[cat] || cat}</span>
                      <p className="text-omega-text-muted text-xs">{data.quantity} وحدة</p>
                    </div>
                    <div className="text-left">
                      <p className="text-omega-orange font-bold text-sm">{formatCurrency(data.sales)}</p>
                      <p className="text-omega-success text-xs">ربح: {formatCurrency(data.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* أفضل المنتجات */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <IoTrendingUp className="text-omega-orange" /> أفضل المنتجات مبيعاً
                </h3>
                {(() => {
                  const productSales = {};
                  delivered.forEach(o => {
                    o.items?.forEach(item => {
                      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
                      productSales[item.name].qty += item.quantity;
                      productSales[item.name].revenue += item.price * item.quantity;
                    });
                  });
                  return Object.entries(productSales)
                    .sort((a, b) => b[1].qty - a[1].qty)
                    .slice(0, 10)
                    .map(([name, data], i) => (
                      <div key={name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-omega-orange font-bold text-sm w-6">#{i + 1}</span>
                          <span className="text-white text-sm">{name}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-omega-text-muted text-xs">{data.qty} وحدة</span>
                          <span className="text-omega-orange text-xs font-bold mr-2">{formatCurrency(data.revenue)}</span>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
