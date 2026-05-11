import { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import {
  getInventoryMovements, addInventoryMovement,
  getAllIngredients, addIngredient, updateIngredient, deleteIngredient,
  getIngredientPurchases, addIngredientPurchase, deleteIngredientPurchase,
} from '../services/inventoryService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import AdminNav from '../components/AdminNav';
import {
  IoCube, IoAdd, IoRemove, IoClose, IoSwapVertical,
  IoTrendingUp, IoTrendingDown, IoWarning, IoCheckmarkCircle,
  IoLeaf, IoCreate, IoTrash, IoPricetag, IoSearch, IoCart, IoCalendar
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const UNITS = ['كيلو', 'غرام', 'لتر', 'مل', 'حبة', 'علبة', 'كيس', 'وحدة'];

export default function AdminInventory() {
  const { userData } = useAuth();
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product movement modal
  const [showModal, setShowModal] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Ingredient state
  const [ingForm, setIngForm] = useState(null); // create/edit ingredient slot
  const [ingSearch, setIngSearch] = useState('');
  const [selectedIng, setSelectedIng] = useState(null); // detail panel
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ quantity: '', unitPrice: '', note: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, m, ing] = await Promise.all([
        getAllProducts(),
        getInventoryMovements(),
        getAllIngredients(),
      ]);
      setProducts(p);
      setMovements(m);
      setIngredients(ing);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ---- Product movements ----
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

  // ---- Ingredient slot ----
  const openNewIngredient = () => setIngForm({ name: '', unit: 'كيلو' });
  const openEditIngredient = (ing) => setIngForm({ id: ing.id, name: ing.name, unit: ing.unit });

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!ingForm.name?.trim()) { toast.error('أدخل اسم المكوّن'); return; }
    setSaving(true);
    try {
      if (ingForm.id) {
        await updateIngredient(ingForm.id, { name: ingForm.name.trim(), unit: ingForm.unit });
        toast.success('تم التعديل');
      } else {
        await addIngredient({ name: ingForm.name.trim(), unit: ingForm.unit });
        toast.success('تم إنشاء الخانة');
      }
      setIngForm(null);
      loadData();
    } catch (err) { toast.error('خطأ'); console.error(err); }
    setSaving(false);
  };

  const handleDeleteIngredient = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}" وجميع مشترياته؟`)) return;
    try {
      await deleteIngredient(id);
      toast.success('تم الحذف');
      loadData();
      if (selectedIng?.id === id) setSelectedIng(null);
    } catch (err) { toast.error('خطأ'); }
  };

  // ---- Purchases ----
  const openIngredientDetail = async (ing) => {
    setSelectedIng(ing);
    setPurchaseForm({ quantity: '', unitPrice: '', note: '' });
    setLoadingPurchases(true);
    try {
      const list = await getIngredientPurchases(ing.id);
      setPurchases(list);
    } catch (err) { console.error(err); }
    setLoadingPurchases(false);
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.quantity || !purchaseForm.unitPrice) {
      toast.error('أدخل الكمية والسعر');
      return;
    }
    setSaving(true);
    try {
      await addIngredientPurchase({
        ingredientId: selectedIng.id,
        quantity: purchaseForm.quantity,
        unitPrice: purchaseForm.unitPrice,
        note: purchaseForm.note,
      });
      toast.success('تمت إضافة عملية الشراء');
      setPurchaseForm({ quantity: '', unitPrice: '', note: '' });
      // Refresh
      const [list, allIngs] = await Promise.all([
        getIngredientPurchases(selectedIng.id),
        getAllIngredients(),
      ]);
      setPurchases(list);
      setIngredients(allIngs);
      const updated = allIngs.find(i => i.id === selectedIng.id);
      if (updated) setSelectedIng(updated);
    } catch (err) { toast.error('خطأ'); console.error(err); }
    setSaving(false);
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!confirm('حذف عملية الشراء هذه؟')) return;
    try {
      await deleteIngredientPurchase(purchaseId, selectedIng.id);
      toast.success('تم الحذف');
      const [list, allIngs] = await Promise.all([
        getIngredientPurchases(selectedIng.id),
        getAllIngredients(),
      ]);
      setPurchases(list);
      setIngredients(allIngs);
      const updated = allIngs.find(i => i.id === selectedIng.id);
      if (updated) setSelectedIng(updated);
    } catch (err) { toast.error('خطأ'); }
  };

  const typeConfig = {
    add: { label: 'إضافة', color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/25', icon: IoTrendingUp },
    remove: { label: 'إنقاص', color: 'text-omega-red', bg: 'bg-omega-red/12 border-omega-red/25', icon: IoTrendingDown },
    sale: { label: 'بيع', color: 'text-omega-orange', bg: 'bg-omega-orange/12 border-omega-orange/25', icon: IoTrendingDown },
    correction: { label: 'تصحيح', color: 'text-omega-info', bg: 'bg-blue-500/12 border-blue-500/25', icon: IoSwapVertical },
  };

  const totalIngredientsSpent = ingredients.reduce((s, i) => s + (i.totalSpent || 0), 0);
  const totalPurchases = ingredients.reduce((s, i) => s + (i.purchaseCount || 0), 0);

  const filteredIngredients = ingredients.filter(i =>
    !ingSearch || i.name?.toLowerCase().includes(ingSearch.toLowerCase())
  );

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
                <p className="page-subtitle">
                  {tab === 'products'
                    ? `${products.length} منتج`
                    : `${ingredients.length} مكوّن • ${totalPurchases} عملية شراء`}
                </p>
              </div>
            </div>
            {tab === 'ingredients' && (
              <button onClick={openNewIngredient} className="btn-primary flex items-center gap-2 text-sm">
                <IoAdd size={18} /> <span className="hidden sm:inline">خانة جديدة</span>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 p-1 rounded-2xl bg-white/3 border border-white/5 max-w-md">
            <button
              onClick={() => setTab('products')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'products'
                  ? 'bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white shadow-lg shadow-omega-orange/30'
                  : 'text-omega-text-muted hover:text-white'
              }`}
            >
              <IoCube size={16} /> المنتجات
            </button>
            <button
              onClick={() => setTab('ingredients')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'ingredients'
                  ? 'bg-gradient-to-l from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-omega-text-muted hover:text-white'
              }`}
            >
              <IoLeaf size={16} /> المواد الخام
            </button>
          </div>

          {/* ============ PRODUCTS TAB ============ */}
          {tab === 'products' && (
            <>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20" />)}</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                                }`}>{p.stock || 0} وحدة</span>
                                <span className="text-omega-text-dim text-[10px]">{formatCurrency(p.price)}</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => setShowModal({ product: p, type: 'add' })}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                <IoAdd size={16} />
                              </button>
                              <button onClick={() => setShowModal({ product: p, type: 'remove' })}
                                className="p-2 rounded-xl bg-omega-red/10 text-omega-red hover:bg-omega-red/20 transition-all">
                                <IoRemove size={16} />
                              </button>
                              <button onClick={() => setShowModal({ product: p, type: 'correction' })}
                                className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                                <IoSwapVertical size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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
            </>
          )}

          {/* ============ INGREDIENTS TAB ============ */}
          {tab === 'ingredients' && (
            <>
              {!loading && ingredients.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-5 stagger">
                  <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-700">
                    <div className="relative z-10">
                      <IoLeaf className="text-white/80 mb-2" size={20} />
                      <p className="text-white/85 text-[11px]">عدد الخانات</p>
                      <p className="text-white font-black text-xl">{ingredients.length}</p>
                    </div>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-omega-orange to-omega-red">
                    <div className="relative z-10">
                      <IoPricetag className="text-white/80 mb-2" size={20} />
                      <p className="text-white/85 text-[11px]">إجمالي الإنفاق</p>
                      <p className="text-white font-black text-base lg:text-xl">{formatCurrency(totalIngredientsSpent)}</p>
                    </div>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-700">
                    <div className="relative z-10">
                      <IoCart className="text-white/80 mb-2" size={20} />
                      <p className="text-white/85 text-[11px]">عمليات الشراء</p>
                      <p className="text-white font-black text-xl">{totalPurchases}</p>
                    </div>
                  </div>
                </div>
              )}

              {ingredients.length > 0 && (
                <div className="relative mb-5">
                  <IoSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-omega-text-dim" size={18} />
                  <input
                    type="text"
                    placeholder="ابحث عن مكوّن..."
                    value={ingSearch}
                    onChange={e => setIngSearch(e.target.value)}
                    className="input-modern pr-11"
                  />
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}</div>
              ) : ingredients.length === 0 ? (
                <div className="card-premium p-12 text-center">
                  <div className="text-6xl mb-4">🌾</div>
                  <p className="text-white font-bold mb-1">لا توجد خانات بعد</p>
                  <p className="text-omega-text-muted text-sm mb-5">
                    أنشئ خانة لكل مكوّن (دقيق، خبز، أوراق تاكوس...) ثم سجّل كل عملية شراء بكميتها وسعرها.
                  </p>
                  <button onClick={openNewIngredient} className="btn-primary inline-flex items-center gap-2 text-sm">
                    <IoAdd size={18} /> إنشاء أول خانة
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 stagger">
                  {filteredIngredients.map(ing => {
                    const avgPrice = ing.totalStock > 0 && ing.totalSpent > 0
                      ? ing.totalSpent / ing.totalStock : 0;
                    return (
                      <div key={ing.id} className="card-premium p-4 group cursor-pointer" onClick={() => openIngredientDetail(ing)}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <IoLeaf className="text-emerald-400" size={20} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-white text-sm font-bold truncate">{ing.name}</h4>
                              <p className="text-omega-text-dim text-[10px]">{ing.unit} • {ing.purchaseCount || 0} عملية شراء</p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditIngredient(ing)}
                              className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-orange hover:bg-omega-orange/10 transition-all">
                              <IoCreate size={15} />
                            </button>
                            <button onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                              className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-red hover:bg-omega-red/10 transition-all">
                              <IoTrash size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2.5 text-center">
                            <p className="text-omega-text-dim text-[9px] mb-0.5">الكمية</p>
                            <p className="text-emerald-400 font-black text-sm">{(ing.totalStock || 0).toLocaleString('ar')}</p>
                            <p className="text-omega-text-dim text-[9px]">{ing.unit}</p>
                          </div>
                          <div className="bg-omega-orange/5 border border-omega-orange/15 rounded-xl p-2.5 text-center">
                            <p className="text-omega-text-dim text-[9px] mb-0.5">المنفق</p>
                            <p className="text-omega-orange font-black text-xs leading-tight pt-0.5">{formatCurrency(ing.totalSpent || 0)}</p>
                          </div>
                          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-2.5 text-center">
                            <p className="text-omega-text-dim text-[9px] mb-0.5">متوسط السعر</p>
                            <p className="text-blue-400 font-black text-xs leading-tight pt-0.5">{formatCurrency(avgPrice)}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-omega-text-dim text-[10px]">
                            {ing.lastPurchaseAt ? `آخر شراء: ${timeAgo(ing.lastPurchaseAt)}` : 'لم يُسجّل شراء بعد'}
                          </span>
                          <span className="text-omega-orange text-[11px] font-bold flex items-center gap-1">
                            <IoCart size={11} /> سجّل شراء
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Product Movement Modal */}
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
                  <p className="text-white font-black text-3xl">{showModal.product.stock || 0}</p>
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

      {/* Ingredient slot form Modal (create/edit) */}
      {ingForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setIngForm(null)} />
          <div className="relative card-premium rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <IoLeaf size={20} />
                </div>
                <h3 className="text-white font-black text-lg">
                  {ingForm.id ? 'تعديل الخانة' : 'خانة مكوّن جديدة'}
                </h3>
              </div>
              <button onClick={() => setIngForm(null)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-omega-text-muted hover:text-white flex items-center justify-center transition-colors">
                <IoClose size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveIngredient} className="space-y-3">
              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">اسم المكوّن *</label>
                <input type="text" placeholder="مثلاً: دقيق، خبز برجر، أوراق تاكوس..."
                  value={ingForm.name} autoFocus
                  onChange={e => setIngForm({ ...ingForm, name: e.target.value })}
                  className="input-modern" />
              </div>

              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">وحدة القياس</label>
                <div className="grid grid-cols-4 gap-2">
                  {UNITS.map(u => (
                    <button type="button" key={u} onClick={() => setIngForm({ ...ingForm, unit: u })}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all
                        ${ingForm.unit === u
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                          : 'bg-white/3 border-white/8 text-omega-text-muted hover:text-white'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-omega-text-dim text-[11px] leading-relaxed pt-1">
                💡 بعد إنشاء الخانة، انقر عليها لتسجيل كل عملية شراء بكميتها وسعرها.
              </p>

              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {saving
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span>{ingForm.id ? 'حفظ' : 'إنشاء الخانة'}</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ingredient detail / purchases panel */}
      {selectedIng && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedIng(null)} />
          <div className="relative card-premium rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <IoLeaf size={20} />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">{selectedIng.name}</h3>
                  <p className="text-omega-text-muted text-xs">{selectedIng.unit}</p>
                </div>
              </div>
              <button onClick={() => setSelectedIng(null)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-omega-text-muted hover:text-white flex items-center justify-center transition-colors">
                <IoClose size={20} />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-center">
                <p className="text-omega-text-dim text-[10px] mb-0.5">الكمية</p>
                <p className="text-emerald-400 font-black text-base">{selectedIng.totalStock || 0}</p>
                <p className="text-omega-text-dim text-[9px]">{selectedIng.unit}</p>
              </div>
              <div className="bg-omega-orange/5 border border-omega-orange/15 rounded-xl p-3 text-center">
                <p className="text-omega-text-dim text-[10px] mb-0.5">المنفق</p>
                <p className="text-omega-orange font-black text-xs leading-tight pt-0.5">{formatCurrency(selectedIng.totalSpent || 0)}</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 text-center">
                <p className="text-omega-text-dim text-[10px] mb-0.5">العمليات</p>
                <p className="text-blue-400 font-black text-base">{selectedIng.purchaseCount || 0}</p>
              </div>
            </div>

            {/* Add purchase form */}
            <form onSubmit={handleAddPurchase} className="bg-white/3 border border-white/8 rounded-2xl p-4 mb-4">
              <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <IoCart className="text-omega-orange" size={16} /> تسجيل عملية شراء
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-omega-text-muted text-[10px] block mb-1 mr-1">الكمية ({selectedIng.unit})</label>
                  <input type="number" step="0.01" placeholder="0" value={purchaseForm.quantity}
                    onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="input-modern text-center font-bold" />
                </div>
                <div>
                  <label className="text-omega-text-muted text-[10px] block mb-1 mr-1">سعر الوحدة</label>
                  <input type="number" step="0.01" placeholder="0" value={purchaseForm.unitPrice}
                    onChange={e => setPurchaseForm({ ...purchaseForm, unitPrice: e.target.value })}
                    className="input-modern text-center font-bold" />
                </div>
              </div>
              <input type="text" placeholder="ملاحظة (اختياري)" value={purchaseForm.note}
                onChange={e => setPurchaseForm({ ...purchaseForm, note: e.target.value })}
                className="input-modern mb-2" />

              {purchaseForm.quantity && purchaseForm.unitPrice && (
                <div className="bg-omega-orange/10 border border-omega-orange/25 rounded-xl p-2.5 mb-2 text-center">
                  <p className="text-omega-text-muted text-[10px]">تكلفة الشراء</p>
                  <p className="gradient-text font-black text-base">
                    {formatCurrency(Number(purchaseForm.quantity) * Number(purchaseForm.unitPrice))}
                  </p>
                </div>
              )}

              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><IoAdd size={16} /> <span>إضافة عملية شراء</span></>}
              </button>
            </form>

            {/* Purchase history */}
            <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <IoCalendar className="text-omega-info" size={16} /> سجل المشتريات
            </h4>
            {loadingPurchases ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16" />)}</div>
            ) : purchases.length === 0 ? (
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-omega-text-muted text-sm">لا توجد مشتريات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {purchases.map(p => (
                  <div key={p.id} className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-emerald-400 font-black text-sm">+{p.quantity}</span>
                        <span className="text-omega-text-dim text-[10px]">{selectedIng.unit}</span>
                        <span className="text-omega-text-dim text-[10px]">×</span>
                        <span className="text-omega-text text-xs">{formatCurrency(p.unitPrice)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-omega-orange font-bold text-xs">{formatCurrency(p.totalCost)}</span>
                        <span className="text-omega-text-dim text-[10px]">• {timeAgo(p.createdAt)}</span>
                      </div>
                      {p.note && <p className="text-omega-text-dim text-[10px] mt-1">📝 {p.note}</p>}
                    </div>
                    <button onClick={() => handleDeletePurchase(p.id)}
                      className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-red hover:bg-omega-red/10 transition-all flex-shrink-0">
                      <IoTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
