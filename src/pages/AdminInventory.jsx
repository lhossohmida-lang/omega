import { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { getInventoryMovements, addInventoryMovement } from '../services/inventoryService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import AdminNav from '../components/AdminNav';
import {
  IoCube, IoAdd, IoRemove, IoClose, IoSwapVertical,
  IoTrendingUp, IoTrendingDown, IoWarning, IoCheckmarkCircle
} from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function AdminInventory() {
  const { userData } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, m] = await Promise.all([getAllProducts(), getInventoryMovements()]);
      setProducts(p);
      setMovements(m);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleMovement = async () => {
    if (!quantity) { toast.error('أدخل الكمية'); return; }
    setSaving(true);
    try {
      await addInventoryMovement({
        productId: showModal.product.id,
        productName: showModal.product.name,
        type: showModal.type,
        quantity: Number(quantity),
        note,
        createdBy: userData.uid,
      });
      toast.success('تم تحديث المخزون');
      setShowModal(null);
      setQuantity('');
      setNote('');
      loadData();
    } catch (err) { toast.error('خطأ'); console.error(err); }
    setSaving(false);
  };

  const typeConfig = {
    add: { label: 'إضافة', color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/25', icon: IoTrendingUp },
    remove: { label: 'إنقاص', color: 'text-omega-red', bg: 'bg-omega-red/12 border-omega-red/25', icon: IoTrendingDown },
    sale: { label: 'بيع', color: 'text-omega-orange', bg: 'bg-omega-orange/12 border-omega-orange/25', icon: IoTrendingDown },
    correction: { label: 'تصحيح', color: 'text-omega-info', bg: 'bg-blue-500/12 border-blue-500/25', icon: IoSwapVertical },
  };

  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="page-header-icon">
                <IoCube size={22} />
              </div>
              <div>
                <h1 className="page-title">إدارة المخزون</h1>
                <p className="page-subtitle">{products.length} منتج • {totalStock} وحدة في المخزون</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="grid grid-cols-3 gap-3 mb-5 stagger">
              <div className="stat-card bg-gradient-to-br from-emerald-500 to-emerald-700">
                <div className="relative z-10">
                  <IoCheckmarkCircle className="text-white/80 mb-2" size={20} />
                  <p className="text-white/85 text-[11px]">في المخزون</p>
                  <p className="text-white font-black text-xl">{totalStock}</p>
                </div>
              </div>
              <div className="stat-card bg-gradient-to-br from-yellow-500 to-orange-700">
                <div className="relative z-10">
                  <IoWarning className="text-white/80 mb-2" size={20} />
                  <p className="text-white/85 text-[11px]">منخفض</p>
                  <p className="text-white font-black text-xl">{lowStockCount}</p>
                </div>
              </div>
              <div className="stat-card bg-gradient-to-br from-red-500 to-red-800">
                <div className="relative z-10">
                  <IoClose className="text-white/80 mb-2" size={20} />
                  <p className="text-white/85 text-[11px]">نفد</p>
                  <p className="text-white font-black text-xl">{outOfStock}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20" />)}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Products */}
              <div className="lg:col-span-2">
                <h3 className="section-title"><IoCube className="text-omega-orange" size={18} /> المنتجات</h3>
                <div className="space-y-2 stagger">
                  {products.map((p) => (
                    <div key={p.id} className="card-premium p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-bold truncate">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`badge ${
                              p.stock === 0 ? 'bg-omega-red/12 text-omega-red border-omega-red/25' :
                              p.stock <= 5 ? 'bg-yellow-500/12 text-yellow-400 border-yellow-500/25' :
                              'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
                            }`}>
                              {p.stock} وحدة
                            </span>
                            <span className="text-omega-text-dim text-[10px]">{formatCurrency(p.price)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setShowModal({ product: p, type: 'add' })}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all" title="إضافة">
                            <IoAdd size={16} />
                          </button>
                          <button onClick={() => setShowModal({ product: p, type: 'remove' })}
                            className="p-2 rounded-xl bg-omega-red/10 text-omega-red hover:bg-omega-red/20 transition-all" title="إنقاص">
                            <IoRemove size={16} />
                          </button>
                          <button onClick={() => setShowModal({ product: p, type: 'correction' })}
                            className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="تصحيح">
                            <IoSwapVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Movements */}
              <div>
                <h3 className="section-title"><IoSwapVertical className="text-omega-info" size={18} /> آخر الحركات</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar">
                  {movements.length === 0 ? (
                    <div className="card-premium p-8 text-center">
                      <IoSwapVertical className="text-omega-text-dim mx-auto mb-2" size={32} />
                      <p className="text-omega-text-muted text-sm">لا توجد حركات</p>
                    </div>
                  ) : movements.map((m) => {
                    const t = typeConfig[m.type] || typeConfig.correction;
                    return (
                      <div key={m.id} className="card-premium p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-white text-xs font-bold truncate flex-1">{m.productName}</span>
                          <span className={`badge ${t.bg} ${t.color}`}>{t.label}</span>
                        </div>
                        {m.note && <p className="text-omega-text-dim text-[10px] mb-1">{m.note}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-omega-text-dim text-[10px]">{timeAgo(m.createdAt)}</span>
                          <span className={`text-sm font-black ${m.quantity > 0 ? 'text-emerald-400' : 'text-omega-red'}`}>
                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Movement Modal */}
      {showModal && (() => {
        const t = typeConfig[showModal.type];
        const Icon = t.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(null)} />
            <div className="relative card-premium rounded-t-3xl lg:rounded-3xl w-full max-w-sm p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center ${t.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-black">{t.label}</h3>
                    <p className="text-omega-text-muted text-xs">{showModal.product.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(null)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-omega-text-muted hover:text-white flex items-center justify-center transition-colors">
                  <IoClose size={20} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-omega-text-muted text-xs mb-1">المخزون الحالي</p>
                  <p className="text-white font-black text-3xl">{showModal.product.stock}</p>
                </div>
                <div>
                  <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">
                    {showModal.type === 'correction' ? 'الكمية الجديدة' : 'الكمية'}
                  </label>
                  <input type="number" placeholder="0" value={quantity}
                    onChange={e => setQuantity(e.target.value)} autoFocus
                    className="input-modern text-center font-bold text-lg" />
                </div>
                <div>
                  <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">ملاحظة (اختياري)</label>
                  <input type="text" placeholder="سبب الحركة..." value={note} onChange={e => setNote(e.target.value)}
                    className="input-modern" />
                </div>
                <button onClick={handleMovement} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>تأكيد</span>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
