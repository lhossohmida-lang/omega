import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import CustomerNav from '../components/CustomerNav';
import { IoSearch, IoFlame, IoAdd } from 'react-icons/io5';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

// Cart stored in localStorage
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

export default function CustomerHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

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
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice || 0,
        image: product.image || '',
        quantity: 1,
      });
    }
    saveCart(cart);
    toast.success(`تمت إضافة ${product.name} إلى السلة`);
  };

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">مرحباً {userData?.name?.split(' ')[0] || ''} 👋</h1>
              <p className="text-omega-text-muted text-xs">ماذا تشتهي اليوم؟</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center">
              <span className="text-white font-bold text-sm">Ω</span>
            </div>
          </div>

          {/* البحث */}
          <div className="relative mb-3">
            <IoSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-omega-text-muted" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن وجبتك..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-omega-gray/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/40 transition-all"
            />
          </div>

          {/* الأقسام */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat.id
                    ? 'bg-omega-orange text-white shadow-lg shadow-omega-orange/20'
                    : 'bg-omega-gray/50 text-omega-text-muted hover:bg-omega-gray border border-white/5'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* البانر */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <div className="relative rounded-2xl overflow-hidden h-40 bg-gradient-to-l from-omega-orange/90 to-omega-red/90 mb-6">
          <div className="absolute inset-0 flex items-center justify-between p-6">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <IoFlame className="text-yellow-300" />
                <span className="text-yellow-100 text-xs font-medium">عرض خاص</span>
              </div>
              <h2 className="text-white text-xl font-black mb-1">خصم 20%</h2>
              <p className="text-white/80 text-xs">على جميع وجبات البرجر</p>
            </div>
            <div className="text-6xl opacity-80">🍔</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* عنوان القسم */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {activeCategory === 'all' ? 'جميع المنتجات' : categories.find(c => c.id === activeCategory)?.label}
          </h3>
          <span className="text-omega-text-muted text-xs">{filteredProducts.length} منتج</span>
        </div>

        {/* المنتجات */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton h-32 w-full" />
                <div className="p-3 bg-omega-gray/30">
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">😅</div>
            <p className="text-omega-text-muted">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, idx) => (
              <div
                key={product.id}
                className="rounded-2xl overflow-hidden bg-omega-gray/30 border border-white/5 hover:border-omega-orange/20 transition-all duration-300 animate-fade-in group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* صورة المنتج */}
                <div 
                  className="relative h-32 bg-omega-gray overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {product.category === 'burger' ? '🍔' : product.category === 'pizza' ? '🍕' : product.category === 'tacos' ? '🌮' : '🥤'}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-omega-orange/90 text-white text-[10px] font-bold">
                    {product.category === 'burger' ? 'برجر' : product.category === 'pizza' ? 'بيتزا' : product.category === 'tacos' ? 'تاكوس' : 'مشروب'}
                  </div>
                </div>

                {/* تفاصيل المنتج */}
                <div className="p-3">
                  <h4 className="text-white text-sm font-bold mb-1 truncate">{product.name}</h4>
                  {product.description && (
                    <p className="text-omega-text-muted text-[10px] mb-2 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-omega-orange font-bold text-sm">{formatCurrency(product.price)}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className="w-8 h-8 rounded-xl bg-omega-orange flex items-center justify-center text-white hover:bg-omega-orange-light active:scale-90 transition-all shadow-lg shadow-omega-orange/20"
                    >
                      <IoAdd size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CustomerNav />
    </div>
  );
}
