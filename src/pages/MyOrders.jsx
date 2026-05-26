import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdersByIds } from '../services/orderService';
import { getTrackedOrderIds, clearTrackedOrders } from '../utils/guestStorage';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import CustomerNav from '../components/CustomerNav';
import {
  IoArrowBack,
  IoChevronBack,
  IoListOutline,
  IoSearch,
  IoTrashOutline,
} from 'react-icons/io5';

const tabs = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'جديد' },
  { key: 'preparing', label: 'قيد التجهيز' },
  { key: 'ready', label: 'جاهز' },
  { key: 'delivered', label: 'تم التسليم' },
];

const statusLabels = {
  pending: { label: 'جديد', tone: 'soft' },
  preparing: { label: 'قيد التجهيز', tone: 'red' },
  ready: { label: 'جاهز', tone: 'green' },
  delivered: { label: 'تم التسليم', tone: 'green' },
  cancelled: { label: 'ملغي', tone: 'red' },
};

function deriveDisplayStatus(order) {
  if (order.status === 'delivered') return 'delivered';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.workerReady) return 'ready';
  if (order.status === 'preparing') return 'preparing';
  return 'pending';
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const ids = getTrackedOrderIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    getOrdersByIds(ids)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();
    return orders.filter((order) => {
      const display = deriveDisplayStatus(order);
      if (activeTab !== 'all' && display !== activeTab) return false;
      return !value || order.id?.toLowerCase().includes(value);
    });
  }, [orders, activeTab, search]);

  const handleClear = () => {
    if (!confirm('سيتم حذف قائمة طلباتك من هذا الجهاز فقط (الطلبات تبقى محفوظة في النظام). متابعة؟')) return;
    clearTrackedOrders();
    setOrders([]);
  };

  return (
    <div className="omega-app-shell">
      <main className="omega-app-main">
        <header className="omega-mobile-header">
          <button type="button" onClick={() => navigate(-1)} className="omega-icon-button red" aria-label="رجوع">
            <IoArrowBack size={25} />
          </button>
          <div className="omega-mobile-title">
            <div className="omega-mini-logo mx-auto mb-2">
              <img src="/logo.png?v=2" alt="OMEGA" />
            </div>
            <h1>طلباتي</h1>
            <p>{orders.length} طلب متتبَّع</p>
          </div>
          {orders.length > 0 ? (
            <button type="button" onClick={handleClear} className="omega-icon-button red" aria-label="مسح القائمة">
              <IoTrashOutline size={22} />
            </button>
          ) : (
            <span className="omega-icon-button" style={{ visibility: 'hidden' }} />
          )}
        </header>

        <section className="omega-tabs mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`omega-tab${activeTab === tab.key ? ' active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        <div className="ch-search-row" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
          <label className="ch-search-box">
            <IoSearch size={20} className="ch-search-icon" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث برقم الطلب"
            />
          </label>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-36 rounded-[1.35rem]" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <section className="omega-card omega-empty-state">
            <div>
              <IoListOutline className="mx-auto mb-3 text-omega-orange" size={42} />
              <strong>لا توجد طلبات</strong>
              <p>عند الطلب سيتم حفظه هنا تلقائياً لتتبّعه</p>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            {filteredOrders.map((order) => {
              const status = statusLabels[deriveDisplayStatus(order)] || statusLabels.pending;
              const firstItems = (order.items || []).slice(0, 3);
              return (
                <article
                  key={order.id}
                  className={`omega-card omega-order-card ${status.tone === 'green' ? 'green' : status.tone === 'red' ? 'red' : ''}`}
                  onClick={() => navigate(`/track/${order.id}`)}
                >
                  <div className="omega-order-top">
                    <button type="button" className="omega-icon-button" style={{ width: '2.8rem', height: '2.8rem' }}>
                      <IoChevronBack size={22} />
                    </button>
                    <div className="text-right">
                      <strong className="omega-order-id">#{order.id?.slice(-6)}</strong>
                      <p className="mt-1 text-sm font-bold text-omega-text-muted">{timeAgo(order.createdAt)}</p>
                    </div>
                    <span className={`omega-status-badge ${status.tone}`}>{status.label}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="text-right">
                      <h2 className="text-xl font-black text-omega-text">{order.customerName || 'زبون'}</h2>
                      <span
                        className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black border"
                        style={
                          order.isDelivery
                            ? { color: '#16a34a', background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)' }
                            : { color: '#dc2626', background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)' }
                        }
                      >
                        {order.isDelivery ? '🚗 توصيل' : '🍽️ داخل المطعم'}
                      </span>
                    </div>
                    <strong className="omega-price text-left">{formatCurrency(order.totalPrice)}</strong>
                  </div>

                  <div className="mt-3 omega-meta-line">
                    {firstItems.map((item, index) => (
                      <span key={`${item.name}-${index}`}>
                        {item.type === 'offer' ? 'عرض: ' : ''}{item.quantity} {item.name}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
      <CustomerNav />
    </div>
  );
}
