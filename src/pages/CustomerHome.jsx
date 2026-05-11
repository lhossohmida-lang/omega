import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import CustomerNav from '../components/CustomerNav';
import {
  IoSearch, IoAdd, IoNotifications, IoPersonOutline,
  IoOptionsOutline, IoHeart, IoHeartOutline,
  IoChevronBack, IoRestaurantOutline
} from 'react-icons/io5';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); }
  catch { return []; }
}
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }
function getFav() {
  try { return JSON.parse(localStorage.getItem('tarken_fav') || '[]'); } catch { return []; }
}
function saveFav(f) { localStorage.setItem('tarken_fav', JSON.stringify(f)); }

const categories = [
  { id: 'all', label: 'الكل', emoji: '⊞' },
  { id: 'burger', label: 'برغر', emoji: '🍔' },
  { id: 'pizza', label: 'بيتزا', emoji: '🍕' },
  { id: 'tacos', label: 'تاكوس', emoji: '🌮' },
  { id: 'drinks', label: 'مشروبات', emoji: '🥤' },
];

const categoryEmoji = (cat) =>
  cat === 'burger' ? '🍔' : cat === 'pizza' ? '🍕' : cat === 'tacos' ? '🌮' : '🥤';

export default function CustomerHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemId, setAddedItemId] = useState(null);
  const [favorites, setFavorites] = useState(getFav());
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data.filter(p => p.isAvailable !== false));
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); saveFav(next);
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const addToCart = (product) => {
    const cart = getCart();
    const existing = cart.find(item => item.productId === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({
      productId: product.id, name: product.name, price: product.price,
      costPrice: product.costPrice || 0, image: product.image || '', quantity: 1,
    });
    saveCart(cart);
    setAddedItemId(product.id);
    setTimeout(() => setAddedItemId(null), 600);
    toast.success(`تمت إضافة ${product.name}`, { duration: 1500 });
  };

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 bg-omega-orange/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none fixed top-1/3 -left-20 w-80 h-80 bg-omega-red/10 rounded-full blur-[120px]" />

      <div className="relative max-w-lg mx-auto px-4 pt-5">
        {/* Top bar: profile + bell + brand */}
        <div className="flex items-center justify-between mb-5 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/profile')}
              className="w-11 h-11 rounded-full bg-white/5 border border-omega-orange/30 flex items-center justify-center text-omega-orange shadow-lg shadow-omega-orange/20">
              <IoPersonOutline size={20} />
            </button>
            <button className="w-11 h-11 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/80 relative">
              <IoNotifications size={18} />
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-white font-black text-2xl tracking-tight" style={{ fontFamily: 'system-ui' }}>tarken</h1>
            <p className="text-omega-text-muted text-xs mt-0.5">
              مرحباً {userData?.name?.split(' ')[0] || ''} 👋
            </p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 mb-5 animate-fade-in" style={{ animationDelay: '60ms' }}>
          <div className="relative flex-1">
            <IoSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-omega-text-dim" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن وجبتك المفضلة..."
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/40 transition-all"
            />
          </div>
          <button className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 hover:text-omega-orange transition-colors">
            <IoOptionsOutline size={20} />
          </button>
        </div>

        {/* Welcome banner */}
        <div className="relative rounded-[1.5rem] overflow-hidden mb-5 p-6 animate-slide-up shadow-2xl shadow-omega-orange/20 border border-white/8">
          <div className="absolute inset-0 bg-gradient-to-br from-omega-orange/25 via-omega-orange/10 to-transparent" />
          <div className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 75% 50%, rgba(255,107,0,0.35) 0%, rgba(229,57,53,0.15) 35%, transparent 75%)'
            }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-omega-orange text-[11px] font-bold mb-1.5 tracking-wider">tarken RESTAURANT</p>
              <h2 className="text-white text-2xl font-black mb-1 leading-tight">طعام شهي</h2>
              <h2 className="text-white text-2xl font-black mb-2 leading-tight">يصلك بسرعة</h2>
              <p className="text-white/70 text-xs">اختر وجبتك المفضلة من القائمة</p>
            </div>
            <div className="text-7xl drop-shadow-2xl animate-float">🍽️</div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-1 px-1">
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 border ${
                  active
                    ? 'bg-gradient-to-l from-omega-orange to-omega-orange-dark border-omega-orange text-white shadow-lg shadow-omega-orange/40'
                    : 'bg-white/[0.04] border-white/8 text-white/80 hover:border-omega-orange/30'
                }`}
              >
                <span className="text-base">{cat.emoji}</span>
                <span className="text-sm font-bold">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Products */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black text-lg flex items-center gap-2">
            <IoRestaurantOutline className="text-omega-orange" size={20} />
            {activeCategory === 'all' ? 'القائمة' : categories.find(c => c.id === activeCategory)?.label}
          </h3>
          <span className="text-omega-text-muted text-xs">{filteredProducts.length} منتج</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-3xl" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-3 animate-float">🍽️</div>
            <p className="text-white font-bold mb-1">لا توجد منتجات</p>
            <p className="text-omega-text-muted text-sm">جرّب فئة أخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 stagger mb-8">
            {filteredProducts.map((product) => {
              const isAdded = addedItemId === product.id;
              const isFav = favorites.includes(product.id);
              return (
                <div
                  key={product.id}
                  className="group relative rounded-[1.5rem] overflow-hidden bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-sm border border-white/8 transition-all duration-500 hover:-translate-y-1 hover:border-omega-orange/30"
                >
                  {/* Image */}
                  <div
                    className="relative h-36 overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {product.image ? (
                      <img src={product.image} alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-omega-gray/40 to-omega-dark/40 group-hover:scale-110 transition-transform duration-700">
                        {categoryEmoji(product.category)}
                      </div>
                    )}

                    {/* Heart button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFav(product.id); }}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      {isFav
                        ? <IoHeart className="text-omega-red" size={16} />
                        : <IoHeartOutline size={16} />
                      }
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3.5">
                    <h4 className="text-white text-sm font-bold mb-1 truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-omega-text-dim text-[10px] line-clamp-2 leading-relaxed mb-2 min-h-[28px]">
                        {product.description}
                      </p>
                    )}

                    {/* Price + Add */}
                    <div className="flex items-end justify-between mt-2">
                      <span className="text-omega-orange font-black text-base leading-tight">{formatCurrency(product.price)}</span>
                      <button
                        onClick={() => addToCart(product)}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white transition-all duration-300 active:scale-90 shadow-lg ${
                          isAdded
                            ? 'bg-emerald-500 shadow-emerald-500/40 scale-110'
                            : 'bg-gradient-to-br from-omega-orange to-omega-orange-dark shadow-omega-orange/40 hover:scale-110'
                        }`}
                      >
                        {isAdded ? '✓' : <IoAdd size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomerNav />
    </div>
  );
}
