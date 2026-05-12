import { useEffect, useMemo, useState } from 'react';
import { addProduct, deleteProduct, getAllProducts, updateProduct, uploadProductImage } from '../services/productService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
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
};

function ProductImage({ product, size = 'large' }) {
  const category = categories[product.category] || categories.burger;
  const classes = size === 'small' ? 'h-16 w-16 rounded-2xl text-3xl' : 'h-32 w-40 rounded-[1.25rem] text-6xl';

  return (
    <div className={`${classes} shrink-0 overflow-hidden border border-white/10 bg-white/[0.04]`}>
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{category.emoji || '🍽️'}</div>
      )}
    </div>
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
    });
    setShowForm(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!form.name.trim() || form.price === '') {
      toast.error('يرجى إدخال اسم المنتج والسعر');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        description: form.description.trim(),
        image: form.image.trim(),
        isAvailable: form.isAvailable,
      };

      if (form.costPrice !== '') payload.costPrice = Number(form.costPrice);

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

    try {
      toast.loading('جاري رفع الصورة...');
      const url = await uploadProductImage(file, editing || 'new');
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

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-white outline-none placeholder:text-omega-text-dim focus:border-omega-orange/50';

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="المنتجات" subtitle="إدارة قائمة طعام OMEGA" />

        <section className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="admin-control flex min-h-16 items-center gap-3 rounded-[1.35rem] px-5">
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
            onClick={openCreate}
            className="admin-control flex min-h-16 items-center justify-center gap-3 rounded-[1.35rem] px-8 text-lg font-black text-omega-orange"
          >
            <IoAddOutline size={29} />
            إضافة منتج
          </button>
        </section>

        <section className="mb-5 grid grid-cols-5 gap-1.5 sm:gap-2">
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

        <section className="admin-glass mb-5 rounded-[1.55rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-omega-text-muted">ترتيب: الأكثر مبيعاً</p>
            <h2 className="text-xl font-black text-white">جميع المنتجات ({formatNumber(filteredProducts.length)})</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 rounded-[1.25rem] skeleton" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-10 text-center text-omega-text-muted">
              لا توجد منتجات مطابقة
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map(product => {
                const categoryInfo = categories[product.category] || categories.burger;
                const isBest = mostSold?.id === product.id && (product.soldCount || 0) > 0;

                return (
                  <article
                    key={product.id}
                    className="rounded-[1.35rem] border border-white/8 bg-white/[0.025] p-4 transition-all"
                  >
                    <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                      <ProductImage product={product} />

                      <div className="text-right">
                        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                          {isBest && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-omega-orange/12 px-3 py-1 text-xs font-black text-omega-orange">
                              <IoFlameOutline />
                              الأكثر مبيعاً
                            </span>
                          )}
                          <h3 className="text-2xl font-black text-white">{product.name}</h3>
                        </div>
                        <p className="mb-4 line-clamp-2 text-sm text-omega-text-muted">{product.description || `${categoryInfo.label} من قائمة OMEGA`}</p>
                        <div className="flex flex-wrap justify-end gap-3">
                          <span className={`rounded-full px-3 py-1 text-sm font-black ${product.isAvailable === false ? 'bg-omega-red/15 text-omega-red' : 'bg-emerald-500/15 text-emerald-400'}`}>
                            {product.isAvailable === false ? 'موقوف' : 'متاح'} ●
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 lg:min-w-48">
                        <p className="text-left text-3xl font-black text-white">{formatCurrency(product.price)}</p>
                        <div className="flex flex-wrap justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAvailability(product)}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black ${product.isAvailable === false ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-omega-red/30 bg-omega-red/8 text-omega-red'}`}
                          >
                            {product.isAvailable === false ? 'تفعيل' : 'إيقاف'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="flex h-11 w-14 items-center justify-center rounded-xl border border-omega-orange/25 bg-white/[0.03] text-omega-orange"
                            aria-label="تعديل"
                          >
                            <IoCreateOutline size={22} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="flex h-11 w-14 items-center justify-center rounded-xl border border-omega-red/25 bg-omega-red/8 text-omega-red"
                            aria-label="حذف"
                          >
                            <IoTrashOutline size={22} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={`admin-glass rounded-[1.55rem] p-5 ${businessStatus.open ? 'border-emerald-500/35' : 'border-omega-red/35'}`}>
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
        className="fixed bottom-[6.8rem] left-6 z-40 flex h-20 w-20 items-center justify-center rounded-full bg-omega-orange text-white shadow-[0_0_35px_rgba(255,107,0,0.55)] transition-transform active:scale-95"
        aria-label="إضافة منتج"
      >
        <IoAdd size={38} />
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

              <div>
                <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">الوصف</label>
                <textarea rows={3} className={`${inputClass} resize-none`} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="وصف مختصر للمنتج" />
              </div>

              <div>
                <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">الصورة</label>
                <input className={inputClass} value={form.image} onChange={event => setForm(current => ({ ...current, image: event.target.value }))} placeholder="https://..." dir="ltr" />
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/14 bg-white/[0.025] p-3 text-sm font-bold text-omega-text-muted">
                  <IoCloudUploadOutline size={20} />
                  رفع صورة من الجهاز
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
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
