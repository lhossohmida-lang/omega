import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { getActiveSpecialOffers } from '../services/offerService';
import { formatCurrency } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import { getTrackedOrderIds } from '../utils/guestStorage';
import CustomerNav from '../components/CustomerNav';
import TransparentImg from '../components/TransparentImg';
import InstallAppButton from '../components/InstallAppButton';
import CategoryIcon from '../components/CategoryIcon';
import TapTransition from '../components/TapTransition';
import {
  IoAdd,
  IoBagHandleOutline,
  IoHeartOutline,
  IoHeart,
  IoSearch,
  IoNotificationsOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoFlameOutline,
  IoTimeOutline,
  IoLockClosedOutline,
  IoPricetagOutline,
  IoClose,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────── */
function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }
function getFav() {
  try { return JSON.parse(localStorage.getItem('tarken_fav') || '[]'); } catch { return []; }
}
function saveFav(f) { localStorage.setItem('tarken_fav', JSON.stringify(f)); }

function fallbackImg(cat) {
  return {
    burger: '/burger-classic.png',
    pizza:  '/pizza-pepperoni.png',
    tacos:  '/tacos-wrap.png',
    drinks: '/drink-cola.png',
    appetizers: '/fried-chicken.png',
    desserts: '/dessert.png',
    sofli: '/sofli.png',
  }[cat] || '/burger-classic.png';
}

function offerImage(offer) {
  return offer.image || offer.items?.find(item => item.image)?.image || '/burger-classic.png';
}

function offerItemsLabel(items = []) {
  if (!items.length) return 'عرض خاص من OMEGA';
  return items.map(item => `${item.quantity || 1} ${item.productName || item.name}`).join(' + ');
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

/* ─── data ─────────────────────────────────── */
const CATS = [
  { id: 'all',        label: 'الكل',       emoji: '🍔' },
  { id: 'pizza',      label: 'بيتزا',      emoji: '🍕' },
  { id: 'tacos',      label: 'تاكوس',      emoji: '🌮' },
  { id: 'drinks',     label: 'مشروبات',    emoji: '🥤' },
  { id: 'appetizers', label: 'مقبلات',     emoji: '🍟' },
  { id: 'desserts',   label: 'حلويات',     emoji: '🍰' },
  { id: 'sofli',      label: 'سوفلي',      emoji: '🥟', iconUrl: '/sofli-icon.png' },
];

/* ─── sub-components ───────────────────────── */
function HorizCard({ product, fav, onFav, onAdd, onOpen }) {
  return (
    <article className="ch-hcard">
      <button type="button" className="ch-hcard-fav" onClick={onFav} aria-label="مفضلة">
        {fav ? <IoHeart className="ch-fav-on" size={18}/> : <IoHeartOutline size={18}/>}
      </button>
      <button type="button" className="ch-hcard-img-wrap" onClick={onOpen}>
        <TransparentImg
          src={product.image || fallbackImg(product.category)}
          alt={product.name}
          className="ch-hcard-img"
        />
      </button>
      <button type="button" className="ch-hcard-body" onClick={onOpen}>
        <h3 className="ch-hcard-name">{product.name}</h3>
        <p className="ch-hcard-desc">{product.description || 'وجبة OMEGA طازجة وجاهزة للطلب'}</p>
      </button>
      <div className="ch-hcard-footer">
        <strong className="ch-price">{formatCurrency(product.price)}</strong>
        <button type="button" className="ch-add-btn" onClick={onAdd} aria-label="إضافة">
          <IoAdd size={20}/>
        </button>
      </div>
    </article>
  );
}

function GridCard({ product, fav, onFav, onAdd, onOpen }) {
  return (
    <article className="ch-gcard">
      <button type="button" className="ch-gcard-fav" onClick={onFav} aria-label="مفضلة">
        {fav ? <IoHeart className="ch-fav-on" size={16}/> : <IoHeartOutline size={16}/>}
      </button>
      <button type="button" onClick={onOpen} className="ch-gcard-inner">
        <div className="ch-gcard-img-wrap">
          <TransparentImg
            src={product.image || fallbackImg(product.category)}
            alt={product.name}
            className="ch-gcard-img"
          />
        </div>
        <div className="ch-gcard-info">
          <h3 className="ch-gcard-name">{product.name}</h3>
          <p className="ch-gcard-desc">{product.description || 'وجبة OMEGA طازجة'}</p>
          <div className="ch-gcard-footer">
            <strong className="ch-price">{formatCurrency(product.price)}</strong>
            <button type="button" className="ch-add-btn-sm" onClick={(e) => { e.stopPropagation(); onAdd(); }} aria-label="إضافة">
              <IoAdd size={18}/>
            </button>
          </div>
        </div>
      </button>
    </article>
  );
}

/* ─── SizePickerModal ──────────────────────── */
function SizePickerModal({ product, onClose, onAdd }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-[1.8rem] border-t border-white/10 bg-[#121212] px-5 pb-10 pt-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <IoClose size={18} />
          </button>
          <p className="font-black text-white text-lg">{product.name}</p>
        </div>
        <p className="mb-3 text-right text-sm text-omega-text-muted">اختر الحجم</p>
        <div className="grid gap-2.5">
          {product.sizes.map(sz => (
            <button
              key={sz.label}
              type="button"
              onClick={() => onAdd(product, sz)}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-right transition-all hover:border-omega-orange/50 hover:bg-omega-orange/8 active:scale-[0.98]"
            >
              <span className="font-black text-omega-orange text-lg">{formatCurrency(sz.price)}</span>
              <span className="font-black text-white text-base">{sz.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionRow({ title, icon, onSeeAll, children }) {
  return (
    <section className="ch-section">
      <div className="ch-section-head">
        <button type="button" className="ch-see-all" onClick={onSeeAll}>
          <IoChevronBackOutline size={14}/>
          عرض الكل
        </button>
        <h2 className="ch-section-title">
          {icon && <span>{icon}</span>}
          {title}
        </h2>
      </div>
      <div className="ch-hscroll">
        {children}
      </div>
    </section>
  );
}

function SpecialOfferCard({ offer, onOpen, onAdd }) {
  const { original, discountValue, discountPercent } = offerDiscount(offer);
  return (
    <article className="ch-offer-card">
      <button type="button" className="ch-offer-media" onClick={onOpen}>
        <img src={offerImage(offer)} alt={offer.title} className="ch-offer-img" />
        <span className="ch-offer-badge">
          <IoPricetagOutline size={13} />
          {offer.isFeatured ? 'عرض مميز' : 'خصم خاص'}
        </span>
        {discountPercent > 0 && (
          <span className="ch-offer-save-badge">-{formatCurrency(discountValue)}</span>
        )}
      </button>
      <button type="button" className="ch-offer-body" onClick={onOpen}>
        <h3>{offer.title}</h3>
        <p>{offer.description || offerItemsLabel(offer.items)}</p>
        <div className="ch-offer-items">{offerItemsLabel(offer.items)}</div>
      </button>
      <div className="ch-offer-footer">
        <div className="ch-offer-price">
          {original > 0 ? <span>{formatCurrency(original)}</span> : null}
          <strong>{formatCurrency(offer.offerPrice)}</strong>
        </div>
        <button type="button" className="ch-offer-add" onClick={onAdd}>
          <IoAdd size={18} />
          اطلب الآن
        </button>
      </div>
    </article>
  );
}

/* ── Carousel: big full-width offers, swipeable ── */
function OffersCarousel({ offers, onOpen, onAdd }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);

  const prev = () => setIdx(i => (i - 1 + offers.length) % offers.length);
  const next = () => setIdx(i => (i + 1) % offers.length);

  /* auto-advance every 4 s */
  useEffect(() => {
    if (offers.length < 2) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [offers.length]);

  /* touch drag */
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (startX.current === null) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    startX.current = null;
  };

  if (!offers.length) return null;
  const offer = offers[idx];
  const { original, discountValue, discountPercent } = offerDiscount(offer);

  return (
    <section className="ch-section" style={{ marginTop: '0.5rem' }}>
      <div
        className="ch-bigcard-wrap ch-offer-carousel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ cursor: 'pointer' }}
      >
        {/* decorative leaves */}
        <span className="ch-bigcard-leaf ch-leaf-1" aria-hidden="true"/>
        <span className="ch-bigcard-leaf ch-leaf-2" aria-hidden="true"/>
        <span className="ch-bigcard-leaf ch-leaf-3" aria-hidden="true"/>
        <span className="ch-bigcard-leaf ch-leaf-4" aria-hidden="true"/>

        {/* discount badge */}
        {discountPercent > 0 && (
          <span className="ch-offer-carousel-badge">
            <IoPricetagOutline size={13} />
            خصم {discountPercent}%
          </span>
        )}

        {/* save badge */}
        {discountValue > 0 && (
          <span className="ch-offer-carousel-save">
            وفر {formatCurrency(discountValue)}
          </span>
        )}

        {/* full-bleed food image */}
        <button
          type="button"
          className="ch-bigcard-img-btn"
          onClick={() => onOpen(offer)}
          aria-label={offer.title}
        >
          <TransparentImg
            key={offer.id}
            src={offerImage(offer)}
            alt={offer.title}
            className="ch-bigcard-img"
            draggable={false}
            fallback={
              <div className="ch-bigcard-img-placeholder" />
            }
          />
        </button>

        {/* info overlay at bottom */}
        <div className="ch-offer-carousel-info">
          <div className="ch-offer-carousel-text">
            <h3>{offer.title}</h3>
            <p>{offer.description || offerItemsLabel(offer.items)}</p>
          </div>
          <div className="ch-offer-carousel-price-row">
            <div className="ch-offer-carousel-prices">
              {original > 0 && <span>{formatCurrency(original)}</span>}
              <strong>{formatCurrency(offer.offerPrice)}</strong>
            </div>
            <button
              type="button"
              className="ch-offer-carousel-add"
              onClick={(e) => { e.stopPropagation(); onAdd(offer); }}
            >
              <IoAdd size={16} />
              اطلب
            </button>
          </div>
        </div>

        {/* dots */}
        {offers.length > 1 && (
          <div className="ch-bigcard-dots">
            {offers.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`ch-bigcard-dot${i === idx ? ' active' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`عرض ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── main page ────────────────────────────── */
export default function CustomerHome() {
  const [products, setProducts]     = useState([]);
  const [offers, setOffers]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(null);
  const [activeCat, setActiveCat]   = useState('all');
  const [search, setSearch]         = useState('');
  const [favorites, setFavorites]   = useState(getFav);
  const [cart, setCart]             = useState(getCart);
  const [ordersCount, setOrdersCount] = useState(0);
  const [heroIdx, setHeroIdx]       = useState(0);
  const [sizePicker, setSizePicker] = useState(null); // product to pick size for
  const [tapTarget, setTapTarget]   = useState(null);
  const navigate                    = useNavigate();
  const businessStatus              = getStatusMessage();
  const searchRef                   = useRef(null);

  /* load products */
  useEffect(() => {
    getAllProducts()
      .then(d => {
        setProducts(d.filter(p => p.isAvailable !== false));
        setLoadError(null);
      })
      .catch(err => {
        console.error('getAllProducts failed:', err);
        const code = err?.code || '';
        if (code === 'permission-denied' || /permission/i.test(err?.message || '')) {
          setLoadError({ kind: 'permissions', message: 'لا توجد صلاحيات لقراءة المنتجات من قاعدة البيانات.' });
        } else {
          setLoadError({ kind: 'generic', message: err?.message || 'تعذّر تحميل المنتجات' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* load active special offers */
  useEffect(() => {
    getActiveSpecialOffers()
      .then(setOffers)
      .catch(err => {
        console.warn('getActiveSpecialOffers failed:', err);
      });
  }, []);

  /* عدد الطلبات المتتبَّعة محلياً */
  useEffect(() => {
    setOrdersCount(getTrackedOrderIds().length);
  }, []);

  /* filtered */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      return !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    });
  }, [products, activeCat, search]);

  /* hero products (top 3) */
  const heroProducts = products.slice(0, 3);

  /* section groups */
  const byCategory = (cat) => products.filter(p => p.category === cat).slice(0, 8);

  /* cart helpers */
  const updateCart = (next) => { setCart(next); saveCart(next); };
  const handleAdd = (product) => {
    if (!businessStatus.open) { toast.error(businessStatus.message); return; }
    // If product has sizes, show size picker modal
    if (product.hasSizes && product.sizes?.length > 0) {
      setSizePicker(product);
      return;
    }
    const next = [...cart];
    const i    = next.findIndex(it => it.productId === product.id);
    if (i >= 0) next[i].quantity += 1;
    else next.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      costPrice: product.costPrice || 0,
      image: product.image || '',
      quantity: 1,
    });
    updateCart(next);
    toast.success(`تمت إضافة ${product.name} ✓`);
  };
  const handleAddWithSize = (product, sz) => {
    setSizePicker(null);
    const cartId = `${product.id}__${sz.label}`;
    const itemName = `${product.name} (${sz.label})`;
    const next = [...cart];
    const i = next.findIndex(it => it.productId === cartId);
    if (i >= 0) next[i].quantity += 1;
    else next.push({
      productId: cartId,
      name: itemName,
      price: sz.price,
      costPrice: sz.costPrice || 0,
      image: product.image || '',
      quantity: 1,
    });
    updateCart(next);
    toast.success(`تمت إضافة ${itemName} ✓`);
  };
  const handleAddOffer = (offer) => {
    if (!businessStatus.open) { toast.error(businessStatus.message); return; }
    const cartId = `offer_${offer.id}`;
    const unitCost = (offer.items || []).reduce(
      (sum, item) => sum + (Number(item.costPrice || 0) * Number(item.quantity || 1)),
      0
    );
    const components = (offer.items || []).map(item => ({
      productId: item.productId,
      name: item.productName || item.name,
      productName: item.productName || item.name,
      quantity: Number(item.quantity || 1),
      price: Number(item.unitPrice ?? item.price ?? 0),
      unitPrice: Number(item.unitPrice ?? item.price ?? 0),
      costPrice: Number(item.costPrice || 0),
      image: item.image || '',
      category: item.category || '',
    }));

    const next = [...cart];
    const i = next.findIndex(item => item.productId === cartId);
    if (i >= 0) next[i].quantity += 1;
    else next.push({
      productId: cartId,
      type: 'offer',
      offerId: offer.id,
      name: offer.title,
      price: Number(offer.offerPrice || 0),
      oldPrice: offerOriginalPrice(offer) || null,
      costPrice: unitCost,
      image: offerImage(offer),
      quantity: 1,
      components,
      description: offer.description || offerItemsLabel(offer.items),
    });
    updateCart(next);
    toast.success(`تمت إضافة ${offer.title} ✓`);
  };
  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); saveFav(next);
  };
  const openWithTapTransition = (path) => {
    if (tapTarget) return;
    setTapTarget({ type: 'path', value: path });
  };
  const changeCategoryWithTapTransition = (categoryId) => {
    if (tapTarget || categoryId === activeCat) return;
    setTapTarget({ type: 'category', value: categoryId });
  };

  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);

  /* auto hero rotate */
  useEffect(() => {
    if (heroProducts.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroProducts.length), 4000);
    return () => clearInterval(t);
  }, [heroProducts.length]);

  const heroProduct = heroProducts[heroIdx];

  /* section data */
  const sections = CATS.filter(c => c.id !== 'all').map(cat => ({
    ...cat,
    items: byCategory(cat.id),
  })).filter(s => s.items.length > 0);

  return (
    <div className="ch-shell">
      {/* ── HEADER ── */}
      <header className="ch-header">
        <button type="button" className="ch-notif-btn" onClick={() => openWithTapTransition('/my-orders')} aria-label="الإشعارات">
          <IoNotificationsOutline size={24}/>
          {ordersCount > 0 && <span className="ch-notif-dot">{ordersCount > 9 ? '9+' : ordersCount}</span>}
        </button>
        <div className="ch-header-logo">
          <img src="./logo.png?v=2" alt="OMEGA" className="ch-header-logo-img"/>
        </div>
        <button type="button" className="ch-cart-btn" onClick={() => openWithTapTransition('/cart')} aria-label="السلة">
          <IoBagHandleOutline size={24}/>
          {cartCount > 0 && <span className="ch-cart-badge">{cartCount}</span>}
        </button>
      </header>

      {/* ── CLOSED BANNER ── */}
      {!businessStatus.open && (
        <div className="ch-closed-banner">
          <IoTimeOutline size={20}/>
          <div>
            <strong>المطعم مغلق حالياً</strong>
            <span>{businessStatus.message}</span>
          </div>
        </div>
      )}

      {/* ── LOAD ERROR BANNER ── */}
      {loadError && !loading && (
        <div className="ch-closed-banner" style={{ borderColor: 'rgba(229,57,53,0.4)' }}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <div>
            <strong>تعذّر تحميل القائمة</strong>
            <span>
              {loadError.kind === 'permissions'
                ? 'يجب نشر firestore.rules أو تفعيل المصادقة المجهولة (Anonymous Authentication) من Firebase Console.'
                : loadError.message}
            </span>
          </div>
        </div>
      )}

      {/* ── STAFF LOGIN ── */}
      <div className="ch-search-row" style={{ paddingBottom: 0 }}>
        <div className="ch-top-actions">
          <InstallAppButton target="customer" className="ch-install-btn" compact />
          <button
            type="button"
            onClick={() => openWithTapTransition('/login')}
            className="ch-staff-login-btn"
            aria-label="دخول طاقم العمل"
          >
            <IoLockClosedOutline size={16} />
            <span>دخول طاقم العمل</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="ch-search-row">
        <label className="ch-search-box" htmlFor="ch-search-input">
          <IoSearch size={20} className="ch-search-icon"/>
          <input
            id="ch-search-input"
            ref={searchRef}
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن وجبتك المفضلة..."
          />
        </label>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div className="ch-cats-wrap">
        <div className="ch-cats">
          {CATS.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`ch-cat-btn${activeCat === cat.id ? ' active' : ''}`}
              onClick={() => changeCategoryWithTapTransition(cat.id)}
            >
              <CategoryIcon
                iconUrl={cat.iconUrl}
                emoji={cat.emoji}
                className="ch-cat-emoji"
                style={cat.iconUrl ? { width: '1.6em', height: '1.6em', objectFit: 'contain' } : undefined}
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading ? (
        <div className="ch-skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ch-skeleton-card"/>
          ))}
        </div>
      ) : (

        <>
          {/* ── SEARCH RESULTS ── */}
          {search.trim() ? (
            <section className="ch-section">
              <div className="ch-section-head">
                <span/>
                <h2 className="ch-section-title">نتائج البحث</h2>
              </div>
              {filtered.length === 0 ? (
                <div className="ch-empty">
                  <span>🔍</span>
                  <strong>لا توجد نتائج</strong>
                  <p>جرّب كلمة بحث مختلفة</p>
                </div>
              ) : (
                <div className="ch-grid">
                  {filtered.map(p => (
                    <GridCard
                      key={p.id}
                      product={p}
                      fav={favorites.includes(p.id)}
                      onFav={() => toggleFav(p.id)}
                      onAdd={() => handleAdd(p)}
                      onOpen={() => openWithTapTransition(`/product/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : activeCat !== 'all' ? (
            /* ── FILTERED BY CATEGORY ── */
            <section className="ch-section">
              <div className="ch-section-head">
                <button type="button" className="ch-see-all" onClick={() => changeCategoryWithTapTransition('all')}>
                  <IoChevronBackOutline size={14}/>
                  الرجوع
                </button>
                <h2 className="ch-section-title">
                  {(() => {
                    const c = CATS.find(c => c.id === activeCat);
                    if (!c) return null;
                    return (
                      <>
                        <CategoryIcon
                          iconUrl={c.iconUrl}
                          emoji={c.emoji}
                          style={c.iconUrl ? { width: '1.2em', height: '1.2em', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '0.25em' } : undefined}
                        />
                        {' '}{c.label}
                      </>
                    );
                  })()}
                </h2>
              </div>
              {filtered.length === 0 ? (
                <div className="ch-empty">
                  <span>🍽️</span>
                  <strong>لا توجد منتجات</strong>
                  <p>لا تتوفر منتجات في هذه الفئة حالياً</p>
                </div>
              ) : (
                <div className="ch-grid">
                  {filtered.map(p => (
                    <GridCard
                      key={p.id}
                      product={p}
                      fav={favorites.includes(p.id)}
                      onFav={() => toggleFav(p.id)}
                      onAdd={() => handleAdd(p)}
                      onOpen={() => openWithTapTransition(`/product/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* ── HOME FEED ── */
            <>
              {/* HERO BANNER */}
              {heroProduct && (
                <div className="ch-hero">
                  <div className="ch-hero-content">
                    <span className="ch-hero-badge">
                      <IoFlameOutline size={14}/>
                      الأكثر طلباً
                    </span>
                    <h2 className="ch-hero-name">{heroProduct.name}</h2>
                    <p className="ch-hero-sub">{heroProduct.description || 'برغر، بطاطس، مشروب بطابع OMEGA'}</p>
                    <strong className="ch-hero-price">{formatCurrency(heroProduct.price)}</strong>
                    <button
                      type="button"
                      className="ch-hero-btn"
                      onClick={() => handleAdd(heroProduct)}
                    >
                      <IoAdd size={18}/>
                      أضف
                    </button>
                  </div>
                  <div className="ch-hero-img-wrap">
                    <TransparentImg
                      src={heroProduct.image || fallbackImg(heroProduct.category)}
                      alt={heroProduct.name}
                      className="ch-hero-img"
                    />
                  </div>
                  {/* dots */}
                  {heroProducts.length > 1 && (
                    <div className="ch-hero-dots">
                      {heroProducts.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`ch-hero-dot${i === heroIdx ? ' active' : ''}`}
                          onClick={() => setHeroIdx(i)}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SPECIAL OFFERS – full-width swipeable carousel */}
              {offers.length > 0 && (
                <OffersCarousel
                  offers={offers}
                  onOpen={(offer) => openWithTapTransition(`/offer/${offer.id}`)}
                  onAdd={handleAddOffer}
                />
              )}

              {/* FEATURES STRIP */}
              <div className="ch-features" style={{ marginTop: '1.25rem' }}>
                <div className="ch-feature">
                  <span className="ch-feature-icon">🛵</span>
                  <div>
                    <strong>توصيل سريع</strong>
                    <p>حتى باب المنزل</p>
                  </div>
                </div>
                <div className="ch-feature-divider"/>
                <div className="ch-feature">
                  <span className="ch-feature-icon">⭐</span>
                  <div>
                    <strong>جودة مضمونة</strong>
                    <p>مكونات طازجة</p>
                  </div>
                </div>
                <div className="ch-feature-divider"/>
                <div className="ch-feature">
                  <span className="ch-feature-icon">🎧</span>
                  <div>
                    <strong>دعم 24/7</strong>
                    <p>نحن هنا لخدمتك</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <CustomerNav cartCount={cartCount} onNavigate={openWithTapTransition}/>

      {/* Size Picker Modal */}
      {sizePicker && (
        <SizePickerModal
          product={sizePicker}
          onClose={() => setSizePicker(null)}
          onAdd={handleAddWithSize}
        />
      )}
      <TapTransition
        active={!!tapTarget}
        onDone={() => {
          const nextTarget = tapTarget;
          setTapTarget(null);
          if (!nextTarget) return;
          if (nextTarget.type === 'category') {
            setActiveCat(nextTarget.value);
            return;
          }
          navigate(nextTarget.value);
        }}
      />
    </div>
  );
}
