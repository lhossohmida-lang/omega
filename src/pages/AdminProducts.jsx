import { useState, useEffect } from 'react';
import { getAllProducts, addProduct, updateProduct, deleteProduct, uploadProductImage } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import AdminNav from '../components/AdminNav';
import {
  IoAdd, IoCreate, IoTrash, IoClose, IoCloudUpload,
  IoSearch, IoAlert, IoChevronDown, IoChevronUp,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const CATEGORIES = {
  burger:     { label: 'برغر',    emoji: '🍔', color: '#f59e0b' },
  pizza:      { label: 'بيتزا',   emoji: '🍕', color: '#ff6b00' },
  tacos:      { label: 'تاكوس',   emoji: '🌮', color: '#22c55e' },
  drinks:     { label: 'مشروبات', emoji: '🥤', color: '#3b82f6' },
  appetizers: { label: 'مقبلات',  emoji: '🥗', color: '#a855f7' },
  desserts:   { label: 'حلويات',  emoji: '🍰', color: '#ec4899' },
};

const EMPTY_FORM = { name: '', category: 'burger', price: '', description: '', image: '', isAvailable: true };

export default function AdminProducts() {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [catFilter, setCatFilter]     = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try { setProducts(await getAllProducts()); }
    catch { toast.error('تعذّر جلب المنتجات'); }
    setLoading(false);
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(false); };

  const openEdit = p => {
    setForm({ name: p.name, category: p.category, price: p.price, description: p.description || '', image: p.image || '', isAvailable: p.isAvailable });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.name || !form.price) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSaving(true);
    try {
      const data = { name: form.name, category: form.category, price: Number(form.price), description: form.description, image: form.image, isAvailable: form.isAvailable };
      if (editing) { await updateProduct(editing, data); toast.success('تم تعديل المنتج'); }
      else          { await addProduct(data);             toast.success('تم إضافة المنتج'); }
      resetForm();
      loadProducts();
    } catch (err) { toast.error(err?.message || 'حدث خطأ'); }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    try { await deleteProduct(id); toast.success('تم الحذف'); loadProducts(); }
    catch { toast.error('خطأ في الحذف'); }
  };

  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast.loading('جاري رفع الصورة...');
      const url = await uploadProductImage(file, editing || 'new');
      setForm(f => ({ ...f, image: url }));
      toast.dismiss(); toast.success('تم رفع الصورة');
    } catch { toast.dismiss(); toast.error('خطأ في رفع الصورة'); }
  };

  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lowStock = products.filter(p => (p.stock ?? 999) <= 5);

  const inputCls = "w-full text-sm rounded-2xl border px-4 py-3.5 text-white placeholder-omega-text-dim outline-none";
  const inputStyle = { backgroundColor: '#1f2026', borderColor: 'rgba(255,255,255,0.07)' };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#0a0a0a' }}>
      <AdminNav />

      <div className="px-4 pt-28 pb-4">
        <h1 className="text-white font-black text-3xl tracking-tight mb-0.5">المنتجات والمخزون</h1>
        <p className="text-omega-text-muted text-sm mb-5">إدارة منتجات مطعم OMEGA</p>

        {/* Search */}
        <div className="relative mb-4">
          <IoSearch className="absolute top-1/2 -translate-y-1/2 text-omega-text-dim" size={17} style={{ right: '14px' }} />
          <input
            type="text"
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={inputCls + ' pr-11 pl-4'}
            style={{ backgroundColor: '#15161a', borderColor: 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
          <button
            onClick={() => setCatFilter('all')}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border"
            style={catFilter === 'all'
              ? { backgroundColor: 'rgba(255,107,0,0.15)', color: '#ff6b00', borderColor: 'rgba(255,107,0,0.3)' }
              : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#5a5a60', borderColor: 'rgba(255,255,255,0.07)' }
            }
          >
            الكل
          </button>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setCatFilter(k)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all border"
              style={catFilter === k
                ? { backgroundColor: v.color + '20', color: v.color, borderColor: v.color + '40' }
                : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#5a5a60', borderColor: 'rgba(255,255,255,0.07)' }
              }
            >
              <span>{v.emoji}</span>{v.label}
            </button>
          ))}
        </div>

        {/* List header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-omega-text-muted text-xs">({filtered.length}) منتج</p>
          <p className="text-white font-bold text-sm">جميع المنتجات</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl skeleton" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 rounded-3xl text-center" style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-omega-text-muted text-sm">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const cat = CATEGORIES[p.category] || CATEGORIES.burger;
              const stockLow = (p.stock ?? 999) <= 5;
              return (
                <div
                  key={p.id}
                  className="flex gap-0 rounded-3xl overflow-hidden"
                  style={{ backgroundColor: '#15161a', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {/* Category color bar */}
                  <div className="w-1 flex-shrink-0" style={{ backgroundColor: cat.color }} />

                  {/* Info */}
                  <div className="flex items-center gap-3 p-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm mb-0.5 truncate">{p.name}</p>
                      {p.description && (
                        <p className="text-omega-text-dim text-[11px] mb-1.5 line-clamp-1">{p.description}</p>
                      )}
                      <p className="text-omega-orange font-black text-base mb-1">{formatCurrency(p.price)}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-omega-text-muted text-[10px]">
                          المخزون:&nbsp;
                          <span className={stockLow ? 'text-omega-red font-bold' : 'text-omega-text'}>
                            {p.stock ?? '—'}
                          </span>
                        </span>
                        {!p.isAvailable && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(229,57,53,0.15)', color: '#e53935' }}>
                            غير متوفر
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product image */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: '#1f2026' }}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">{cat.emoji}</div>
                      )}
                      {!p.isAvailable && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-omega-red text-[8px] font-bold">غير متوفر</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col justify-center gap-2 px-3 border-r border-white/5">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ backgroundColor: 'rgba(255,181,71,0.12)' }}
                    >
                      <IoCreate size={15} style={{ color: '#ffb547' }} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ backgroundColor: 'rgba(229,57,53,0.1)' }}
                    >
                      <IoTrash size={15} style={{ color: '#e53935' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div className="mt-5 rounded-3xl overflow-hidden" style={{ backgroundColor: '#15161a', border: '1px solid rgba(245,158,11,0.2)' }}>
            <button
              onClick={() => setShowLowStock(v => !v)}
              className="flex items-center justify-between w-full px-4 py-4"
            >
              <div className="flex items-center gap-1.5">
                {showLowStock ? <IoChevronUp size={16} className="text-omega-warning" /> : <IoChevronDown size={16} className="text-omega-warning" />}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                  {lowStock.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-omega-warning text-sm font-bold">تنبيهات المخزون المنخفض</p>
                <IoAlert size={16} className="text-omega-warning" />
              </div>
            </button>
            {showLowStock && (
              <div className="px-4 pb-4 space-y-2">
                {lowStock.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 border-t border-white/5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: p.stock === 0 ? 'rgba(229,57,53,0.15)' : 'rgba(245,158,11,0.12)', color: p.stock === 0 ? '#e53935' : '#f59e0b' }}
                    >
                      {p.stock ?? 0} متبقي
                    </span>
                    <p className="text-white text-sm font-bold">{p.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { resetForm(); setShowForm(true); }}
        className="fixed left-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-white text-sm shadow-lg shadow-omega-orange/30 active:scale-95 transition-transform"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(135deg, #ff6b00, #e55f00)' }}
      >
        <IoAdd size={20} />
        <span>إضافة منتج</span>
      </button>

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={resetForm} />
          <div
            className="relative w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar p-6 rounded-t-3xl animate-slide-up"
            style={{ backgroundColor: '#15161a', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={resetForm}
                className="w-9 h-9 rounded-full flex items-center justify-center text-omega-text-muted"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <IoClose size={20} />
              </button>
              <h3 className="text-white font-black text-lg">{editing ? 'تعديل المنتج' : 'منتج جديد'}</h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-omega-text-muted text-xs block mb-2">اسم المنتج *</label>
                <input type="text" placeholder="مثلاً: برجر كلاسيكي" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Category */}
              <div>
                <label className="text-omega-text-muted text-xs block mb-2">الفئة</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setForm(f => ({ ...f, category: k }))}
                      className="py-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all"
                      style={form.category === k
                        ? { backgroundColor: v.color + '20', borderColor: v.color + '40', color: 'white' }
                        : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: '#5a5a60' }
                      }
                    >
                      <span className="text-xl">{v.emoji}</span>
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-omega-text-muted text-xs block mb-2">السعر *</label>
                <input type="number" placeholder="0" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Description */}
              <div>
                <label className="text-omega-text-muted text-xs block mb-2">الوصف</label>
                <textarea placeholder="وصف مختصر..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className={inputCls + ' resize-none'} style={inputStyle} />
              </div>

              {/* Image */}
              <div>
                <label className="text-omega-text-muted text-xs block mb-2">الصورة</label>
                <div className="space-y-2">
                  <input type="url" placeholder="https://..." value={form.image} dir="ltr"
                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed text-omega-text-muted text-sm cursor-pointer transition-all hover:border-omega-orange/40 hover:text-omega-orange"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <IoCloudUpload size={18} /><span>أو ارفع صورة</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {form.image && (
                    <div className="flex items-center gap-2">
                      <img src={form.image} alt="preview" className="w-14 h-14 rounded-2xl object-cover" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))} className="text-omega-red text-xs">إزالة</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className={`toggle ${form.isAvailable ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))} />
                <span className="text-white text-sm font-medium">متوفر للبيع</span>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ff6b00, #e55f00)' }}
              >
                {saving
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span>{editing ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
