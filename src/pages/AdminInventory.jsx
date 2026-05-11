import { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { getInventoryMovements, addInventoryMovement } from '../services/inventoryService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import AdminNav from '../components/AdminNav';
import { IoCube, IoAdd, IoRemove, IoClose, IoSwapVertical } from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function AdminInventory() {
  const { userData } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // { product, type }
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

  const typeLabels = { add: 'إضافة', remove: 'إنقاص', sale: 'بيع', correction: 'تصحيح' };
  const typeColors = { add: 'text-omega-success', remove: 'text-omega-red', sale: 'text-omega-orange', correction: 'text-omega-info' };

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-4xl mx-auto px-4 pt-16 lg:pt-6">
          <h1 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <IoCube className="text-omega-orange" /> إدارة المخزون
          </h1>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : (
            <>
              {/* المنتجات والمخزون */}
              <div className="space-y-3 mb-6">
                {products.map((p, idx) => (
                  <div key={p.id} className="glass rounded-xl p-3 animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-bold">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            p.stock === 0 ? 'bg-omega-red/15 text-omega-red' : p.stock <= 5 ? 'bg-yellow-500/15 text-yellow-500' : 'bg-omega-success/15 text-omega-success'
                          }`}>{p.stock} في المخزون</span>
                          <span className="text-omega-text-muted text-[10px]">{formatCurrency(p.price)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setShowModal({ product: p, type: 'add' })}
                          className="p-2 rounded-lg bg-omega-success/10 text-omega-success hover:bg-omega-success/20 transition-all" title="إضافة">
                          <IoAdd size={16} />
                        </button>
                        <button onClick={() => setShowModal({ product: p, type: 'remove' })}
                          className="p-2 rounded-lg bg-omega-red/10 text-omega-red hover:bg-omega-red/20 transition-all" title="إنقاص">
                          <IoRemove size={16} />
                        </button>
                        <button onClick={() => setShowModal({ product: p, type: 'correction' })}
                          className="p-2 rounded-lg bg-omega-info/10 text-omega-info hover:bg-omega-info/20 transition-all" title="تصحيح">
                          <IoSwapVertical size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* حركات المخزون */}
              <h3 className="text-white font-bold mb-3">آخر حركات المخزون</h3>
              <div className="space-y-2">
                {movements.length === 0 ? (
                  <p className="text-omega-text-muted text-sm text-center py-8">لا توجد حركات</p>
                ) : movements.map((m, i) => (
                  <div key={m.id} className="glass rounded-xl px-3 py-2 flex items-center justify-between text-sm animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                    <div>
                      <span className="text-white">{m.productName}</span>
                      <span className={`text-xs mr-2 ${typeColors[m.type]}`}>[{typeLabels[m.type]}]</span>
                      {m.note && <span className="text-omega-text-muted text-xs mr-2">- {m.note}</span>}
                    </div>
                    <div className="text-left">
                      <span className={`font-bold ${m.quantity > 0 ? 'text-omega-success' : 'text-omega-red'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                      <p className="text-omega-text-muted text-[10px]">{timeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* نافذة تحديث المخزون */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(null)} />
          <div className="relative glass rounded-t-2xl lg:rounded-2xl w-full max-w-sm p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">{typeLabels[showModal.type]} - {showModal.product.name}</h3>
              <button onClick={() => setShowModal(null)} className="text-omega-text-muted"><IoClose size={22} /></button>
            </div>
            <div className="space-y-3">
              <p className="text-omega-text-muted text-sm">المخزون الحالي: <span className="text-white font-bold">{showModal.product.stock}</span></p>
              <input type="number" placeholder={showModal.type === 'correction' ? 'الكمية الجديدة' : 'الكمية'} value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50" />
              <input type="text" placeholder="ملاحظة (اختياري)" value={note} onChange={e => setNote(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50" />
              <button onClick={handleMovement} disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>تأكيد</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
