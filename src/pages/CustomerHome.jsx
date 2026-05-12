import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import CustomerNav from '../components/CustomerNav';
import {
  IoSearch, IoAdd, IoMenu, IoClose,
  IoHeart, IoHeartOutline, IoCheckmark,
  IoTimeOutline,
} from 'react-icons/io5';
import { formatCurrency } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import toast from 'react-hot-toast';

/* ── helpers ── */
function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; }
}
function saveCart(c) { localStorage.setItem('omega_cart', JSON.stringify(c)); }
function getFav() {
  try { return JSON.parse(localStorage.getItem('tarken_fav') || '[]'); } catch { return []; }
}
function saveFav(f) { localStorage.setItem('tarken_fav', JSON.stringify(f)); }

const CATEGORIES = [
  { id: 'all',        label: 'الكل',      emoji: '⊞' },
  { id: 'burger',     label: 'برغر',      emoji: '🍔' },
  { id: 'pizza',      label: 'بيتزا',     emoji: '🍕' },
  { id: 'tacos',      label: 'تاكوس',     emoji: '🌮' },
  { id: 'drinks',     label: 'مشروبات',   emoji: '🥤' },
  { id: 'desserts',   label: 'حلويات',    emoji: '🍰' },
  { id: 'appetizers', label: 'مقبلات',    emoji: '🍟' },
];

/* ─────────────────────────────────────────────────── */
export default function CustomerHome() {
  const [products,      setProducts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeCat,     setActiveCat]     = useState('all');
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [cartExpanded,  setCartExpanded]  = useState({});  // { productId: true }
  const [favorites,     setFavorites]     = useState(getFav);
  const [showFavOnly,   setShowFavOnly]   = useState(false);
  const [ordersCount,   setOrdersCount]   = useState(0);
  const [dotIndex,      setDotIndex]      = useState(0);

  const carouselRef = useRef(null);
  const { userData } = useAuth();
  const navigate    = useNavigate();
  const businessStatus = getStatusMessage();

  /* load products */
  useEffect(() => {
    getAllProducts()
      .then(data => setProducts(data.filter(p => p.isAvailable !== false)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* load orders count */
  useEffect(() => {
    if (!userData?.uid) return;
    getCountFromServer(
      query(collection(db, 'orders'), where('customerId', '==', userData.uid))
    ).then(snap => setOrdersCount(snap.data().count)).catch(() => {});
  }, [userData?.uid]);

  /* toggle favourite */
  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); saveFav(next);
  };

  /* filtered list */
  const filtered = products.filter(p => {
    if (showFavOnly && !favorites.includes(p.id)) return false;
    if (activeCat !== 'all' && p.category !== activeCat) return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
  });

  /* add to cart */
  const addToCart = (product) => {
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

  const handleAdd = (product) => {
    addToCart(product);
    setCartExpanded(p => ({ ...p, [product.id]: true }));
  };

  const handleAddMore = (product) => {
    addToCart(product);
  };

  const handleDone = (id) => setCartExpanded(p => ({ ...p, [id]: false }));

  /* dot tracker */
  const onCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const cardW = el.clientWidth * 0.86 + 16; // card width + gap
    setDotIndex(Math.round(el.scrollLeft / cardW));
  }, []);

  /* ─────────── UI ─────────── */
  return (
    <div className="min-h-screen overflow-x-hidden pb-28"
      style={{ background: 'radial-gradient(ellipse 120% 55% at 80% 0%, #200e00 0%, #0a0a0a 55%)' }}>

      {/* ambient glows */}
      <div className="pointer-events-none fixed top-0 right-0 h-80 w-80 rounded-full bg-omega-orange/20 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-1/3 -left-20 h-72 w-72 rounded-full bg-omega-red/10 blur-[120px]" />

      {/* ════════ HEADER ════════ */}
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3">
        {/* force ltr so left=hamburger, right=search regardless of body rtl */}
        <div className="flex items-center justify-between" dir="ltr">

          {/* Hamburger ← left */}
          <button
            onClick={() => setMenuOpen(true)}
            className="liquid-glass flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform active:scale-90"
          >
            <IoMenu size={22} />
          </button>

          {/* Logo ← center */}
          <img
            src="/logo.png"
            alt="OMEGA"
            className="h-14 w-14 rounded-full object-cover shadow-lg shadow-omega-orange/30"
          />

          {/* Search ← right */}
          <button
            onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }}
            className={`liquid-glass flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-90 ${searchOpen ? 'text-omega-orange' : 'text-white'}`}
          >
            {searchOpen ? <IoClose size={22} /> : <IoSearch size={22} />}
          </button>
        </div>

        {/* Search input (expands below) */}
        {searchOpen && (
          <div className="mt-3 animate-slide-up">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن وجبتك..."
              className="liquid-glass w-full rounded-2xl px-5 py-3.5 text-right text-sm text-white placeholder-white/40 outline-none"
            />
          </div>
        )}

        {/* Business hours banner */}
        {!businessStatus.open && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-omega-red/30 bg-omega-red/10 px-4 py-2.5">
            <span className="text-xs font-bold text-omega-red">11:00 ص — 10:00 م</span>
            <div className="flex items-center gap-1.5 text-xs font-black text-omega-red">
              <IoTimeOutline size={15} />
              {businessStatus.message}
            </div>
          </div>
        )}
      </header>

      <div className="px-4 space-y-4">

        {/* ════════ TWO SUMMARY CARDS ════════ */}
        <div className="grid grid-cols-2 gap-3">

          {/* Orders card – right (first in RTL) */}
          <button
            onClick={() => navigate('/my-orders')}
            className="liquid-glass flex flex-col items-start rounded-3xl p-4 text-right transition-transform active:scale-95"
          >
            <span className="mb-2 text-3xl">📦</span>
            <p className="text-[11px] font-bold text-white/50">طلباتي</p>
            <p className="text-xl font-black text-white">{ordersCount} طلب</p>
          </button>

          {/* Favourites card – left (second in RTL) */}
          <button
            onClick={() => setShowFavOnly(v => !v)}
            className={`liquid-glass flex flex-col items-start rounded-3xl p-4 text-right transition-all active:scale-95 ${showFavOnly ? 'border-omega-red/40 shadow-[inset_0_0_0_1.5px_rgba(229,57,53,0.4)]' : ''}`}
          >
            <span className="mb-2 text-3xl">❤️</span>
            <p className="text-[11px] font-bold text-white/50">المفضلة</p>
            <p className="text-xl font-black text-white">{favorites.length} وجبة</p>
          </button>
        </div>

        {/* ════════ CATEGORY STRIP ════════ */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map(cat => {
            const active = activeCat === cat.id && !showFavOnly;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCat(cat.id); setShowFavOnly(false); }}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
                  active
                    ? 'bg-omega-orange text-white shadow-lg shadow-omega-orange/35'
                    : 'liquid-glass text-white/70'
                }`}
              >
                <span className="text-sm">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════ CAROUSEL ════════ */}
      <div className="mt-5">
        {loading ? (
          <div className="flex gap-4 overflow-hidden px-4">
            {[1, 2].map(i => (
              <div key={i} className="skeleton h-72 w-[86vw] shrink-0 rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center animate-fade-in">
            <div className="mb-3 text-6xl">🍽️</div>
            <p className="font-bold text-white">لا توجد منتجات</p>
            <p className="mt-1 text-sm text-white/50">
              {showFavOnly ? 'لا توجد وجبات في المفضلة' : 'جرّب فئة أخرى'}
            </p>
          </div>
        ) : (
          <>
            <div
              ref={carouselRef}
              onScroll={onCarouselScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4"
            >
              {filtered.map(product => {
                const isFav      = favorites.includes(product.id);
                const isExpanded = !!cartExpanded[product.id];
                const catInfo    = CATEGORIES.find(c => c.id === product.category) || CATEGORIES[0];

                return (
                  <div
                    key={product.id}
                    className="snap-start shrink-0 w-[86vw] max-w-[360px]"
                  >
                    {/* Card */}
                    <div className="relative overflow-hidden rounded-3xl">

                      {/* Food image */}
                      <div
                        className="h-64 w-full cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-8xl">
                            {catInfo.emoji}
                          </div>
                        )}
                      </div>

                      {/* Fav button – top right */}
                      <button
                        onClick={() => toggleFav(product.id)}
                        className="liquid-glass absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
                      >
                        {isFav
                          ? <IoHeart className="text-omega-red" size={18} />
                          : <IoHeartOutline className="text-white" size={18} />}
                      </button>

                      {/* ── Product detail card – liquid glass overlay ── */}
                      <div className="liquid-glass absolute bottom-0 left-0 right-0 rounded-b-3xl px-4 py-3">
                        <div className="flex items-center justify-between gap-3">

                          {/* Name + price – left (end in RTL) */}
                          <div className="min-w-0 text-right">
                            <h4 className="truncate text-base font-black text-white">{product.name}</h4>
                            <p className="text-lg font-black text-omega-orange">{formatCurrency(product.price)}</p>
                          </div>

                          {/* Add controls – right (start in RTL) */}
                          {isExpanded ? (
                            <div className="flex shrink-0 items-center gap-2" dir="ltr">
                              {/* Add one more */}
                              <button
                                onClick={() => handleAddMore(product)}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-omega-orange text-white shadow-lg shadow-omega-orange/40 transition-transform active:scale-90"
                              >
                                <IoAdd size={22} />
                              </button>
                              {/* Done */}
                              <button
                                onClick={() => handleDone(product.id)}
                                className="liquid-glass flex h-11 items-center gap-1.5 rounded-2xl border-emerald-500/40 px-3 text-xs font-black text-emerald-400"
                              >
                                <IoCheckmark size={16} />
                                تم
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAdd(product)}
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-omega-orange text-white shadow-lg shadow-omega-orange/40 transition-transform active:scale-90"
                            >
                              <IoAdd size={26} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* trailing spacer so last card scrolls to start */}
              <div className="shrink-0 w-4" />
            </div>

            {/* Dot indicators */}
            {filtered.length > 1 && filtered.length <= 12 && (
              <div className="mt-4 flex justify-center gap-1.5 px-4">
                {filtered.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === dotIndex
                        ? 'h-2 w-6 bg-omega-orange'
                        : 'h-2 w-2 bg-white/25'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════ HAMBURGER MENU DRAWER ════════ */}
      {menuOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* drawer – slides from left */}
          <div
            className="liquid-glass animate-menu-in fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col gap-3 p-5"
            style={{ borderRadius: '0 1.75rem 1.75rem 0' }}
          >
            {/* header */}
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setMenuOpen(false)}
                className="liquid-glass flex h-10 w-10 items-center justify-center rounded-2xl text-white/60"
              >
                <IoClose size={20} />
              </button>
              <img src="/logo.png" alt="OMEGA" className="h-10 w-10 rounded-full object-cover" />
            </div>

            {/* profile chip */}
            <div className="liquid-glass rounded-2xl px-4 py-3">
              <p className="font-black text-white">{userData?.name || 'زائر'}</p>
              <p className="mt-0.5 text-xs text-white/50">{userData?.phone || ''}</p>
            </div>

            {/* nav links */}
            {[
              { label: 'الرئيسية',       icon: '🏠', path: '/' },
              { label: 'طلباتي',          icon: '📦', path: '/my-orders' },
              { label: 'السلة',           icon: '🛒', path: '/cart' },
              { label: 'الملف الشخصي',   icon: '👤', path: '/profile' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className="liquid-glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-right transition-transform active:scale-95"
              >
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
