import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import CustomerNav from '../components/CustomerNav';
import { IoSearch, IoFlame, IoAdd, IoNotifications, IoStar } from 'react-icons/io5';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); }
  catch { return []; }
}
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }

const categories = [
  { id: 'all', label: 'الكل', emoji: '🔥' },
  { id: 'burger', label: 'برجر', emoji: '🍔' },
  { id: 'pizza', label: 'بيتزا', emoji: '🍕' },
  { id: 'tacos', label: 'تاكوس', emoji: '🌮' },
  { id: 'drinks', label: 'مشروبات', emoji: '🥤' },
];

const categoryEmoji = (cat) =>
  cat === 'burger' ? '🍔' : cat === 'pizza' ? '🍕' : cat === 'tacos' ? '🌮' : '🥤';
const categoryLabel = (cat) =>
  cat === 'burger' ? 'برجر' : cat === 'pizza' ? 'بيتزا' : cat === 'tacos' ? 'تاكوس' : 'مشروب';

export default function CustomerHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemId, setAddedItemId] = useState(null);
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data.filter(p => p.isAvailable));
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && (searchQuery ? matchSearch : true);
  });

  const addToCart = (product) => {
    const cart = getCart();
    const existing = cart.find(item => item.productId === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      costPrice: product.costPrice || 0,
      image: product.image || '',
      quantity: 1,
    });
    saveCart(cart);
    setAddedItemId(product.id);
    setTimeout(() => setAddedItemId(null), 600);
    toast.success(`تمت إضافة ${product.name}`, { duration: 1500 });
  };

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none fixed top-0 right-0 w-72 h-72 bg-omega-orange/15 rounded-full blur-3xl animate-float" />
      <div className="pointer-events-none fixed bottom-32 left-0 w-72 h-72 bg-omega-red/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-omega-dark/70 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4 animate-fade-in">
            <div>
              <p className="text-omega-text-muted text-[11px]">مرحباً 👋</p>
              <h1 className="text-xl font-black text-white">
                {userData?.name?.split(' ')[0] || 'صديقنا'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-omega-text-muted hover:text-omega-orange transition-colors relative">
                <IoNotifications size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-omega-red rounded-full animate-blink" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-omega-orange via-omega-orange-dark to-omega-red flex items-center justify-center shadow-lg shadow-omega-orange/30">
                <span className="text-white font-black text-sm">Ω</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3 animate-fade-in" style={{ animationDelay: '60ms' }}>
            <IoSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 text-omega-text-dim" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن وجبتك المفضلة..."
              className="w-full pr-11 pl-4 py-3 rounded-2xl bg-white/5 border border-white/8 text-white text-sm placeholder-omega-text-dim focus:outline-none focus:border-omega-orange/40 focus:bg-white/8 transition-all"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 animate-fade-in ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white shadow-lg shadow-omega-orange/30 scale-105'
                    : 'bg-white/5 text-omega-text-muted hover:bg-white/8 border border-white/8'
                }`}
              >
                <span className="text-base">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="max-w-lg mx-auto px-4 mt-4 relative">
        <div className="relative rounded-3xl overflow-hidden h-44 mb-6 animate-slide-up shadow-2xl shadow-omega-orange/20">
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-omega-orange via-omega-orange-dark to-omega-red" />
          {/* Pattern dots */}
          <div className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          {/* Content */}
          <div className="relative h-full flex items-center justify-between p-6">
            <div className="z-10">
              <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                <IoFlame className="text-yellow-200" size={12} />
                <span className="text-yellow-100 text-[10px] font-bold">عرض اليوم</span>
              </div>
              <h2 className="text-white text-2xl font-black mb-1 leading-tight">خصم 20%</h2>
              <p className="text-white/85 text-xs">على جميع وجبات البرجر 🔥</p>
            </div>
            <div className="text-7xl animate-float drop-shadow-2xl">🍔</div>
          </div>
          {/* Shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <IoStar className="text-amber-400" size={18} />
              {activeCategory === 'all' ? 'كل المنتجات' : categories.find(c => c.id === activeCategory)?.label}
            </h3>
            <p className="text-omega-text-dim text-[11px] mt-0.5">{filteredProducts.length} منتج متاح</p>
          </div>
        </div>

        {/* Products */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-3xl overflow-hidden">
                <div className="skeleton h-36 w-full rounded-3xl" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-3 animate-float">😅</div>
            <p className="text-white font-bold mb-1">لا توجد منتجات</p>
            <p className="text-omega-text-muted text-sm">جرّب فئة أخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 stagger">
            {filteredProducts.map((product) => {
              const isAdded = addedItemId === product.id;
              return (
                <div
                  key={product.id}
                  className="group relative rounded-3xl overflow-hidden bg-gradient-to-b from-omega-gray/40 to-omega-dark-2/40 backdrop-blur-sm border border-white/8 hover:border-omega-orange/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-omega-orange/15"
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
                      <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-omega-gray to-omega-dark group-hover:scale-110 transition-transform duration-700">
                        {categoryEmoji(product.category)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Category badge */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold border border-white/10">
                      {categoryLabel(product.category)}
                    </div>

                    {/* Low stock badge */}
                    {product.stock <= 5 && product.stock > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-yellow-500/90 text-white text-[10px] font-bold animate-blink">
                        قليل
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h4 className="text-white text-sm font-bold mb-1 truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-omega-text-dim text-[10px] mb-2 line-clamp-1">{product.description}</p>
                    )}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-omega-text-dim text-[9px]">السعر</p>
                        <span className="gradient-text font-black text-base leading-tight">{formatCurrency(product.price)}</span>
                      </div>
                      <button
                        onClick={() => addToCart(product)}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white transition-all duration-300 active:scale-90 shadow-lg ${
                          isAdded
                            ? 'bg-emerald-500 shadow-emerald-500/40 scale-110'
                            : 'bg-gradient-to-br from-omega-orange via-omega-orange-dark to-omega-red shadow-omega-orange/30 hover:shadow-omega-orange/50 hover:scale-110'
                        }`}
                      >
                        {isAdded ? '✓' : <IoAdd size={18} />}
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
