import { useEffect, useMemo, useState } from 'react';
import {
  addSpecialOffer,
  deleteSpecialOffer,
  getAllSpecialOffers,
  patchSpecialOffer,
  updateSpecialOffer,
  uploadOfferImage,
} from '../services/offerService';
import { getAllProducts } from '../services/productService';
import { auth } from '../firebase';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
  IoAdd,
  IoAddCircleOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoCheckmarkCircleOutline,
  IoClose,
  IoCloudUploadOutline,
  IoCreateOutline,
  IoEyeOutline,
  IoPricetagOutline,
  IoRemoveCircleOutline,
  IoSearch,
  IoSparklesOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const emptyForm = {
  title: '',
  description: '',
  image: '',
  oldPrice: '',
  offerPrice: '',
  items: [],
  isActive: true,
  isFeatured: false,
  priority: 1,
};

const LOCAL_IMAGES = [
  '/burger-classic.png',
  '/pizza-pepperoni.png',
  '/tacos-wrap.png',
  '/drink-cola.png',
  '/fried-chicken.png',
  '/appetizer-gratin.png',
];

function itemsLabel(items = []) {
  if (!items.length) return 'لا توجد مكونات';
  return items.map(item => `${formatNumber(item.quantity || 1)} ${item.productName || item.name}`).join(' + ');
}

function itemQty(items, productId) {
  return items.find(item => item.productId === productId)?.quantity || 0;
}

function offerOriginalPrice(offer) {
  return Number(offer.originalTotalPrice || offer.oldPrice || 0);
}

function offerDiscount(offer) {
  const original = offerOriginalPrice(offer);
  const discountValue = Math.max(0, Number(offer.discountValue ?? (original - (offer.offerPrice || 0))));
  const discountPercent = Number(offer.discountPercent ?? (original > 0 ? Math.round((discountValue / original) * 100) : 0));
  return { original, discountValue, discountPercent };
}

function OfferCard({ offer, onEdit, onDelete, onToggle, onMove }) {
  const active = offer.isActive !== false;
  const { original, discountValue, discountPercent } = offerDiscount(offer);

  return (
    <article className="admin-glass overflow-hidden p-3.5">
      <div className="grid gap-3 sm:grid-cols-[9.5rem_1fr]">
        <div className="relative min-h-36 overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-red-50">
          {offer.image ? (
            <img src={offer.image} alt={offer.title} className="h-full min-h-36 w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-36 place-items-center text-5xl">🏷️</div>
          )}
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-omega-orange px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
            <IoSparklesOutline size={12} />
            {offer.isFeatured ? 'عرض مميز' : 'عرض خاص'}
          </span>
          {discountPercent > 0 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-omega-red px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
              خصم {formatNumber(discountPercent)}%
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMove(offer, -1)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-omega-orange"
                title="رفع الأولوية"
              >
                <IoArrowUpOutline size={17} />
              </button>
              <button
                type="button"
                onClick={() => onMove(offer, 1)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-omega-text-muted"
                title="خفض الأولوية"
              >
                <IoArrowDownOutline size={17} />
              </button>
              <span className="rounded-xl border border-omega-orange/25 bg-omega-orange/10 px-3 py-2 text-xs font-black text-omega-orange">
                أولوية {formatNumber(offer.priority || 1)}
              </span>
            </div>

            <div className="min-w-0 text-right">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                  active
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : 'border-omega-red/30 bg-omega-red/10 text-omega-red'
                }`}>
                  {active ? 'مفعل' : 'غير مفعل'}
                </span>
                <h2 className="truncate text-xl font-black text-white">{offer.title}</h2>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-omega-text-muted">
                {offer.description || itemsLabel(offer.items)}
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-right text-sm font-bold text-omega-text-muted">
            {itemsLabel(offer.items)}
          </p>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-black text-omega-red">{formatCurrency(offer.offerPrice)}</strong>
              {original > 0 ? (
                <span className="text-sm font-black text-omega-text-dim line-through">{formatCurrency(original)}</span>
              ) : null}
              {discountValue > 0 ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-500">
                  وفر {formatCurrency(discountValue)}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggle(offer)}
                className={`grid h-11 w-11 place-items-center rounded-xl border transition-all ${
                  active
                    ? 'border-omega-red/30 bg-omega-red/10 text-omega-red'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                }`}
                aria-label={active ? 'إيقاف العرض' : 'تفعيل العرض'}
              >
                <IoEyeOutline size={20} />
              </button>
              <button
                type="button"
                onClick={() => onEdit(offer)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-omega-orange/35 bg-omega-orange/10 text-omega-orange"
                aria-label="تعديل العرض"
              >
                <IoCreateOutline size={20} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(offer)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-omega-red/30 bg-omega-red/10 text-omega-red"
                aria-label="حذف العرض"
              >
                <IoTrashOutline size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminSpecialOffers() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [offersData, productsData] = await Promise.all([
        getAllSpecialOffers(),
        getAllProducts(),
      ]);
      setOffers(offersData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحميل العروض الخاصة');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, priority: offers.length + 1 });
    setProductSearch('');
    setShowForm(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, priority: offers.length + 1 });
    setProductSearch('');
    setShowForm(true);
  }

  function openEdit(offer) {
    setEditing(offer.id);
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      image: offer.image || '',
      oldPrice: offer.oldPrice ?? '',
      offerPrice: offer.offerPrice ?? '',
      items: (offer.items || []).map(item => ({
        productId: item.productId,
        quantity: item.quantity || 1,
        productName: item.productName || item.name || '',
        name: item.productName || item.name || '',
        unitPrice: item.unitPrice ?? item.price ?? 0,
        price: item.unitPrice ?? item.price ?? 0,
        costPrice: item.costPrice || 0,
        image: item.image || '',
        category: item.category || '',
      })),
      isActive: offer.isActive !== false,
      isFeatured: offer.isFeatured === true,
      priority: offer.priority || 1,
    });
    setProductSearch('');
    setShowForm(true);
  }

  function setProductQty(product, quantity) {
    const qty = Math.max(0, Number(quantity) || 0);
    setForm(current => {
      const without = current.items.filter(item => item.productId !== product.id);
      if (qty <= 0) return { ...current, items: without };
      return {
        ...current,
        items: [
          ...without,
          {
            productId: product.id,
            quantity: qty,
            productName: product.name,
            name: product.name,
            unitPrice: product.price || 0,
            price: product.price || 0,
            costPrice: product.costPrice || 0,
            image: product.image || '',
            category: product.category || '',
          },
        ],
      };
    });
  }

  function buildPayload() {
    const items = form.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return item;
      return {
        productId: product.id,
        productName: product.name,
        name: product.name,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(product.price || 0),
        price: Number(product.price || 0),
        costPrice: Number(product.costPrice || 0),
        image: product.image || '',
        category: product.category || '',
      };
    });

    return {
      title: form.title,
      description: form.description,
      image: form.image || items.find(item => item.image)?.image || '',
      oldPrice: form.oldPrice,
      originalTotalPrice: pricingPreview.displayOriginal,
      offerPrice: form.offerPrice,
      discountValue: pricingPreview.discountValue,
      discountPercent: pricingPreview.discountPercent,
      items,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      priority: form.priority,
    };
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error('يرجى إدخال اسم العرض');
      return;
    }
    if (form.offerPrice === '' || Number(form.offerPrice) <= 0) {
      toast.error('يرجى إدخال سعر العرض');
      return;
    }
    if (form.items.length === 0) {
      toast.error('اختر منتجاً واحداً على الأقل داخل العرض');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await updateSpecialOffer(editing, payload);
        toast.success('تم تعديل العرض');
      } else {
        await addSpecialOffer(payload);
        toast.success('تم إنشاء العرض');
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حفظ العرض');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    try {
      toast.loading('جاري رفع صورة العرض...');
      const url = await uploadOfferImage(file, auth.currentUser?.uid);
      setForm(current => ({ ...current, image: url }));
      toast.dismiss();
      toast.success('تم رفع الصورة');
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('تعذر رفع الصورة');
    }
  }

  async function handleDelete(offer) {
    if (!confirm(`هل تريد حذف عرض "${offer.title}"؟`)) return;
    try {
      await deleteSpecialOffer(offer.id);
      toast.success('تم حذف العرض');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حذف العرض');
    }
  }

  async function handleToggle(offer) {
    try {
      await patchSpecialOffer(offer.id, { isActive: offer.isActive === false });
      toast.success(offer.isActive === false ? 'تم تفعيل العرض' : 'تم إيقاف العرض');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث حالة العرض');
    }
  }

  async function handleMove(offer, delta) {
    try {
      await patchSpecialOffer(offer.id, { priority: Math.max(1, Number(offer.priority || 1) + delta) });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث الأولوية');
    }
  }

  const stats = useMemo(() => {
    const active = offers.filter(offer => offer.isActive !== false).length;
    return {
      total: offers.length,
      active,
      inactive: offers.length - active,
      featured: offers.filter(offer => offer.isFeatured === true).length,
      products: offers.reduce((sum, offer) => sum + (offer.items || []).length, 0),
    };
  }, [offers]);

  const filteredProducts = useMemo(() => {
    const value = productSearch.trim().toLowerCase();
    return products
      .filter(product => product.isAvailable !== false)
      .filter(product => !value || product.name?.toLowerCase().includes(value));
  }, [products, productSearch]);

  const selectedItems = useMemo(
    () => form.items
      .map(item => {
        const product = products.find(p => p.id === item.productId);
        return product ? { ...item, name: product.name, image: product.image || item.image } : item;
      })
      .filter(item => item.productId),
    [form.items, products]
  );

  const pricingPreview = useMemo(() => {
    const originalTotal = selectedItems.reduce((sum, item) => {
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      return sum + (unitPrice * (Number(item.quantity) || 1));
    }, 0);
    const displayOriginal = form.oldPrice !== '' ? Number(form.oldPrice) || 0 : originalTotal;
    const offerPrice = Number(form.offerPrice) || 0;
    const discountValue = Math.max(0, displayOriginal - offerPrice);
    const discountPercent = displayOriginal > 0 ? Math.round((discountValue / displayOriginal) * 100) : 0;
    return { originalTotal, displayOriginal, offerPrice, discountValue, discountPercent };
  }, [selectedItems, form.oldPrice, form.offerPrice]);

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right text-white outline-none placeholder:text-omega-text-dim focus:border-omega-orange/50';

  return (
    <div className="admin-page">
      <AdminNav />

      <main className="admin-container">
        <AdminHeader title="العروض الخاصة" subtitle="إنشاء عروض مركّبة وربطها بالسلة والمخزون" accent="🏷️" />

        <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'إجمالي العروض', value: stats.total, icon: IoPricetagOutline, tone: 'text-omega-orange' },
            { label: 'العروض المفعلة', value: stats.active, icon: IoCheckmarkCircleOutline, tone: 'text-emerald-500' },
            { label: 'غير المفعلة', value: stats.inactive, icon: IoEyeOutline, tone: 'text-omega-red' },
            { label: 'العروض المميزة', value: stats.featured, icon: IoSparklesOutline, tone: 'text-amber-500' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="admin-glass p-4 text-right">
              <div className="mb-3 flex items-center justify-between">
                <Icon className={tone} size={24} />
                <span className="text-sm font-bold text-omega-text-muted">{label}</span>
              </div>
              <strong className="text-3xl font-black text-white">{formatNumber(value)}</strong>
            </article>
          ))}
        </section>

        <section className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="admin-control flex min-h-12 items-center justify-end gap-3 px-4 text-right text-sm font-bold text-omega-text-muted">
            <span>العروض ذات الأولوية الأقل تظهر أولاً في واجهة الزبائن.</span>
            <IoArrowUpOutline className="text-omega-orange" size={20} />
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red px-6 text-base font-black text-white shadow-lg shadow-omega-orange/25"
          >
            <IoAdd size={22} />
            عرض جديد
          </button>
        </section>

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <section className="admin-glass p-10 text-center">
            <IoPricetagOutline className="mx-auto mb-3 text-omega-orange" size={48} />
            <h2 className="text-xl font-black text-white">لا توجد عروض خاصة بعد</h2>
            <p className="mt-2 text-sm text-omega-text-muted">ابدأ بعرض برغر أو بيتزا ليظهر في الصفحة الرئيسية.</p>
            <button type="button" onClick={openCreate} className="btn-primary mt-5">
              إنشاء أول عرض
            </button>
          </section>
        ) : (
          <section className="grid gap-3">
            {offers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onMove={handleMove}
              />
            ))}
          </section>
        )}
      </main>

      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-[6.8rem] left-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-omega-orange text-white shadow-[0_0_28px_rgba(255,107,0,0.45)] transition-transform active:scale-95"
        aria-label="إضافة عرض"
      >
        <IoAdd size={30} />
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={resetForm} aria-label="إغلاق" />
          <div className="admin-glass relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[1.8rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={resetForm}
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-omega-text-muted"
              >
                <IoClose size={22} />
              </button>
              <h3 className="text-2xl font-black text-white">{editing ? 'تعديل العرض' : 'إنشاء عرض خاص'}</h3>
            </div>

            <form onSubmit={handleSave} className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <section className="grid gap-4">
                <div className="overflow-hidden rounded-xl border border-omega-orange/20 bg-gradient-to-br from-orange-50 to-red-50">
                  {form.image || selectedItems[0]?.image ? (
                    <img src={form.image || selectedItems[0]?.image} alt="صورة العرض" className="h-56 w-full object-cover" />
                  ) : (
                    <div className="grid h-56 place-items-center text-6xl">🏷️</div>
                  )}
                </div>

                <div>
                  <label className="mb-3 block text-right text-sm font-bold text-omega-text-muted">الصورة</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" dir="ltr">
                    {LOCAL_IMAGES.map(img => (
                      <img
                        key={img}
                        src={img}
                        alt="صورة عرض"
                        onClick={() => setForm(current => ({ ...current, image: img }))}
                        className={`h-20 w-20 shrink-0 cursor-pointer rounded-xl bg-white/5 object-cover transition-all ${form.image === img ? 'ring-2 ring-omega-orange opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                  <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/14 bg-white/[0.025] p-3 text-sm font-bold text-omega-text-muted transition-colors hover:bg-white/5 hover:text-white">
                    <IoCloudUploadOutline size={20} />
                    رفع صورة خاصة بالعرض
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">السعر الأصلي اليدوي (اختياري)</label>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.oldPrice}
                      onChange={event => setForm(current => ({ ...current, oldPrice: event.target.value }))}
                      placeholder={`تلقائي: ${formatCurrency(pricingPreview.originalTotal)}`}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">سعر العرض</label>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.offerPrice}
                      onChange={event => setForm(current => ({ ...current, offerPrice: event.target.value }))}
                      placeholder="مثلاً 1200"
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-right">
                    <p className="text-[11px] font-bold text-omega-text-muted">المجموع الأصلي</p>
                    <strong className="mt-1 block text-base font-black text-white">{formatCurrency(pricingPreview.displayOriginal)}</strong>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-right">
                    <p className="text-[11px] font-bold text-emerald-500">قيمة الخصم</p>
                    <strong className="mt-1 block text-base font-black text-emerald-500">{formatCurrency(pricingPreview.discountValue)}</strong>
                  </div>
                  <div className="rounded-xl border border-omega-red/20 bg-omega-red/10 p-3 text-right">
                    <p className="text-[11px] font-bold text-omega-red">نسبة الخصم</p>
                    <strong className="mt-1 block text-base font-black text-omega-red">{formatNumber(pricingPreview.discountPercent)}%</strong>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="admin-control flex cursor-pointer items-center justify-between rounded-xl p-4">
                    <div className={`toggle ${form.isActive ? 'on' : ''}`} />
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}
                      className="hidden"
                    />
                    <span className="font-bold text-white">العرض مفعل</span>
                  </label>

                  <label className="admin-control flex cursor-pointer items-center justify-between rounded-xl p-4">
                    <div className={`toggle ${form.isFeatured ? 'on' : ''}`} />
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={event => setForm(current => ({ ...current, isFeatured: event.target.checked }))}
                      className="hidden"
                    />
                    <span className="font-bold text-white">مميز بالرئيسية</span>
                  </label>

                  <div>
                    <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">الأولوية</label>
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.priority}
                      onChange={event => setForm(current => ({ ...current, priority: event.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4">
                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">اسم العرض</label>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                    placeholder="مثلاً: عرض البرغر العائلي"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-right text-sm font-bold text-omega-text-muted">وصف قصير</label>
                  <textarea
                    rows={3}
                    className={`${inputClass} resize-none`}
                    value={form.description}
                    onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                    placeholder="مثلاً: 2 برغر + بطاطا + 2 مشروبات"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-omega-orange/10 px-3 py-1 text-xs font-black text-omega-orange">
                      {formatNumber(selectedItems.length)} منتج
                    </span>
                    <h4 className="text-lg font-black text-white">مكونات العرض</h4>
                  </div>

                  {selectedItems.length > 0 ? (
                    <div className="mb-3 flex flex-wrap justify-end gap-2">
                      {selectedItems.map(item => (
                        <span key={item.productId} className="inline-flex items-center gap-2 rounded-full border border-omega-orange/25 bg-omega-orange/10 px-3 py-1.5 text-xs font-black text-omega-orange">
                          x{formatNumber(item.quantity)} {item.productName || item.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-3 rounded-xl bg-white/[0.03] p-3 text-center text-sm text-omega-text-muted">
                      اختر المنتجات وحدد كمية كل منتج داخل العرض.
                    </p>
                  )}

                  <label className="mb-3 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3">
                    <IoSearch className="text-omega-text-dim" size={18} />
                    <input
                      value={productSearch}
                      onChange={event => setProductSearch(event.target.value)}
                      placeholder="ابحث في الأطعمة..."
                      className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-white outline-none placeholder:text-omega-text-dim"
                    />
                  </label>

                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {filteredProducts.map(product => {
                      const qty = itemQty(form.items, product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 ${
                            qty > 0
                              ? 'border-omega-orange/35 bg-omega-orange/[0.06]'
                              : 'border-white/8 bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setProductQty(product, qty - 1)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-omega-red"
                            >
                              <IoRemoveCircleOutline size={18} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              onChange={event => setProductQty(product, event.target.value)}
                              className="h-8 w-12 rounded-lg border border-white/10 bg-white/[0.04] text-center text-sm font-black text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setProductQty(product, qty + 1)}
                              className="grid h-8 w-8 place-items-center rounded-lg bg-omega-orange text-white"
                            >
                              <IoAddCircleOutline size={18} />
                            </button>
                          </div>

                          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                            <div className="min-w-0 text-right">
                              <p className="truncate text-sm font-black text-white">{product.name}</p>
                              <p className="text-xs font-bold text-omega-orange">{formatCurrency(product.price)}</p>
                            </div>
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                            ) : (
                              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04]">🍽️</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-14 items-center justify-center rounded-xl bg-gradient-to-l from-omega-orange to-omega-red text-lg font-black text-white shadow-lg shadow-omega-orange/25 disabled:opacity-60"
                >
                  {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إنشاء العرض'}
                </button>
              </section>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
