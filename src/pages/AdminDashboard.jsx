import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders, resetOrdersData } from '../services/orderService';
import { getAllProducts } from '../services/productService';
import { getAllIngredients } from '../services/inventoryService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { isToday, isThisWeek, isThisMonth } from '../utils/formatDate';
import { calculateOrderProfit } from '../utils/calculateProfit';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
  IoBagHandleOutline,
  IoBarChartOutline,
  IoCashOutline,
  IoCheckmarkCircleOutline,
  IoChevronBack,
  IoClipboardOutline,
  IoCubeOutline,
  IoGridOutline,
  IoPeopleOutline,
  IoReloadOutline,
  IoRestaurantOutline,
  IoSettingsOutline,
  IoStarOutline,
  IoTimerOutline,
  IoTrendingUpOutline,
  IoWalletOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const fallbackProducts = [
  { id: 'classic-burger', name: 'برغر لحم كلاسيك', price: 850, image: '/burger-classic.png', isAvailable: true },
  { id: 'fries', name: 'بطاطا مقلية كبيرة', price: 450, image: '/fried-chicken.png', isAvailable: true },
  { id: 'drink', name: 'مشروب غازي', price: 300, image: '/drink-cola.png', isAvailable: true },
  { id: 'nuggets', name: 'ناجت الدجاج (6 قطع)', price: 650, image: '/appetizer-gratin.png', isAvailable: true },
];

function getMoney(value) {
  return formatCurrency(Math.round(value || 0));
}

function categoryImage(category) {
  return {
    burger: '/burger-classic.png',
    pizza: '/pizza-pepperoni.png',
    tacos: '/tacos-wrap.png',
    drinks: '/drink-cola.png',
    appetizers: '/fried-chicken.png',
  }[category] || '/burger-classic.png';
}

function StatCard({ icon: Icon, label, value, hint, tone = 'gold', wide = false }) {
  return (
    <article className={`omega-stat-card omega-stat-${tone}${wide ? ' omega-stat-wide' : ''}`}>
      <div className="omega-stat-icon">
        <Icon size={29} />
      </div>
      <div className="omega-stat-content">
        <p className="omega-stat-label">{label}</p>
        <strong className="omega-stat-value">{value}</strong>
        {hint ? <span className="omega-stat-hint">{hint}</span> : null}
      </div>
    </article>
  );
}

function ProductList({ products }) {
  const visibleProducts = (products.length ? products : fallbackProducts).slice(0, 4);

  return (
    <section className="omega-panel omega-products-list">
      <div className="omega-section-head">
        <Link to="/admin/products" className="omega-text-link">
          عرض الكل
          <IoChevronBack />
        </Link>
        <h2>
          المنتجات المتاحة
          <IoGridOutline />
        </h2>
      </div>

      <div className="omega-product-rows">
        {visibleProducts.map((product, index) => (
          <div key={product.id || product.name || index} className="omega-product-row">
            <span className={product.isAvailable === false ? 'omega-pill danger' : 'omega-pill'}>
              {product.isAvailable === false ? 'موقوف' : 'متوفر'}
            </span>
            <div className="omega-product-info">
              <p>{product.name}</p>
              <strong>{formatNumber(product.price || product.basePrice || 0)} د.ج</strong>
            </div>
            <img
              src={product.image || categoryImage(product.category)}
              alt={product.name}
              className="omega-product-thumb"
            />
          </div>
        ))}
      </div>

      <Link to="/admin/products" className="omega-outline-action">
        <IoBagHandleOutline />
        إدارة المنتجات
      </Link>
    </section>
  );
}

function BestSeller({ bestProduct }) {
  const product = bestProduct?.product || fallbackProducts[0];
  const name = bestProduct?.name || product.name || 'برغر OMEGA';
  const quantity = bestProduct?.quantity || 56;

  return (
    <section className="omega-panel omega-best-card">
      <div className="omega-section-head">
        <span className="omega-star-badge">
          <IoStarOutline />
        </span>
        <h2>الأكثر مبيعاً</h2>
      </div>

      <div className="omega-best-image-wrap">
        <img src={product.image || categoryImage(product.category)} alt={name} className="omega-best-image" />
        <span className="omega-floating-badge">الأكثر طلباً</span>
      </div>

      <div className="omega-best-copy">
        <h3>{name}</h3>
        <p>عدد الطلبات</p>
        <strong>{formatNumber(quantity)} طلب</strong>
      </div>

      <Link to="/admin/products" className="omega-red-action">
        عرض التفاصيل
        <IoChevronBack />
      </Link>
    </section>
  );
}

function QuickTools() {
  const tools = [
    { to: '/admin/orders', icon: IoClipboardOutline, label: 'إدارة الطلبات' },
    { to: '/admin/products', icon: IoRestaurantOutline, label: 'إدارة المنيو' },
    { to: '/admin/drivers', icon: IoPeopleOutline, label: 'العملاء' },
    { to: '/admin/reports', icon: IoBarChartOutline, label: 'التقارير' },
    { to: '/admin/inventory', icon: IoSettingsOutline, label: 'الإعدادات' },
  ];

  return (
    <section className="omega-panel omega-tools">
      <div className="omega-tools-title">
        <IoSettingsOutline />
        <h2>أدوات سريعة</h2>
      </div>
      <div className="omega-tools-grid">
        {tools.map(({ to, icon: Icon, label }) => (
          <Link key={to + label} to={to} className="omega-tool-link">
            <span>
              <Icon size={24} />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { userData } = useAuth();

  const loadData = async () => {
    try {
      const [ordersData, productsData, ingredientsData] = await Promise.all([
        getAllOrders(),
        getAllProducts(),
        getAllIngredients(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
      setIngredients(ingredientsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetData = async () => {
    const ok = confirm('سيتم حذف جميع الطلبات وإعادة عدادات مبيعات المنتجات إلى صفر. هل تريد المتابعة؟');
    if (!ok) return;

    setResetting(true);
    try {
      const result = await resetOrdersData();
      setOrders([]);
      await loadData();
      toast.success(`تمت إعادة التعيين: ${result.deletedOrders} طلب`);
    } catch (error) {
      console.error(error);
      toast.error('تعذرت إعادة تعيين البيانات');
    } finally {
      setResetting(false);
    }
  };

  const stats = useMemo(() => {
    const todayOrders = orders.filter((order) => isToday(order.createdAt));
    const weekOrders = orders.filter((order) => isThisWeek(order.createdAt));
    const monthOrders = orders.filter((order) => isThisMonth(order.createdAt));
    const deliveredAll = orders.filter((order) => order.status === 'delivered');
    const deliveredToday = todayOrders.filter((order) => order.status === 'delivered');
    const deliveredWeek = weekOrders.filter((order) => order.status === 'delivered');
    const deliveredMonth = monthOrders.filter((order) => order.status === 'delivered');

    const getOrderNetOwnerProfit = (order) => {
      const profit = calculateOrderProfit(order).profit;
      const driverCut = order.isDelivery && order.driverId ? order.deliveryFee || 0 : 0;
      return profit - driverCut;
    };

    const todaySales = deliveredToday.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const allSales = deliveredAll.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const todayProfit = deliveredToday.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const weekProfit = deliveredWeek.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const monthProfit = deliveredMonth.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const totalIngredientCost = ingredients.reduce((sum, ing) => sum + (ing.totalSpent || 0), 0);
    const allOrderProfit = deliveredAll.reduce((sum, order) => sum + getOrderNetOwnerProfit(order), 0);
    const soldUnits = deliveredAll.reduce(
      (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0),
      0
    );

    return {
      todaySales,
      todayProfit,
      weekProfit,
      monthProfit,
      allProfit: allOrderProfit - totalIngredientCost,
      allSales,
      soldUnits,
      deliveredCount: deliveredAll.length,
      activeOrders: orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length,
      cancelledToday: todayOrders.filter((order) => order.status === 'cancelled').length,
      monthOrderCount: deliveredMonth.length,
    };
  }, [orders, ingredients]);

  const bestProduct = useMemo(() => {
    const sales = {};
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.productId || item.name;
        sales[key] = {
          name: item.name,
          productId: item.productId,
          quantity: (sales[key]?.quantity || 0) + (item.quantity || 0),
        };
      });
    });

    const best = Object.values(sales).sort((a, b) => b.quantity - a.quantity)[0];
    if (!best) return null;
    const product = products.find((p) => p.id === best.productId || p.name === best.name);
    return { ...best, product };
  }, [orders, products]);

  const availableProducts = useMemo(
    () => products.filter((product) => product.isAvailable !== false),
    [products]
  );

  const firstName = userData?.name?.split(' ')?.[0] || 'anis';

  return (
    <div className="admin-page omega-admin-page">
      <AdminNav />

      <main className="admin-container omega-admin-container">
        <AdminHeader title="OMEGA" subtitle="لوحة تحكم إدارة المطعم" />

        <section className="omega-welcome-card">
          <div className="omega-welcome-art">
            <img src="/logo.png" alt="" />
          </div>
          <div className="omega-welcome-copy">
            <p>مرحباً</p>
            <h1>
              <span>👋</span>
              {firstName}
            </h1>
            <strong>إليك ملخص أداء مطعم OMEGA اليوم</strong>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            disabled={resetting}
            className="omega-reset-button"
          >
            <IoReloadOutline size={23} />
            {resetting ? 'جاري التعيين...' : 'إعادة تعيين البيانات'}
          </button>
        </section>

        {loading ? (
          <div className="omega-loading-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton omega-loading-card" />
            ))}
          </div>
        ) : (
          <>
            <section className="omega-stats-grid">
              <StatCard icon={IoCashOutline} label="المبيعات اليوم" value={getMoney(stats.todaySales)} hint="طلبات اليوم المسلمة" tone="red" />
              <StatCard icon={IoTrendingUpOutline} label="أرباح اليوم" value={getMoney(stats.todayProfit)} hint="حسب تكلفة المنتجات" tone="gold" />
              <StatCard icon={IoWalletOutline} label="إجمالي الأرباح (الصافي)" value={getMoney(stats.allProfit)} hint="بعد خصم المواد الخام" tone="red" />
              <StatCard icon={IoTrendingUpOutline} label="الأرباح الأسبوعية" value={getMoney(stats.weekProfit)} hint="أرباح هذا الأسبوع" tone="gold" />
              <StatCard icon={IoClipboardOutline} label="إجمالي الطلبات" value={formatNumber(stats.deliveredCount + stats.activeOrders)} hint="كل الطلبات المكتملة + قيد التنفيذ" tone="gold" />
              <StatCard icon={IoTimerOutline} label="الطلبات المعلقة" value={formatNumber(stats.activeOrders)} hint="تحتاج متابعة" tone="gold" />
              <StatCard icon={IoBagHandleOutline} label="إجمالي المبيعات" value={getMoney(stats.allSales)} hint="وحدة مباعة" tone="red" />
              <StatCard icon={IoCheckmarkCircleOutline} label="الطلبات المكتملة" value={formatNumber(stats.deliveredCount)} hint="من الإجمالي" tone="green" />
            </section>

            <section className="omega-income-strip">
              <div>
                <IoBarChartOutline size={30} />
              </div>
              <p>الدخل الأسبوعي</p>
              <strong>{getMoney(stats.weekProfit + stats.todaySales)}</strong>
              <span>+12% عن الأسبوع الماضي</span>
              <i aria-hidden="true" />
            </section>

            <section className="omega-products-banner">
              <img src="/burger-classic.png" alt="" />
              <div>
                <h2>منتجات متوفرة</h2>
                <p>كل المنتجات متاحة خلال ساعات العمل</p>
              </div>
              <IoCheckmarkCircleOutline size={40} />
            </section>

            <section className="omega-products-grid">
              <ProductList products={availableProducts} />
              <BestSeller bestProduct={bestProduct} />
            </section>

            <QuickTools />
          </>
        )}
      </main>
    </div>
  );
}
