import { useState, useEffect, useMemo, useRef } from 'react';
import {
  subscribeToWorkerOrders,
  setItemStatus,
  archiveWorkerOrder,
  archiveAllReadyOrders,
} from '../services/orderService';
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
  IoFlame,
  IoCheckmarkCircle,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoTrashOutline,
  IoArrowUndoOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

// أقسام المطبخ — كل قسم له اسم وأيقونة ولون
const CATEGORIES = [
  { id: 'pizza',      label: 'بيتزا',   emoji: '🍕', tone: 'red'    },
  { id: 'tacos',      label: 'تاكوس',   emoji: '🌮', tone: 'orange' },
  { id: 'burger',     label: 'برغر',    emoji: '🍔', tone: 'yellow' },
  { id: 'appetizers', label: 'مقبلات',  emoji: '🍟', tone: 'pink'   },
  { id: 'drinks',     label: 'مشروبات', emoji: '🥤', tone: 'blue'   },
  { id: 'desserts',   label: 'حلويات',  emoji: '🍰', tone: 'red'    },
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

  /* live clock */
  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

  /* orders subscription */
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

    return () => {
      clearTimeout(timeout);
      unsubOrders();
    };
  }, [soundOn]);

  /* derive item-level cards grouped by category */
  const itemsByCategory = useMemo(() => {
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
    // ترتيب: العناصر الجديدة أولاً، ثم قيد التحضير، ثم الجاهزة
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
    const key = `${orderId}-${itemIndex}`;
    setActing(key);
    try {
      await setItemStatus(orderId, itemIndex, 'preparing');
      toast.success('بدأ التحضير 🔥');
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleReadyItem = async (orderId, itemIndex) => {
    const key = `${orderId}-${itemIndex}`;
    setActing(key);
    try {
      await setItemStatus(orderId, itemIndex, 'ready');
      toast.success('جاهز ✅');
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleResetItem = async (orderId, itemIndex) => {
    const key = `${orderId}-${itemIndex}`;
    setActing(key);
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
        notifCount={counts.new}
      />

      <main className="kitchen-main">
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
                <span>حذف الجاهزة</span>
              </button>
            )}
          </div>
          <div className="kitchen-header-title">
            <div className="kitchen-header-text">
              <h1>واجهة المطبخ</h1>
              <p>الطلبات مقسومة حسب نوع الصنف</p>
            </div>
            <div className="kitchen-header-logo">
              <IoRestaurant size={28} />
            </div>
          </div>
        </header>

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
          <EmptySection text="لا توجد طلبات حالياً" emoji="🍽️" />
        ) : (
          CATEGORIES.map((cat) => {
            const items = itemsByCategory[cat.id] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <SectionHeader
                  emoji={cat.emoji}
                  title={cat.label}
                  count={items.length}
                />
                <div className="kitchen-cards-grid">
                  {items.map(({ order, item, index, itemStatus, key }) => (
                    <ItemCard
                      key={key}
                      order={order}
                      item={item}
                      itemIndex={index}
                      itemStatus={itemStatus}
                      acting={acting}
                      categoryEmoji={cat.emoji}
                      onStart={handleStartItem}
                      onReady={handleReadyItem}
                      onReset={handleResetItem}
                      onArchive={handleArchive}
                    />
                  ))}
                </div>
              </div>
            );
          })
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

function SectionHeader({ emoji, title, count }) {
  return (
    <div className="kitchen-section-header">
      <span className="kitchen-section-count">{count}</span>
      <h2>
        {title}
        <span className="kitchen-section-icon" aria-hidden="true">{emoji}</span>
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

function ItemCard({ order, item, itemIndex, itemStatus, acting, categoryEmoji, onStart, onReady, onReset, onArchive }) {
  const statusConfig = {
    new:       { label: 'جديد',         cls: 'kitchen-card-new' },
    preparing: { label: 'قيد التحضير',  cls: 'kitchen-card-preparing' },
    ready:     { label: 'جاهز',         cls: 'kitchen-card-ready' },
  };
  const cfg = statusConfig[itemStatus] || statusConfig.new;
  const key = `${order.id}-${itemIndex}`;
  const isBusy = acting === key;

  return (
    <article className={`kitchen-card ${cfg.cls}`}>
      <div className="kitchen-card-head">
        <span className="kitchen-card-time">
          <IoTimeOutline size={13} />
          {timeAgo(order.createdAt)}
        </span>
        <span className="kitchen-card-status">{cfg.label}</span>
      </div>

      <h3 className="kitchen-card-title">
        <span aria-hidden="true" style={{ marginInlineStart: 6 }}>{categoryEmoji}</span>
        {item.name}
      </h3>

      <div className="kitchen-card-customer">
        <div className="kitchen-customer-row">
          <span>طلب #{order.id?.slice(-6).toUpperCase()}</span>
          <IoDocumentTextOutline size={14} />
        </div>
        <div className="kitchen-customer-row">
          <span>{order.isDelivery ? '🚗 توصيل' : '🍽️ داخل المطعم'} — {order.customerName || 'زبون'}</span>
        </div>
        {order.isDelivery && order.customerPhone ? (
          <div className="kitchen-customer-row">
            <span dir="ltr">{order.customerPhone}</span>
            <IoCallOutline size={14} />
          </div>
        ) : null}
        {order.isDelivery && order.customerAddress ? (
          <div className="kitchen-customer-row">
            <span className="kitchen-address">{order.customerAddress}</span>
            <IoLocationOutline size={14} />
          </div>
        ) : null}
        {order.customerNote ? (
          <div className="kitchen-customer-row">
            <span style={{ fontStyle: 'italic', opacity: 0.85 }}>📝 {order.customerNote}</span>
          </div>
        ) : null}
      </div>

      <div className="kitchen-card-items">
        <div className="kitchen-item-row">
          <span className="kitchen-item-qty">×{item.quantity}</span>
          <span className="kitchen-item-name">{item.name}</span>
          <div className="kitchen-item-thumb">
            {item.image
              ? <img src={item.image} alt={item.name} className="kitchen-item-img" />
              : <span className="kitchen-item-emoji">{categoryEmoji}</span>
            }
          </div>
        </div>
      </div>

      {itemStatus === 'new' && (
        <button
          type="button"
          onClick={() => onStart(order.id, itemIndex)}
          disabled={isBusy}
          className="kitchen-card-btn kitchen-btn-new"
        >
          {isBusy ? '...جاري' : 'بدء التحضير 👨‍🍳'}
        </button>
      )}
      {itemStatus === 'preparing' && (
        <button
          type="button"
          onClick={() => onReady(order.id, itemIndex)}
          disabled={isBusy}
          className="kitchen-card-btn kitchen-btn-preparing"
        >
          {isBusy ? '...جاري' : 'تم التحضير ✓'}
        </button>
      )}
      {itemStatus === 'ready' && (
        <div className="kitchen-card-ready-actions">
          <button
            type="button"
            onClick={() => onReset(order.id, itemIndex)}
            disabled={isBusy}
            className="kitchen-card-archive-btn"
            title="إعادة الصنف للحالة الأولى"
            aria-label="تراجع"
          >
            <IoArrowUndoOutline size={16} />
          </button>
          {order.workerReady ? (
            <button
              type="button"
              onClick={() => onArchive?.(order.id)}
              disabled={acting === `archive-${order.id}`}
              className="kitchen-card-archive-btn"
              title="حذف الطلب من الواجهة"
              aria-label="حذف"
            >
              <IoTrashOutline size={16} />
            </button>
          ) : null}
          <button
            type="button"
            disabled
            className="kitchen-card-btn kitchen-btn-ready"
          >
            <IoCheckmarkCircle size={18} />
            جاهز
          </button>
        </div>
      )}
    </article>
  );
}
