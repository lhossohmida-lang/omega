import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { getAllProducts } from '../services/productService';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import CustomerNav from '../components/CustomerNav';
import TransparentImg from '../components/TransparentImg';
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
  IoStarOutline,
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
  }[cat] || '/burger-classic.png';
}

/* ─── data ─────────────────────────────────── */
const CATS = [
  { id: 'all',        label: 'الكل',       emoji: '🍔' },
  { id: 'pizza',      label: 'بيتزا',      emoji: '🍕' },
  { id: 'tacos',      label: 'تاكوس',      emoji: '🌮' },
  { id: 'drinks',     label: 'مشروبات',    emoji: '🥤' },
  { id: 'appetizers', label: 'مقبلات',     emoji: '🍟' },
  { id: 'desserts',   label: 'حلويات',     emoji: '🍰' },
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

/* ── Carousel: big full-width image, swipeable ── */
function CarouselSection({ title, icon, onSeeAll, products, favorites, onFav, onAdd, onOpen }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);

  const prev = () => setIdx(i => (i - 1 + products.length) % products.length);
  const next = () => setIdx(i => (i + 1) % products.length);

  /* auto-advance every 4 s */
  useEffect(() => {
    if (products.length < 2) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [products.length]);

  /* touch / mouse drag */
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (startX.current === null) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    startX.current = null;
  };

  if (!products.length) return null;
  const p = products[idx];

  return (
    <section className="ch-section" style={{ marginTop: '0.5rem' }}>
      {/* big image card – image only, no info */}
      <div
        className="ch-bigcard-wrap"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* decorative plant leaves – pure CSS */}
        <span className="ch-bigcard-leaf ch-leaf-1" aria-hidden="true"/>
        <span className="ch-bigcard-leaf ch-leaf-2" aria-hidden="true"/>
        <span className="ch-bigcard-leaf ch-leaf-3" aria-hidden="true"/>
        <span className="ch-bigcard-leaf ch-leaf-4" aria-hidden="true"/>

        {/* favourite */}
        <button
          type="button"
          className="ch-bigcard-fav"
          onClick={() => onFav(p.id)}
          aria-label="مفضلة"
        >
          {favorites.includes(p.id)
            ? <IoHeart className="ch-fav-on" size={20}/>
            : <IoHeartOutline size={20}/>}
        </button>

        {/* full-bleed food image */}
        <button
          type="button"
          className="ch-bigcard-img-btn"
          onClick={() => onOpen(p.id)}
          aria-label={p.name}
        >
          <TransparentImg
            key={p.id}
            src={p.image || fallbackImg(p.category)}
            alt={p.name}
            className="ch-bigcard-img"
            draggable={false}
          />
        </button>

        {/* dots only */}
        {products.length > 1 && (
          <div className="ch-bigcard-dots">
            {products.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`ch-bigcard-dot${i === idx ? ' active' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`منتج ${i + 1}`}
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
  const [loading, setLoading]       = useState(true);
  const [activeCat, setActiveCat]   = useState('all');
  const [search, setSearch]         = useState('');
  const [favorites, setFavorites]   = useState(getFav);
  const [cart, setCart]             = useState(getCart);
  const [ordersCount, setOrdersCount] = useState(0);
  const [heroIdx, setHeroIdx]       = useState(0);
  const { userData }                = useAuth();
  const navigate                    = useNavigate();
  const businessStatus              = getStatusMessage();
  const searchRef                   = useRef(null);

  /* load products */
  useEffect(() => {
    getAllProducts()
      .then(d => setProducts(d.filter(p => p.isAvailable !== false)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* orders count */
  useEffect(() => {
    if (!userData?.uid) return;
    getCountFromServer(query(collection(db, 'orders'), where('customerId', '==', userData.uid)))
      .then(s => setOrdersCount(s.data().count))
      .catch(() => {});
  }, [userData?.uid]);

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
  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); saveFav(next);
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
        <button type="button" className="ch-notif-btn" onClick={() => navigate('/my-orders')} aria-label="الإشعارات">
          <IoNotificationsOutline size={24}/>
          {ordersCount > 0 && <span className="ch-notif-dot">{ordersCount > 9 ? '9+' : ordersCount}</span>}
        </button>
        <div className="ch-header-logo">
          <img src="/logo.png" alt="OMEGA" className="ch-header-logo-img"/>
        </div>
        <button type="button" className="ch-cart-btn" onClick={() => navigate('/cart')} aria-label="السلة">
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
              onClick={() => setActiveCat(cat.id)}
            >
              <span className="ch-cat-emoji">{cat.emoji}</span>
              <span>{cat.label}</span>
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
                      onOpen={() => navigate(`/product/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : activeCat !== 'all' ? (
            /* ── FILTERED BY CATEGORY ── */
            <section className="ch-section">
              <div className="ch-section-head">
                <button type="button" className="ch-see-all" onClick={() => setActiveCat('all')}>
                  <IoChevronBackOutline size={14}/>
                  الرجوع
                </button>
                <h2 className="ch-section-title">
                  {CATS.find(c => c.id === activeCat)?.emoji} {CATS.find(c => c.id === activeCat)?.label}
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
                      onOpen={() => navigate(`/product/${p.id}`)}
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

              {/* MOST ORDERED – full-width carousel */}
              {products.length > 0 && (
                <CarouselSection
                  title="الأكثر طلباً"
                  icon="🔥"
                  onSeeAll={() => {}}
                  products={products.slice(0, 8)}
                  favorites={favorites}
                  onFav={toggleFav}
                  onAdd={handleAdd}
                  onOpen={(id) => navigate(`/product/${id}`)}
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

      <CustomerNav cartCount={cartCount}/>
    </div>
  );
}
