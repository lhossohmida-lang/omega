import { useEffect, useMemo, useState } from 'react';
import { addProduct, deleteProduct, getAllProducts, updateProduct, uploadProductImage } from '../services/productService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import { auth } from '../firebase';
import {
  IoAdd,
  IoAddOutline,
  IoClose,
  IoCloudUploadOutline,
  IoCreateOutline,
  IoFlameOutline,
  IoSearch,
  IoTimeOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { getStatusMessage } from '../utils/businessHours';
import toast from 'react-hot-toast';

const categories = {
  all: { label: 'الكل', emoji: '', color: '#ff6b00' },
  pizza: { label: 'بيتزا', emoji: '🍕', color: '#ff6b00' },
  burger: { label: 'برغر', emoji: '🍔', color: '#f59e0b' },
  drinks: { label: 'مشروبات', emoji: '🥤', color: '#3b82f6' },
  desserts: { label: 'حلويات', emoji: '🍰', color: '#ec4899' },
  tacos: { label: 'تاكوس', emoji: '🌮', color: '#22c55e' },
  appetizers: { label: 'مقبلات', emoji: '🍟', color: '#a855f7' },
};

const emptyForm = {
  name: '',
  category: 'burger',
  price: '',
  costPrice: '',
  description: '',
  image: '',
  isAvailable: true,
  hasSizes: false,
  sizes: [], // [{ label: 'XL', price: 200, costPrice: 100 }]
};

const LOCAL_IMAGES = [
  '/burger-classic.png',
  '/pizza-pepperoni.png',
  '/tacos-wrap.png',
  '/drink-cola.png',
  '/fried-chicken.png',
  '/appetizer-gratin.png',
];

function ProductCard({ product, categories, mostSoldId, onEdit, onDelete, onToggle, formatCurrency }) {
  const [expanded, setExpanded] = useState(false);
  const categoryInfo = categories[product.category] || categories.burger;
  const isBest = mostSoldId === product.id && (product.soldCount || 0) > 0;
  const available = product.isAvailable !== false;

  return (
    <article
      className="relative cursor-pointer overflow-hidden rounded-xl"
      style={{ aspectRatio: '3 / 4' }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* ── صورة كاملة ── */}
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.06] text-8xl">
          {categoryInfo.emoji || '🍽️'}
        </div>
      )}

      {/* gradient دائم */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />

      {/* شارة الحالة – أعلى يسار */}
      <div className="absolute left-3 top-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black backdrop-blur-sm ${available ? 'bg-emerald-500/75 text-white' : 'bg-omega-red/75 text-white'}`}>
          {available ? '● متاح' : '⏸ موقوف'}
        </span>
      </div>

      {/* شارة الأكثر مبيعاً – أعلى يمين */}
      {isBest && (
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-omega-orange/85 px-2.5 py-1 text-xs font-black text-white backdrop-blur-sm">
            <IoFlameOutline size={12} />
            الأكثر مبيعاً
          </span>
        </div>
      )}

      {/* ── الوضع الافتراضي: اسم + سعر فقط ── */}
      <div className={`absolute bottom-0 left-0 right-0 p-3.5 transition-all duration-300 ${expanded ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        <p className="text-right text-lg font-black text-white leading-tight">{product.name}</p>
        <p className="text-right text-2xl font-black text-omega-orange mt-0.5">{formatCurrency(product.price)}</p>
      </div>

      {/* ── عند الضغط: لوحة تنزلق للأعلى ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/82 p-3.5 backdrop-blur-md transition-all duration-300 ease-out ${expanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* اسم وسعر */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xl font-black text-omega-orange">{formatCurrency(product.price)}</span>
          <h3 className="text-right text-base font-black text-white leading-tight">{product.name}</h3>
        </div>

        {/* وصف */}
        <p className="mb-3 line-clamp-2 text-right text-xs text-white/65">
          {product.description || `${categoryInfo.label} من قائمة OMEGA`}
        </p>

        {/* أزرار */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(product)}
            className={`flex-1 rounded-xl border py-2 text-sm font-black transition-all ${
              available
                ? 'border-omega-red/35 bg-omega-red/10 text-omega-red'
                : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {available ? 'إيقاف' : 'تفعيل'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omega-orange/30 bg-white/[0.06] text-omega-orange"
            aria-label="تعديل"
          >
            <IoCreateOutline size={19} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omega-red/30 bg-omega-red/10 text-omega-red"
            aria-label="حذف"
          >
            <IoTrashOutline size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setProducts(await getAllProducts());
    } catch (error) {
      console.error(error);
      toast.error('تعذر جلب المنتجات');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(product) {
    setEditing(product.id);
    setForm({
      name: product.name || '',
      category: product.category || 'burger',
      price: product.price ?? '',
      costPrice: product.costPrice ?? '',
      description: product.description || '',
      image: product.image || '',
      isAvailable: product.isAvailable !== false,
      hasSizes: !!(product.sizes?.length),
      sizes: product.sizes || [],
    });
    setShowForm(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    // If hasSizes, price can be empty (price comes from sizes); otherwise require it
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }
    if (!form.hasSizes && form.price === '') {
      toast.error('يرجى إدخال سعر المنتج');
      return;
    }
    if (form.hasSizes && form.sizes.length === 0) {
      toast.error('يرجى إضافة حجم واحد على الأقل');
      return;
    }
    if (form.hasSizes && form.sizes.some(s => !s.label.trim() || s.price === '')) {
      toast.error('يرجى إدخال اسم وسعر لكل حجم');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        image: form.image.trim(),
        isAvailable: form.isAvailable,
      };

      if (form.hasSizes) {
        payload.hasSizes = true;
        payload.sizes = form.sizes.map(s => ({
          label: s.label.trim(),
          price: Number(s.price),
          costPrice: s.costPrice !== '' ? Number(s.costPrice) : 0,
        }));
        // Use the first size price as base price for display
        payload.price = Number(form.sizes[0].price);
      } else {
        payload.hasSizes = false;
        payload.sizes = [];
        payload.price = Number(form.price);
        if (form.costPrice !== '') payload.costPrice = Number(form.costPrice);
      }

      if (editing) {
        await updateProduct(editing, payload);
        toast.success('تم تعديل المنتج');
      } else {
        await addProduct(payload);
        toast.success('تمت إضافة المنتج');
      }

      resetForm();
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حفظ المنتج');
    } finally {
      setSaving(false);
    }
  }

  async function seedImages(overwrite = false) {
    if (!confirm(overwrite ? 'سيتم استبدال جميع الصور بالصور الافتراضية. متأكد؟' : 'سيتم تعيين الصور الافتراضية للمنتجات التي ليس لها صورة. متأكد؟')) return;
    try {
      toast.loading('جاري تعيين الصور...');
      const res = await fetch('/api/admin/seed-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: auth.currentUser?.uid, overwrite }),
      });
      const data = await res.json();
      toast.dismiss();
      if (!res.ok) throw new Error(data.error);
      toast.success(`تم تحديث ${data.updated} منتج`);
      loadProducts();
    } catch (err) {
      toast.dismiss();
      toast.error('تعذر تعيين الصور: ' + err.message);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`هل تريد حذف "${product.name}"؟`)) return;

    try {
      await deleteProduct(product.id);
      toast.success('تم حذف المنتج');
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حذف المنتج');
    }
  }

  async function toggleAvailability(product) {
    try {
      await updateProduct(product.id, { isAvailable: product.isAvailable === false });
      toast.success(product.isAvailable === false ? 'تم تفعيل المنتج' : 'تم إيقاف المنتج');
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث الحالة');
    }
  }



  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    event.target.value = '';

    try {
      toast.loading('جاري رفع الصورة...');
      const url = await uploadProductImage(file, auth.currentUser?.uid);
      setForm(current => ({ ...current, image: url }));
      toast.dismiss();
      toast.success('تم رفع الصورة');
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('تعذر رفع الصورة');
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      if (category !== 'all' && product.category !== category) return false;
      if (!query) return true;
      return product.name?.toLowerCase().includes(query) || product.description?.toLowerCase().includes(query);
    });
  }, [products, search, category]);

  const businessStatus = getStatusMessage();

  const mostSold = useMemo(
    () => [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))[0],
    [products]
  );

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-white outline-none placeholder:text-omega-text-dim focus:border-omega-orange/50';

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="المنتجات" subtitle="إدارة قائمة طعام OMEGA" />

        <section className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="admin-control flex min-h-12 items-center gap-3 px-4">
            <IoSearch className="text-omega-text-dim" size={26} />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث عن منتج..."
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-omega-text-dim"
            />
          </label>

          <button
            type="button"
            onClick={() => seedImages(true)}
            title="استبدال جميع الصور القديمة بالصور المحلية"
            className="admin-control flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-black text-omega-text-muted hover:text-omega-orange"
          >
            🖼 استبدال الصور
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="admin-control flex min-h-12 items-center justify-center gap-2 px-6 text-base font-black text-omega-orange"
          >
            <IoAddOutline size={29} />
            إضافة منتج
          </button>
        </section>

        <section className="mb-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {Object.entries(categories).slice(0, 5).map(([key, item]) => {
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className="admin-control flex min-w-0 items-center justify-center gap-1 rounded-full px-1.5 py-2.5 text-xs font-black transition-all sm:gap-2 sm:px-3 sm:py-3 sm:text-sm"
                style={active ? { borderColor: item.color, color: item.color, boxShadow: `0 0 26px -16px ${item.color}` } : { color: '#e6e6e6' }}
              >
                {item.emoji && <span className="text-base">{item.emoji}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </section>

        <section className="admin-glass mb-4 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-omega-text-muted">ترتيب: الأكثر مبيعاً</p>
            <h2 className="text-xl font-black text-white">جميع المنتجات ({formatNumber(filteredProducts.length)})</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="skeleton rounded-[1.25rem]" style={{ aspectRatio: '3/4' }} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-10 text-center text-omega-text-muted">
              لا توجد منتجات مطابقة
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categories={categories}
                  mostSoldId={mostSold?.id}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={toggleAvailability}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </section>

        <section className={`admin-glass p-4 ${businessStatus.open ? 'border-emerald-500/35' : 'border-omega-red/35'}`}>
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <h2 className={`text-xl font-black ${businessStatus.open ? 'text-emerald-400' : 'text-omega-red'}`}>
                {businessStatus.open ? 'المطعم مفتوح' : 'المطعم مغلق'}
              </h2>
              <p className="mt-1 text-sm text-omega-text-muted">{businessStatus.message}</p>
              <p className="mt-1 text-xs text-omega-text-dim">المنتجات تعتمد على ساعات العمل (11:00 ص — 10:00 م) وليس على كمية مخزّنة</p>
            </div>
            <IoTimeOutline className={businessStatus.open ? 'text-emerald-400' : 'text-omega-red'} size={28} />
          </div>
        </section>
      </main>

      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-[6.8rem] left-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-omega-orange text-white shadow-[0_0_28px_rgba(255,107,0,0.45)] transition-transform active:scale-95"
        aria-label="إضافة منتج"
      >
        <IoAdd size={30} />
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={resetForm} aria-label="إغلاق" />
          <div className="admin-glass relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[1.8rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={resetForm}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-omega-text-muted"
              >
                <IoClose size={22} />
              </button>
              <h3 className="text-2xl font-black text-white">{editing ? 'تعديل المنتج' : 'إضافة منتج'}</h3>
            </div>

            <form onSubmit={handleSave} className="grid gap-4">
              <div>
                <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">اسم المنتج</label>
                <input className={inputClass} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="مثلاً: بيتزا دجاج تندوري" />
              </div>

              <div>
                <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">الفئة</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(categories).filter(([key]) => key !== 'all').map(([key, item]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setForm(current => ({ ...current, category: key }))}
                      className="rounded-2xl border px-3 py-3 text-sm font-black"
                      style={{
                        color: form.category === key ? item.color : '#8e8e93',
                        backgroundColor: form.category === key ? `${item.color}22` : 'rgba(255,255,255,0.03)',
                        borderColor: form.category === key ? `${item.color}66` : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      {item.emoji} {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Toggle Sizes ── */}
              <label className="admin-control flex cursor-pointer items-center justify-between rounded-2xl p-4">
                <div className={`toggle ${form.hasSizes ? 'on' : ''}`} />
                <input
                  type="checkbox"
                  checked={form.hasSizes}
                  onChange={event => setForm(current => ({
                    ...current,
                    hasSizes: event.target.checked,
                    sizes: event.target.checked && current.sizes.length === 0
                      ? [{ label: 'XL', price: '', costPrice: '' }]
                      : current.sizes,
                  }))}
                  className="hidden"
                />
                <span className="font-bold text-white">المنتج له أحجام مختلفة (XL، XXL…)</span>
              </label>

              {form.hasSizes ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setForm(c => ({ ...c, sizes: [...c.sizes, { label: '', price: '', costPrice: '' }] }))}
                      className="flex items-center gap-1.5 rounded-xl border border-omega-orange/40 bg-omega-orange/10 px-3 py-2 text-sm font-black text-omega-orange"
                    >
                      <IoAddOutline size={18} /> إضافة حجم
                    </button>
                    <p className="text-sm font-bold text-omega-text-muted">الأحجام والأسعار</p>
                  </div>
                  <div className="space-y-2.5">
                    {form.sizes.map((sz, idx) => (
                      <div key={idx} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setForm(c => ({ ...c, sizes: c.sizes.filter((_, i) => i !== idx) }))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-omega-red/30 bg-omega-red/10 text-omega-red"
                        >
                          <IoClose size={16} />
                        </button>
                        <input
                          className={inputClass + ' py-2 text-sm'}
                          placeholder="الحجم (XL)"
                          value={sz.label}
                          onChange={e => setForm(c => ({ ...c, sizes: c.sizes.map((s, i) => i === idx ? { ...s, label: e.target.value } : s) }))}
                        />
                        <input
                          type="number"
                          className={inputClass + ' py-2 text-sm'}
                          placeholder="السعر"
                          value={sz.price}
                          onChange={e => setForm(c => ({ ...c, sizes: c.sizes.map((s, i) => i === idx ? { ...s, price: e.target.value } : s) }))}
                        />
                        <span className="text-xs text-omega-text-dim w-8 text-center">دج</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">السعر</label>
                    <input type="number" className={inputClass} value={form.price} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">التكلفة</label>
                    <input type="number" className={inputClass} value={form.costPrice} onChange={event => setForm(current => ({ ...current, costPrice: event.target.value }))} placeholder="0" />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">الوصف</label>
                <textarea rows={3} className={`${inputClass} resize-none`} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="وصف مختصر للمنتج" />
              </div>

              <div>
                <label className="mb-3 block text-right text-sm font-bold text-omega-text-muted">الصورة</label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" dir="ltr">
                  {LOCAL_IMAGES.map(img => (
                    <img
                      key={img}
                      src={img}
                      alt="صورة المنتج"
                      onClick={() => setForm(current => ({ ...current, image: img }))}
                      className={`h-20 w-20 shrink-0 cursor-pointer rounded-2xl bg-white/5 object-cover transition-all ${form.image === img ? 'ring-2 ring-omega-orange opacity-100 scale-105' : 'opacity-50 hover:opacity-100'}`}
                    />
                  ))}
                </div>
                
                {/* Image Upload Option */}
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/14 bg-white/[0.025] p-3 text-sm font-bold text-omega-text-muted transition-colors hover:bg-white/5 hover:text-white">
                  <IoCloudUploadOutline size={20} />
                  أو رفع صورة مخصصة من الجهاز
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                
                {/* Preview Custom URL if uploaded */}
                {form.image && !LOCAL_IMAGES.includes(form.image) && (
                  <div className="mt-2 text-right">
                    <span className="text-xs text-emerald-400">✓ تم اختيار صورة مخصصة</span>
                  </div>
                )}
              </div>

              <label className="admin-control flex cursor-pointer items-center justify-between rounded-2xl p-4">
                <div className={`toggle ${form.isAvailable ? 'on' : ''}`} />
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={event => setForm(current => ({ ...current, isAvailable: event.target.checked }))}
                  className="hidden"
                />
                <span className="font-bold text-white">متوفر للبيع</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 flex min-h-14 items-center justify-center rounded-2xl bg-omega-orange text-lg font-black text-white disabled:opacity-60"
              >
                {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
