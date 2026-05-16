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
  IoFlame,
  IoCheckmarkCircle,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoTrashOutline,
  IoArrowUndoOutline,
  IoCarOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

// أقسام المطبخ — كل قسم يجمع كل أصنافه من جميع الطلبات النشطة
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

  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

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

  // بناء قسم واحد لكل تصنيف يحتوي كل صفوف الأصناف من جميع الطلبات
  const categoryGroups = useMemo(() => {
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
    setActing(`${orderId}-${itemIndex}`);
    try {
      await setItemStatus(orderId, itemIndex, 'preparing');
      toast.success('بدأ التحضير 🔥');
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleReadyItem = async (orderId, itemIndex) => {
    setActing(`${orderId}-${itemIndex}`);
    try {
      await setItemStatus(orderId, itemIndex, 'ready');
      toast.success('جاهز ✅');
    } catch (e) {
      toast.error(e.message || 'فشل');
    }
    setActing(null);
  };

  const handleResetItem = async (orderId, itemIndex) => {
    setActing(`${orderId}-${itemIndex}`);
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
              <p>كل قسم في مكان واحد — توصيل أخضر، طاولة أحمر</p>
            </div>
            <div className="kitchen-header-logo">
              <IoRestaurant size={28} />
            </div>
          </div>
        </header>

        {/* مفاتيح اللون */}
        <div className="kitchen-legend">
          <span className="kitchen-legend-chip kitchen-legend-delivery">
            <IoCarOutline size={14} /> توصيل
          </span>
          <span className="kitchen-legend-chip kitchen-legend-table">
            <IoRestaurantOutline size={14} /> طاولة (داخل المطعم)
          </span>
        </div>

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
          <div className="kitchen-empty">
            <span className="kitchen-empty-emoji">🍽️</span>
            <p>لا توجد طلبات حالياً</p>
          </div>
        ) : (
          <div className="kitchen-category-grid">
            {CATEGORIES.map((cat) => {
              const rows = categoryGroups[cat.id] || [];
              if (rows.length === 0) return null;
              const newCount = rows.filter(r => r.itemStatus === 'new').length;
              const prepCount = rows.filter(r => r.itemStatus === 'preparing').length;
              const readyCount = rows.filter(r => r.itemStatus === 'ready').length;
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  rows={rows}
                  counts={{ new: newCount, preparing: prepCount, ready: readyCount }}
                  acting={acting}
                  onStart={handleStartItem}
                  onReady={handleReadyItem}
                  onReset={handleResetItem}
                  onArchive={handleArchive}
                />
              );
            })}
          </div>
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

function CategoryCard({ category, rows, counts, acting, onStart, onReady, onReset, onArchive }) {
  return (
    <article className="kitchen-category-card">
      <header className="kitchen-category-head">
        <div className="kitchen-category-counts">
          {counts.new > 0 && <span className="kitchen-category-badge new">جديد {counts.new}</span>}
          {counts.preparing > 0 && <span className="kitchen-category-badge preparing">{counts.preparing} قيد التحضير</span>}
          {counts.ready > 0 && <span className="kitchen-category-badge ready">{counts.ready} جاهز</span>}
        </div>
        <h2 className="kitchen-category-title">
          <span className="kitchen-category-emoji" aria-hidden="true">{category.emoji}</span>
          {category.label}
        </h2>
      </header>

      <ul className="kitchen-category-list">
        {rows.map((row) => (
          <ItemRow
            key={row.key}
            row={row}
            categoryEmoji={category.emoji}
            acting={acting}
            onStart={onStart}
            onReady={onReady}
            onReset={onReset}
            onArchive={onArchive}
          />
        ))}
      </ul>
    </article>
  );
}

function ItemRow({ row, categoryEmoji, acting, onStart, onReady, onReset, onArchive }) {
  const { order, item, index, itemStatus } = row;
  const isDelivery = !!order.isDelivery;
  const rowKey = `${order.id}-${index}`;
  const isBusy = acting === rowKey;

  return (
    <li className={`kitchen-row kitchen-row-${isDelivery ? 'delivery' : 'table'} kitchen-row-${itemStatus}`}>
      <div className="kitchen-row-main">
        <div className="kitchen-row-thumb">
          {item.image
            ? <img src={item.image} alt={item.name} />
            : <span aria-hidden="true">{categoryEmoji}</span>}
        </div>
        <div className="kitchen-row-info">
          <div className="kitchen-row-line1">
            <strong className="kitchen-row-name">{item.name}</strong>
            <span className="kitchen-row-qty">×{item.quantity}</span>
          </div>
          <div className="kitchen-row-line2">
            <span className={`kitchen-type-chip ${isDelivery ? 'delivery' : 'table'}`}>
              {isDelivery
                ? (<><IoCarOutline size={12} /> توصيل</>)
                : (<><IoRestaurantOutline size={12} /> طاولة</>)}
            </span>
            <span className="kitchen-row-order">#{order.id?.slice(-6).toUpperCase()}</span>
            <span className="kitchen-row-time">
              <IoTimeOutline size={11} /> {timeAgo(order.createdAt)}
            </span>
          </div>
          {(order.customerName || (isDelivery && order.customerPhone)) && (
            <div className="kitchen-row-line3">
              {order.customerName ? <span>{order.customerName}</span> : null}
              {isDelivery && order.customerPhone ? (
                <span dir="ltr"><IoCallOutline size={11} /> {order.customerPhone}</span>
              ) : null}
            </div>
          )}
          {isDelivery && order.customerAddress ? (
            <div className="kitchen-row-line3">
              <span className="kitchen-row-address">📍 {order.customerAddress}</span>
            </div>
          ) : null}
          {order.customerNote ? (
            <div className="kitchen-row-line3">
              <span className="kitchen-row-note">📝 {order.customerNote}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="kitchen-row-actions">
        {itemStatus === 'new' && (
          <button
            type="button"
            onClick={() => onStart(order.id, index)}
            disabled={isBusy}
            className="kitchen-row-btn kitchen-row-btn-start"
          >
            {isBusy ? '...' : '👨‍🍳 بدء'}
          </button>
        )}
        {itemStatus === 'preparing' && (
          <button
            type="button"
            onClick={() => onReady(order.id, index)}
            disabled={isBusy}
            className="kitchen-row-btn kitchen-row-btn-ready-action"
          >
            {isBusy ? '...' : '✓ جاهز'}
          </button>
        )}
        {itemStatus === 'ready' && (
          <>
            <button
              type="button"
              onClick={() => onReset(order.id, index)}
              disabled={isBusy}
              className="kitchen-row-btn kitchen-row-btn-undo"
              title="تراجع"
              aria-label="تراجع"
            >
              <IoArrowUndoOutline size={14} />
            </button>
            <span className="kitchen-row-done">
              <IoCheckmarkCircle size={16} /> جاهز
            </span>
            {order.workerReady ? (
              <button
                type="button"
                onClick={() => onArchive?.(order.id)}
                disabled={acting === `archive-${order.id}`}
                className="kitchen-row-btn kitchen-row-btn-archive"
                title="حذف الطلب من الواجهة"
                aria-label="حذف"
              >
                <IoTrashOutline size={14} />
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
