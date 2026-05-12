import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import CustomerNav from '../components/CustomerNav';
import {
  IoSearch, IoAdd, IoMenu, IoClose,
  IoHeart, IoHeartOutline, IoCheckmark, IoTimeOutline,
} from 'react-icons/io5';
import { formatCurrency } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import toast from 'react-hot-toast';

/* helpers */
function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; }
}
function saveCart(c) { localStorage.setItem('omega_cart', JSON.stringify(c)); }
function getFav() {
  try { return JSON.parse(localStorage.getItem('tarken_fav') || '[]'); } catch { return []; }
}
function saveFav(f) { localStorage.setItem('tarken_fav', JSON.stringify(f)); }

const CATS = [
  { id: 'all',        label: 'الكل',    emoji: '⊞' },
  { id: 'burger',     label: 'برغر',    emoji: '🍔' },
  { id: 'pizza',      label: 'بيتزا',   emoji: '🍕' },
  { id: 'tacos',      label: 'تاكوس',   emoji: '🌮' },
  { id: 'drinks',     label: 'مشروبات', emoji: '🥤' },
  { id: 'desserts',   label: 'حلويات',  emoji: '🍰' },
  { id: 'appetizers', label: 'مقبلات',  emoji: '🍟' },
];

export default function CustomerHome() {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeCat,    setActiveCat]    = useState('all');
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [cartExpanded, setCartExpanded] = useState({});
  const [favorites,    setFavorites]    = useState(getFav);
  const [showFavOnly,  setShowFavOnly]  = useState(false);
  const [ordersCount,  setOrdersCount]  = useState(0);
  const [currentIdx,   setCurrentIdx]   = useState(0);

  const carouselRef   = useRef(null);
  const { userData }  = useAuth();
  const navigate      = useNavigate();
  const businessStatus = getStatusMessage();

  /* load products */
  useEffect(() => {
    getAllProducts()
      .then(d => setProducts(d.filter(p => p.isAvailable !== false)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* load orders count */
  useEffect(() => {
    if (!userData?.uid) return;
    getCountFromServer(
      query(collection(db, 'orders'), where('customerId', '==', userData.uid))
    ).then(s => setOrdersCount(s.data().count)).catch(() => {});
  }, [userData?.uid]);

  /* reset carousel when filter changes */
  useEffect(() => {
    setCurrentIdx(0);
    if (carouselRef.current) carouselRef.current.scrollLeft = 0;
  }, [activeCat, showFavOnly, searchQuery]);

  const toggleFav = id => {
    const next = favorites.includes(id)
      ? favorites.filter(x => x !== id)
      : [...favorites, id];
    setFavorites(next); saveFav(next);
  };

  const filtered = products.filter(p => {
    if (showFavOnly && !favorites.includes(p.id)) return false;
    if (activeCat !== 'all' && p.category !== activeCat) return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
  });

  /* cart actions */
  const addToCart = product => {
    if (!businessStatus.open) { toast.error(businessStatus.message); return; }
    const cart = getCart();
    const ex = cart.find(i => i.productId === product.id);
    if (ex) ex.quantity += 1;
    else cart.push({
      productId: product.id, name: product.name, price: product.price,
      costPrice: product.costPrice || 0, image: product.image || '', quantity: 1,
    });
    saveCart(cart);
    toast.success(`تمت إضافة ${product.name}`, { duration: 1200 });
  };

  const handleAdd = p => {
    addToCart(p);
    setCartExpanded(prev => ({ ...prev, [p.id]: true }));
  };

  /* scroll → update dot & current product */
  const onCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el  = carouselRef.current;
    setCurrentIdx(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const currentProduct = filtered[currentIdx] ?? null;
  const isExpanded     = currentProduct ? !!cartExpanded[currentProduct.id] : false;

  /* ─── UI ─── */
  return (
    /* full-height flex column – carousel takes the rest */
    <div className="flex h-screen flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 120% 50% at 75% 0%, #1e0c00 0%, #0a0a0a 55%)' }}>

      {/* ambient glows */}
      <div className="pointer-events-none fixed right-0 top-0 h-80 w-80 rounded-full bg-omega-orange/20 blur-[130px]" />
      <div className="pointer-events-none fixed -left-20 bottom-1/3 h-72 w-72 rounded-full bg-omega-red/10 blur-[120px]" />

      {/* ══════ HEADER ══════ */}
      <header className="z-30 shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between" dir="ltr">

          {/* hamburger – left */}
          <button
            onClick={() => setMenuOpen(true)}
            className="liquid-glass flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform active:scale-90"
          >
            <IoMenu size={22} />
          </button>

          {/* logo – centre */}
          <img src="/logo.png" alt="OMEGA"
            className="h-14 w-14 rounded-full object-cover shadow-lg shadow-omega-orange/30" />

          {/* search – right */}
          <button
            onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }}
            className={`liquid-glass flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-90 ${searchOpen ? 'text-omega-orange' : 'text-white'}`}
          >
            {searchOpen ? <IoClose size={22} /> : <IoSearch size={22} />}
          </button>
        </div>

        {/* expandable search bar */}
        {searchOpen && (
          <div className="mt-3 animate-slide-up">
            <input autoFocus type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن وجبتك..."
              className="liquid-glass w-full rounded-2xl px-5 py-3.5 text-right text-sm text-white placeholder-white/40 outline-none"
            />
          </div>
        )}

        {/* closed banner */}
        {!businessStatus.open && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-omega-red/30 bg-omega-red/10 px-4 py-2.5">
            <span className="text-xs font-bold text-omega-red">11:00 ص — 10:00 م</span>
            <div className="flex items-center gap-1.5 text-xs font-black text-omega-red">
              <IoTimeOutline size={14} />
              {businessStatus.message}
            </div>
          </div>
        )}
      </header>

      {/* ══════ SUMMARY CARDS ══════ */}
      <div className="shrink-0 px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/my-orders')}
            className="liquid-glass flex flex-col items-start rounded-3xl p-4 transition-transform active:scale-95">
            <span className="mb-1.5 text-2xl">📦</span>
            <p className="text-[11px] font-bold text-white/50">طلباتي</p>
            <p className="text-xl font-black text-white">{ordersCount} طلب</p>
          </button>

          <button onClick={() => setShowFavOnly(v => !v)}
            className={`liquid-glass flex flex-col items-start rounded-3xl p-4 transition-all active:scale-95 ${showFavOnly ? 'ring-1 ring-omega-red/60' : ''}`}>
            <span className="mb-1.5 text-2xl">❤️</span>
            <p className="text-[11px] font-bold text-white/50">المفضلة</p>
            <p className="text-xl font-black text-white">{favorites.length} وجبة</p>
          </button>
        </div>
      </div>

      {/* ══════ CAROUSEL – takes ALL remaining height ══════ */}
      <div className="relative min-h-0 flex-1">

        {loading ? (
          <div className="skeleton h-full w-full" />
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="text-7xl">🍽️</div>
            <p className="font-bold text-white">لا توجد منتجات</p>
            <p className="text-sm text-white/50">{showFavOnly ? 'لا توجد وجبات في المفضلة' : 'جرّب فئة أخرى'}</p>
          </div>
        ) : (
          <>
            {/* ── Food images (fill the whole area) ── */}
            <div
              ref={carouselRef}
              onScroll={onCarouselScroll}
              className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            >
              {filtered.map(product => {
                const catEmoji = CATS.find(c => c.id === product.category)?.emoji ?? '🍽️';
                return (
                  <div key={product.id}
                    className="relative h-full w-full shrink-0 snap-start cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}>
                    {product.image
                      ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                      : <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-[120px]">{catEmoji}</div>
                    }
                    {/* subtle vignette for readability */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
                  </div>
                );
              })}
            </div>

            {/* ── Category pills + fav – floating TOP of image ── */}
            <div className="absolute left-0 right-0 top-3 z-10 flex items-center gap-2 px-4">
              {/* scrollable pill row */}
              <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {CATS.map(cat => {
                  const active = activeCat === cat.id && !showFavOnly;
                  return (
                    <button key={cat.id}
                      onClick={e => { e.stopPropagation(); setActiveCat(cat.id); setShowFavOnly(false); }}
                      className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        active
                          ? 'bg-omega-orange text-white shadow-lg shadow-omega-orange/40'
                          : 'liquid-glass text-white/80'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* fav toggle */}
              <button
                onClick={e => { e.stopPropagation(); currentProduct && toggleFav(currentProduct.id); }}
                className="liquid-glass shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
              >
                {currentProduct && favorites.includes(currentProduct.id)
                  ? <IoHeart className="text-omega-red" size={17} />
                  : <IoHeartOutline className="text-white" size={17} />}
              </button>
            </div>

            {/* ── Dot indicators + Product card – floating BOTTOM of image ── */}
            <div className="absolute bottom-[88px] left-4 right-4 z-10">

              {/* dots */}
              {filtered.length > 1 && filtered.length <= 14 && (
                <div className="mb-2.5 flex justify-center gap-1.5">
                  {filtered.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all duration-300 ${
                      i === currentIdx ? 'h-2 w-6 bg-omega-orange' : 'h-2 w-2 bg-white/35'
                    }`} />
                  ))}
                </div>
              )}

              {/* product card */}
              {currentProduct && (
                <div className="liquid-glass rounded-3xl px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    {/* name + price */}
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black text-white">{currentProduct.name}</h4>
                      <p className="mt-0.5 text-xl font-black text-omega-orange">{formatCurrency(currentProduct.price)}</p>
                    </div>

                    {/* add controls */}
                    {isExpanded ? (
                      <div className="flex shrink-0 items-center gap-2" dir="ltr">
                        <button
                          onClick={e => { e.stopPropagation(); addToCart(currentProduct); }}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-omega-orange text-white shadow-lg shadow-omega-orange/40 active:scale-90"
                        >
                          <IoAdd size={22} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setCartExpanded(p => ({ ...p, [currentProduct.id]: false })); }}
                          className="liquid-glass flex h-11 items-center gap-1.5 rounded-2xl border border-emerald-500/40 px-3.5 text-sm font-black text-emerald-400"
                        >
                          <IoCheckmark size={16} />
                          تم
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); handleAdd(currentProduct); }}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-omega-orange text-white shadow-lg shadow-omega-orange/40 transition-transform active:scale-90"
                      >
                        <IoAdd size={26} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════ HAMBURGER DRAWER ══════ */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div
            className="liquid-glass animate-menu-in fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col gap-3 p-5"
            style={{ borderRadius: '0 1.75rem 1.75rem 0' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => setMenuOpen(false)}
                className="liquid-glass flex h-10 w-10 items-center justify-center rounded-2xl text-white/60">
                <IoClose size={20} />
              </button>
              <img src="/logo.png" alt="OMEGA" className="h-10 w-10 rounded-full object-cover" />
            </div>

            <div className="liquid-glass rounded-2xl px-4 py-3">
              <p className="font-black text-white">{userData?.name || 'زائر'}</p>
              <p className="mt-0.5 text-xs text-white/50">{userData?.phone || ''}</p>
            </div>

            {[
              { label: 'الرئيسية',     icon: '🏠', path: '/' },
              { label: 'طلباتي',       icon: '📦', path: '/my-orders' },
              { label: 'السلة',        icon: '🛒', path: '/cart' },
              { label: 'الملف الشخصي', icon: '👤', path: '/profile' },
            ].map(item => (
              <button key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className="liquid-glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 transition-transform active:scale-95">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold text-white">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <CustomerNav />
    </div>
  );
}
