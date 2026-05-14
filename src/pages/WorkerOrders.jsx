import { useState, useEffect, useMemo, useRef } from 'react';
import {
  subscribeToWorkerOrders,
  markWorkerOrderReady,
  markWorkerStartPreparing,
  archiveWorkerOrder,
  archiveAllReadyOrders,
} from '../services/orderService';
import { subscribeToTables } from '../services/tableService';
import { playLoudAlarm } from '../utils/soundUtils';
import { timeAgo } from '../utils/formatDate';
import WorkerSidebar from '../components/WorkerSidebar';
import {
  IoNotificationsOutline,
  IoRestaurant,
  IoTimeOutline,
  IoRestaurantOutline,
  IoAlarmOutline,
  IoDocumentTextOutline,
  IoCallOutline,
  IoLocationOutline,
  IoBicycleOutline,
  IoFlame,
  IoCheckmarkCircle,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const categoryEmoji = {
  pizza: '🍕',
  burger: '🍔',
  tacos: '🌮',
  drinks: '🥤',
  appetizers: '🍟',
  desserts: '🍰',
};

function fmtClock(d = new Date()) {
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export default function WorkerOrders() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState(fmtClock());
  const previousCountRef = useRef(0);

  /* live clock */
  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

  /* orders + tables subscriptions */
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 6000);

    const unsubOrders = subscribeToWorkerOrders((data) => {
      clearTimeout(timeout);
      // فلترة الطلبات المؤرشفة (المحذوفة من واجهة المطبخ)
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
    const unsubTables = subscribeToTables(setTables);

    return () => {
      clearTimeout(timeout);
      unsubOrders();
      unsubTables();
    };
  }, [soundOn]);

  /* derive */
  const tableOrders = useMemo(
    () => orders.filter((o) => o.tableNumber),
    [orders]
  );
  const deliveryOrders = useMemo(
    () => orders.filter((o) => !o.tableNumber),
    [orders]
  );

  const counts = useMemo(() => {
    const newCount = orders.filter((o) => !o.workerStarted && !o.workerReady).length;
    const preparingCount = orders.filter((o) => o.workerStarted && !o.workerReady).length;
    const readyCount = orders.filter((o) => o.workerReady).length;
    return {
      total: orders.length,
      preparing: preparingCount,
      ready: readyCount,
      new: newCount,
    };
  }, [orders]);

  const handleStartPreparing = async (orderId) => {
    setActing(orderId);
    try {
      await markWorkerStartPreparing(orderId);
      toast.success('بدأ التحضير 🔥');
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleMarkReady = async (orderId) => {
    setActing(orderId);
    try {
      await markWorkerOrderReady(orderId);
      toast.success('الطلب جاهز ✅');
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleArchive = async (orderId) => {
    setActing(orderId);
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
        pendingCount={counts.new}
        notifCount={counts.new}
      />

      <main className="kitchen-main">
        {/* Top header */}
        <header className="kitchen-header">
          <div className="kitchen-header-actions">
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
                <span>حذف الجاهزة ({counts.ready})</span>
              </button>
            )}
          </div>
          <div className="kitchen-header-title">
            <div className="kitchen-header-text">
              <h1>واجهة المطبخ</h1>
              <p>إدارة الطلبات في الوقت الحقيقي</p>
            </div>
            <div className="kitchen-header-logo">
              <IoRestaurant size={28} />
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="kitchen-stats">
          <StatCard
            icon={<IoDocumentTextOutline size={22} />}
            value={counts.total}
            label="إجمالي الطلبات"
            sub="كل الطلبات"
            tone="red"
          />
          <StatCard
            icon={<IoTimeOutline size={22} />}
            value={counts.preparing}
            label="قيد التحضير"
            sub="طلبات جارية"
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
            label="طلبات جديدة"
            sub="تحتاج انتباه"
            tone="pink"
          />
        </section>

        {/* Loading */}
        {loading ? (
          <div className="kitchen-loading">
            <div className="kitchen-spinner" />
            <p>جاري التحميل...</p>
          </div>
        ) : (
          <>
            {/* Tables section */}
            <SectionHeader
              icon={<IoRestaurant size={20} />}
              title="طلبات الطاولات"
              count={tableOrders.length}
            />
            {tableOrders.length === 0 ? (
              <EmptySection text="لا توجد طلبات طاولات حالياً" emoji="🪑" />
            ) : (
              <div className="kitchen-cards-grid">
                {tableOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    type="table"
                    acting={acting}
                    onStart={handleStartPreparing}
                    onReady={handleMarkReady}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            )}

            {/* Delivery section */}
            <SectionHeader
              icon={<IoBicycleOutline size={20} />}
              title="طلبات التوصيل"
              count={deliveryOrders.length}
            />
            {deliveryOrders.length === 0 ? (
              <EmptySection text="لا توجد طلبات توصيل حالياً" emoji="🛵" />
            ) : (
              <div className="kitchen-cards-grid">
                {deliveryOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    type="delivery"
                    acting={acting}
                    onStart={handleStartPreparing}
                    onReady={handleMarkReady}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
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

function SectionHeader({ icon, title, count }) {
  return (
    <div className="kitchen-section-header">
      <span className="kitchen-section-count">{count}</span>
      <h2>
        {title}
        <span className="kitchen-section-icon">{icon}</span>
      </h2>
    </div>
  );
}

function EmptySection({ text, emoji }) {
  return (
    <div className="kitchen-empty">
      <span className="kitchen-empty-emoji">{emoji}</span>
      <p>{text}</p>
    </div>
  );
}

function OrderCard({ order, type, acting, onStart, onReady, onArchive }) {
  // determine status
  let status = 'new';
  if (order.workerReady) status = 'ready';
  else if (order.workerStarted) status = 'preparing';

  const statusConfig = {
    new: { label: 'جديد', cls: 'kitchen-card-new' },
    preparing: { label: 'قيد التحضير', cls: 'kitchen-card-preparing' },
    ready: { label: 'جاهز', cls: 'kitchen-card-ready' },
  };
  const cfg = statusConfig[status];

  const itemImg = (item) => {
    if (item.image) {
      return <img src={item.image} alt={item.name} className="kitchen-item-img" />;
    }
    return (
      <span className="kitchen-item-emoji">
        {categoryEmoji[item.category] || '🍽️'}
      </span>
    );
  };

  return (
    <article className={`kitchen-card ${cfg.cls}`}>
      {/* Top: status + time */}
      <div className="kitchen-card-head">
        <span className="kitchen-card-time">
          <IoTimeOutline size={13} />
          {timeAgo(order.createdAt)}
        </span>
        <span className="kitchen-card-status">{cfg.label}</span>
      </div>

      {/* Title */}
      <h3 className="kitchen-card-title">
        {type === 'table'
          ? `طاولة ${order.tableNumber}`
          : 'طلب توصيل'}
      </h3>

      {/* Customer info (delivery only) */}
      {type === 'delivery' && (
        <div className="kitchen-card-customer">
          <div className="kitchen-customer-row">
            <span>{order.customerName || 'زبون'}</span>
            <IoCallOutline size={14} />
          </div>
          {order.customerPhone && (
            <div className="kitchen-customer-row">
              <span dir="ltr">{order.customerPhone}</span>
              <IoCallOutline size={14} />
            </div>
          )}
          {order.customerAddress && (
            <div className="kitchen-customer-row">
              <span className="kitchen-address">{order.customerAddress}</span>
              <IoLocationOutline size={14} />
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      <div className="kitchen-card-items">
        {order.items?.map((item, i) => (
          <div key={i} className="kitchen-item-row">
            <span className="kitchen-item-qty">×{item.quantity}</span>
            <span className="kitchen-item-name">{item.name}</span>
            <div className="kitchen-item-thumb">{itemImg(item)}</div>
          </div>
        ))}
      </div>

      {/* Action */}
      {status === 'new' && (
        <button
          type="button"
          onClick={() => onStart(order.id)}
          disabled={acting === order.id}
          className="kitchen-card-btn kitchen-btn-new"
        >
          {acting === order.id ? '...جاري' : 'بدء التحضير 👨‍🍳'}
        </button>
      )}
      {status === 'preparing' && (
        <button
          type="button"
          onClick={() => onReady(order.id)}
          disabled={acting === order.id}
          className="kitchen-card-btn kitchen-btn-preparing"
        >
          {acting === order.id ? '...جاري' : 'متابعة التحضير ⏱'}
        </button>
      )}
      {status === 'ready' && (
        <div className="kitchen-card-ready-actions">
          <button
            type="button"
            onClick={() => onArchive?.(order.id)}
            disabled={acting === order.id}
            className="kitchen-card-archive-btn"
            title="حذف من الواجهة"
            aria-label="حذف"
          >
            <IoTrashOutline size={16} />
          </button>
          <button
            type="button"
            disabled
            className="kitchen-card-btn kitchen-btn-ready"
          >
            <IoCheckmarkCircle size={18} />
            جاهز للتقديم
          </button>
        </div>
      )}
    </article>
  );
}
