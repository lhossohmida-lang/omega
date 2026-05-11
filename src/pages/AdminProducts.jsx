import { useEffect, useMemo, useState } from 'react';
import { addProduct, deleteProduct, getAllProducts, updateProduct, uploadProductImage } from '../services/productService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
  IoAdd,
  IoAddOutline,
  IoAlertCircleOutline,
  IoChevronBack,
  IoClose,
  IoCloudUploadOutline,
  IoCubeOutline,
  IoCreateOutline,
  IoFlameOutline,
  IoSearch,
  IoTrashOutline,
} from 'react-icons/io5';
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
  stock: '',
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
      stock: product.stock ?? '',
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
      if (form.stock !== '') payload.stock = Number(form.stock);

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

  async function handleStockUpdate(product) {
    const value = prompt(`تحديث مخزون ${product.name}`, product.stock ?? 0);
    if (value === null) return;
    const stock = Number(value);
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error('أدخل رقماً صحيحاً للمخزون');
      return;
    }

    try {
      await updateProduct(product.id, { stock, isAvailable: stock > 0 });
      toast.success('تم تحديث المخزون');
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث المخزون');
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

  const lowStock = useMemo(
    () => products.filter(product => (product.stock ?? 999) <= 5).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
    [products]
  );

  const mostSold = useMemo(
    () => [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))[0],
    [products]
  );

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-white outline-none placeholder:text-omega-text-dim focus:border-omega-orange/50';

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="والمخزون" accent="المنتجات" subtitle="إدارة منتجات مطعم OMEGA" />

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

        <section className="mb-5 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {Object.entries(categories).slice(0, 5).map(([key, item]) => {
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className="admin-control flex min-w-[8.8rem] items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-black transition-all"
                style={active ? { borderColor: item.color, color: item.color, boxShadow: `0 0 26px -16px ${item.color}` } : { color: '#e6e6e6' }}
              >
                {item.emoji && <span>{item.emoji}</span>}
                {item.label}
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
                const stock = product.stock ?? 0;
                const isLow = stock <= 5;
                const isBest = mostSold?.id === product.id && (product.soldCount || 0) > 0;

                return (
                  <article
                    key={product.id}
                    className={`rounded-[1.35rem] border bg-white/[0.025] p-4 transition-all ${isLow ? 'border-omega-orange/55 shadow-[0_0_30px_-24px_rgba(255,107,0,0.95)]' : 'border-white/8'}`}
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
                            {product.isAvailable === false ? 'غير متوفر' : 'متوفر'} ●
                          </span>
                          <span className="text-lg text-omega-text-muted">
                            المخزون: <b className={isLow ? 'text-omega-orange' : 'text-white'}>{formatNumber(stock)}</b>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 lg:min-w-48">
                        <p className="text-left text-3xl font-black text-white">{formatCurrency(product.price)}</p>
                        <div className="flex flex-wrap justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => handleStockUpdate(product)}
                            className="flex items-center gap-2 rounded-xl border border-omega-orange/30 bg-omega-orange/8 px-4 py-2 text-sm font-black text-omega-orange"
                          >
                            <IoCubeOutline />
                            تحديث المخزون
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

        <section className="admin-glass rounded-[1.55rem] border-omega-orange/40 p-5">
          <div className="mb-4 flex items-center justify-end gap-2">
            <h2 className="text-xl font-black text-omega-orange">تنبيهات المخزون المنخفض</h2>
            <IoAlertCircleOutline className="text-omega-orange" size={25} />
          </div>

          {lowStock.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-400">
              لا توجد تنبيهات حالياً
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {lowStock.slice(0, 3).map(product => (
                  <div key={product.id} className="admin-control flex items-center justify-between rounded-2xl p-3">
                    <ProductImage product={product} size="small" />
                    <div className="text-right">
                      <p className="font-black text-white">{product.name}</p>
                      <p className="text-sm text-omega-text-muted">المخزون: <b className="text-omega-red">{product.stock ?? 0}</b></p>
                      <p className="text-xs text-omega-text-muted">الحد الأدنى: 10</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm font-black text-omega-orange">
                <IoChevronBack />
                عرض جميع التنبيهات
              </button>
            </>
          )}
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

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">السعر</label>
                  <input type="number" className={inputClass} value={form.price} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">التكلفة</label>
                  <input type="number" className={inputClass} value={form.costPrice} onChange={event => setForm(current => ({ ...current, costPrice: event.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">المخزون</label>
                  <input type="number" className={inputClass} value={form.stock} onChange={event => setForm(current => ({ ...current, stock: event.target.value }))} placeholder="0" />
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
