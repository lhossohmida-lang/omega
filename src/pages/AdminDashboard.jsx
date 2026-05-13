import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { getAllIngredients } from '../services/inventoryService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { isToday, isThisWeek, isThisMonth, timeAgo } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
  IoAlertCircleOutline,
  IoBagHandleOutline,
  IoCashOutline,
  IoCheckmarkCircleOutline,
  IoChevronBack,
  IoNotificationsOutline,
  IoPieChartOutline,
  IoReceiptOutline,
  IoTimerOutline,
  IoTrendingUpOutline,
  IoWalletOutline,
} from 'react-icons/io5';

const statusLabels = {
  pending: 'جديد',
  preparing: 'قيد التحضير',
  on_the_way: 'في الطريق',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  accepted_by_driver: 'جاهز',
};

const statusClasses = {
  pending: 'bg-omega-red/12 text-omega-red border-omega-red/25',
  preparing: 'bg-omega-warning/12 text-omega-warning border-omega-warning/25',
  on_the_way: 'bg-blue-500/12 text-blue-300 border-blue-500/25',
  delivered: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  cancelled: 'bg-white/8 text-omega-text-muted border-white/10',
  accepted_by_driver: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
};

const categoryEmoji = (category) => ({
  burger: '🍔',
  pizza: '🍕',
  tacos: '🌮',
  drinks: '🥤',
  appetizers: '🍟',
  desserts: '🍰',
}[category] || '🍽️');

function getTime(timestamp) {
  if (!timestamp) return 0;
  if (timestamp.toMillis) return timestamp.toMillis();
  if (timestamp.seconds) return timestamp.seconds * 1000;
  return new Date(timestamp).getTime() || 0;
}

function StatCard({ icon: Icon, label, value, hint, tone = 'orange' }) {
  const tones = {
    orange: 'text-omega-orange',
    green: 'text-emerald-400',
    blue: 'text-blue-300',
    yellow: 'text-omega-warning',
  };

  return (
    <div className="admin-glass p-3.5 sm:p-4">
      <div className="mb-3 flex justify-center">
        <div className="admin-icon-tile">
          <Icon size={27} />
        </div>
      </div>
      <p className="mb-2 text-center text-xs font-bold text-omega-text">{label}</p>
      <p className="text-center text-xl font-black text-white">{value}</p>
      {hint && <p className={`mt-3 text-center text-xs font-bold ${tones[tone]}`}>{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, productsData, ingredientsData] = await Promise.all([
          getAllOrders(), 
          getAllProducts(),
          getAllIngredients()
        ]);
        setOrders(ordersData);
        setProducts(productsData);
        setIngredients(ingredientsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = useMemo(() => {
    const todayOrders = orders.filter(order => isToday(order.createdAt));
    const weekOrders = orders.filter(order => isThisWeek(order.createdAt));
    const monthOrders = orders.filter(order => isThisMonth(order.createdAt));
    const deliveredAll = orders.filter(order => order.status === 'delivered');
    const deliveredToday = todayOrders.filter(order => order.status === 'delivered');
    const deliveredWeek = weekOrders.filter(order => order.status === 'delivered');
    const deliveredMonth = monthOrders.filter(order => order.status === 'delivered');

    const getOrderNetOwnerProfit = (order) => {
      const profit = calculateOrderProfit(order).profit;
      const driverCut = (order.isDelivery && order.driverId) ? (order.deliveryFee || 0) : 0;
      return profit - driverCut;
    };

    const todaySales = deliveredToday.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const monthSales = deliveredMonth.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const allSales = deliveredAll.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    
    const todayProfit = deliveredToday.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const weekProfit = deliveredWeek.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const monthProfit = deliveredMonth.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    
    const allOrderProfit = deliveredAll.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const totalIngredientCost = ingredients.reduce((sum, ing) => sum + (ing.totalSpent || 0), 0);
    const allProfit = allOrderProfit - totalIngredientCost;

    const soldUnits = deliveredAll.reduce((sum, order) => sum + (order.items || []).reduce((s, item) => s + (item.quantity || 0), 0), 0);

    const driversProfitsMap = {};
    deliveredAll.forEach(order => {
      if (order.driverId && order.isDelivery) {
        const fee = order.deliveryFee || 0;
        if (fee > 0) {
          if (!driversProfitsMap[order.driverId]) {
            driversProfitsMap[order.driverId] = {
              id: order.driverId,
              name: order.driverName || 'سائق غير معروف',
              todayProfit: 0,
              allProfit: 0,
              todayOrders: 0,
            };
          }
          driversProfitsMap[order.driverId].allProfit += fee;
          if (isToday(order.createdAt)) {
            driversProfitsMap[order.driverId].todayProfit += fee;
            driversProfitsMap[order.driverId].todayOrders += 1;
          }
        }
      }
    });
    const driversStats = Object.values(driversProfitsMap).sort((a, b) => b.todayProfit - a.todayProfit);

    return {
      todaySales,
      todayProfit,
      weekProfit,
      monthSales,
      monthProfit,
      allSales,
      allProfit,
      soldUnits,
      driversStats,
      deliveredCount: deliveredAll.length,
      activeOrders: orders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length,
    };
  }, [orders, ingredients]);

  const inactiveProducts = useMemo(
    () => products.filter(product => product.isAvailable === false),
    [products]
  );

  const bestProduct = useMemo(() => {
    const sales = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        sales[item.productId || item.name] = {
          name: item.name,
          productId: item.productId,
          quantity: (sales[item.productId || item.name]?.quantity || 0) + (item.quantity || 0),
        };
      });
    });

    const best = Object.values(sales).sort((a, b) => b.quantity - a.quantity)[0];
    if (!best) return null;
    const product = products.find(p => p.id === best.productId || p.name === best.name);
    return { ...best, product };
  }, [orders, products]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)).slice(0, 4),
    [orders]
  );

  const firstName = userData?.name?.split(' ')?.[0] || 'أدمن';

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="OMEGA" subtitle="لوحة تحكم إدارة المطعم" />

        <section className="admin-glass mb-4 p-4">
          <div className="flex items-center gap-4">
            <div className="admin-icon-tile">
              <IoTrendingUpOutline size={27} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">مرحباً {firstName} 👋</h2>
              <p className="mt-1 text-sm text-omega-text-muted">إليك ملخص أداء مطعم OMEGA اليوم</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-40 rounded-[1.35rem] skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={IoCashOutline} label="المبيعات اليوم" value={formatCurrency(stats.todaySales)} hint="طلبات اليوم المسلمة" tone="green" />
              <StatCard icon={IoTrendingUpOutline} label="أرباح اليوم" value={formatCurrency(stats.todayProfit)} hint="حسب تكلفة المنتجات" tone="green" />
              <StatCard icon={IoTrendingUpOutline} label="الأرباح الأسبوعية" value={formatCurrency(stats.weekProfit)} hint="أرباح هذا الأسبوع" tone="green" />
              <StatCard icon={IoWalletOutline} label="إجمالي الأرباح (الصافي)" value={formatCurrency(stats.allProfit)} hint="بعد خصم المواد الخام" tone="blue" />
              
              <StatCard icon={IoTimerOutline} label="الطلبات المعلقة" value={formatNumber(stats.activeOrders)} hint="تحتاج متابعة" tone="yellow" />
              <StatCard icon={IoReceiptOutline} label="إجمالي الطلبات" value={formatCurrency(stats.allSales)} hint="كل المبيعات المكتملة" />
              <StatCard icon={IoCheckmarkCircleOutline} label="الطلبات المكتملة" value={formatNumber(stats.deliveredCount)} hint="من الإجمالي" tone="green" />
              <StatCard icon={IoBagHandleOutline} label="إجمالي المبيعات" value={formatNumber(stats.soldUnits)} hint="وحدة مباعة" />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="admin-glass p-4">
                <div className="mb-4 flex items-center justify-between">
                  <IoNotificationsOutline className="text-omega-orange" size={23} />
                  <h3 className="text-xl font-black text-white">منتجات موقوفة</h3>
                </div>

                {inactiveProducts.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-400">
                    كل المنتجات متاحة خلال ساعات العمل
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inactiveProducts.slice(0, 3).map(product => (
                      <div key={product.id} className="admin-control flex items-center justify-between rounded-2xl p-3">
                        <span className="rounded-full bg-omega-red/20 px-3 py-1 text-sm font-black text-omega-red">
                          موقوف
                        </span>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="font-bold text-white">{product.name}</p>
                            <p className="text-xs text-omega-text-muted">معطّل يدوياً</p>
                          </div>
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/5">
                            {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">{categoryEmoji(product.category)}</div>}
                          </div>
                        </div>
                      </div>
                    ))}

                    <Link to="/admin/products" className="admin-control flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-black text-omega-orange">
                      <IoChevronBack />
                      إدارة المنتجات
                    </Link>
                  </div>
                )}
              </div>

              <div className="admin-glass p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-2xl">👑</span>
                  <h3 className="text-xl font-black text-white">المنتج الأكثر مبيعاً</h3>
                </div>

                {bestProduct ? (
                  <>
                    <div className="admin-control flex items-center justify-between gap-3 p-3.5">
                      <div className="text-right">
                        <p className="text-lg font-black text-white">{bestProduct.name}</p>
                        <p className="mt-2 text-sm text-omega-text-muted">الأكثر مبيعاً اليوم</p>
                        <p className="mt-5 text-4xl font-black text-omega-orange">{formatNumber(bestProduct.quantity)}</p>
                        <p className="text-sm text-omega-text-muted">طلب</p>
                      </div>
                      <div className="h-32 w-40 overflow-hidden rounded-[1.25rem] bg-white/5">
                        {bestProduct.product?.image ? (
                          <img src={bestProduct.product.image} alt={bestProduct.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-6xl">{categoryEmoji(bestProduct.product?.category)}</div>
                        )}
                      </div>
                    </div>
                    <Link to="/admin/products" className="admin-control mt-3 flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-black text-omega-orange">
                      <IoChevronBack />
                      عرض جميع المنتجات
                    </Link>
                  </>
                ) : (
                  <div className="admin-control rounded-2xl p-6 text-center text-sm text-omega-text-muted">
                    لا توجد مبيعات كافية بعد
                  </div>
                )}
              </div>
            </section>

            {/* Drivers Profits Section */}
            <section className="admin-glass p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛵</span>
                  <h3 className="text-xl font-black text-white">أرباح السائقين (اليوم)</h3>
                </div>
              </div>

              {stats.driversStats.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-sm text-omega-text-muted">
                  لا توجد أرباح للسائقين اليوم
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.driversStats.map(driver => (
                    <div key={driver.id} className="admin-control flex items-center justify-between rounded-2xl p-4">
                      <div>
                        <p className="font-bold text-white mb-1">{driver.name}</p>
                        <p className="text-xs text-omega-text-muted">{driver.todayOrders} طلبات اليوم</p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-black text-omega-orange">{formatCurrency(driver.todayProfit)}</p>
                        <p className="text-[10px] text-omega-text-muted">الإجمالي: {formatCurrency(driver.allProfit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-glass p-4">
              <h3 className="mb-4 text-right text-xl font-black text-white">أحدث الطلبات</h3>

              {recentOrders.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-sm text-omega-text-muted">
                  لا توجد طلبات بعد
                </div>
              ) : (
                <div className="divide-y divide-white/6">
                  {recentOrders.map(order => (
                    <div key={order.id} className="grid grid-cols-[auto_1fr] items-center gap-3 py-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto]">
                      <span className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-omega-orange">
                        <IoBagHandleOutline />
                      </span>
                      <p className="font-black text-omega-orange">#{order.id?.slice(-4)}</p>
                      <p className="text-sm text-white">{order.customerName || 'زبون'}</p>
                      <p className="text-sm text-omega-text-muted">{timeAgo(order.createdAt)}</p>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-xl border px-3 py-1 text-xs font-bold ${statusClasses[order.status] || statusClasses.pending}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        <span className="text-sm font-bold text-white">{formatCurrency(order.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link to="/admin/orders" className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm font-black text-omega-orange">
                <IoChevronBack />
                عرض جميع الطلبات
              </Link>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
