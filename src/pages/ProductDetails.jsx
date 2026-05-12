import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import CustomerNav from '../components/CustomerNav';
import {
  IoArrowForward, IoAdd, IoRemove, IoCart,
  IoHeart, IoHeartOutline, IoChevronBack, IoRestaurantOutline,
  IoTimeOutline
} from 'react-icons/io5';
import { getStatusMessage } from '../utils/businessHours';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }
function getFav() { try { return JSON.parse(localStorage.getItem('tarken_fav') || '[]'); } catch { return []; } }
function saveFav(f) { localStorage.setItem('tarken_fav', JSON.stringify(f)); }

const categoryLabel = (cat) =>
  cat === 'burger' ? 'برغر' : cat === 'pizza' ? 'بيتزا' : cat === 'tacos' ? 'تاكوس' : 'مشروبات';

const categoryEmoji = (cat) =>
  cat === 'burger' ? '🍔' : cat === 'pizza' ? '🍕' : cat === 'tacos' ? '🌮' : '🥤';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [favs, setFavs] = useState(getFav());

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [p, all] = await Promise.all([getProduct(id), getAllProducts()]);
      setProduct(p);
      if (p) {
        setRelated(
          all
            .filter(x => x.id !== p.id && x.isAvailable !== false && x.category === p.category)
            .slice(0, 3)
        );
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleFav = (pid) => {
    const next = favs.includes(pid) ? favs.filter(x => x !== pid) : [...favs, pid];
    setFavs(next); saveFav(next);
  };

  const totalPrice = (product?.price || 0) * quantity;
  const businessStatus = getStatusMessage();

  const addToCart = () => {
    if (!product) return;
    if (!businessStatus.open) {
      toast.error(businessStatus.message);
      return;
    }
    const cart = getCart();
    const existing = cart.find(item => item.productId === product.id);
    if (existing) existing.quantity += quantity;
    else cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      costPrice: product.costPrice || 0,
      image: product.image || '',
      quantity,
    });
    saveCart(cart);
    toast.success(`تمت إضافة ${product.name}`);
    navigate('/cart');
  };

  const cartCount = getCart().reduce((s, i) => s + i.quantity, 0);
  const isFav = product && favs.includes(product.id);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="relative">
        <div className="w-12 h-12 border-4 border-omega-orange/20 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-omega-orange rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4 animate-float">😢</div>
        <p className="text-white font-bold mb-1">المنتج غير موجود</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">العودة للرئيسية</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-40 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="pointer-events-none fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-omega-orange/20 to-transparent" />

      <div className="relative max-w-lg mx-auto px-4 pt-5">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95">
              <IoArrowForward size={20} />
            </button>
            <button
              onClick={() => toggleFav(product.id)}
              className="w-11 h-11 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center transition-colors active:scale-95"
            >
              {isFav ? <IoHeart className="text-omega-red" size={20} /> : <IoHeartOutline className="text-white" size={20} />}
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-white font-black text-2xl tracking-tight" style={{ fontFamily: 'system-ui' }}>tarken</h1>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative h-72 flex items-center justify-center mb-5 animate-fade-in">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 bg-omega-orange/25 rounded-full blur-3xl" />
          </div>
          {product.image ? (
            <img src={product.image} alt={product.name}
              className="relative h-full max-w-full object-contain drop-shadow-2xl animate-float" />
          ) : (
            <div className="relative text-9xl drop-shadow-2xl animate-float">{categoryEmoji(product.category)}</div>
          )}
          <div className="absolute bottom-2 left-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm text-white text-xs font-bold">
            {categoryLabel(product.category)}
          </div>
        </div>

        {/* Name + price */}
        <div className="flex items-start justify-between gap-3 mb-4 animate-slide-up">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-2xl mb-2 leading-tight">{product.name}</h2>
            {product.description && (
              <p className="text-omega-text-muted text-sm leading-relaxed">{product.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <p className="text-omega-text-dim text-[10px] mb-0.5">السعر</p>
            <span className="gradient-text font-black text-3xl leading-tight">{formatCurrency(product.price)}</span>
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between mb-5 mt-6 bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div>
            <h3 className="text-white font-black text-base">الكمية</h3>
            <p className="text-omega-text-muted text-xs mt-0.5">اختر العدد</p>
          </div>
          <div className="flex items-center gap-1 bg-omega-dark/60 border border-white/8 rounded-2xl p-1">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-omega-red/20 hover:text-omega-red transition-all active:scale-90 disabled:opacity-40">
              <IoRemove size={18} />
            </button>
            <span className="text-white font-black text-lg min-w-[40px] text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-xl bg-omega-orange/20 flex items-center justify-center text-omega-orange hover:bg-omega-orange/30 transition-all active:scale-90">
              <IoAdd size={18} />
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-l from-omega-orange/15 to-transparent border border-omega-orange/25 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <span className="text-white font-bold text-sm">الإجمالي</span>
          <span className="gradient-text font-black text-2xl">{formatCurrency(totalPrice)}</span>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <>
            <h3 className="text-white font-black text-base mb-3 flex items-center gap-1.5">
              <IoRestaurantOutline className="text-omega-orange" size={16} /> منتجات مشابهة
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {related.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/product/${r.id}`)}
                  className="rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 hover:border-omega-orange/30 transition-all text-right group"
                >
                  <div className="h-20 bg-omega-gray/40 overflow-hidden flex items-center justify-center text-3xl">
                    {r.image
                      ? <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      : categoryEmoji(r.category)
                    }
                  </div>
                  <div className="p-2">
                    <p className="text-white text-[10px] font-bold truncate">{r.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-omega-orange text-[10px] font-black">{formatCurrency(r.price)}</span>
                      <div className="w-6 h-6 rounded-lg bg-omega-orange flex items-center justify-center text-white">
                        <IoAdd size={12} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-24 left-3 right-3 z-40 max-w-lg mx-auto">
        <div className="bg-omega-dark/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-2.5 flex items-center gap-2 shadow-2xl shadow-black/80">
          <div className="flex items-center gap-2 px-3">
            <div className="relative">
              <IoCart className="text-white" size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-omega-orange text-white text-[9px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <p className="text-white font-black text-sm leading-tight">{formatCurrency(totalPrice)}</p>
          </div>
          <button
            onClick={addToCart}
            disabled={!businessStatus.open}
            className="flex-1 bg-gradient-to-l from-omega-orange via-omega-orange-dark to-omega-red text-white font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-omega-orange/40 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {businessStatus.open ? (
              <>
                <span>أضف إلى السلة</span>
                <IoChevronBack size={16} />
              </>
            ) : (
              <>
                <IoTimeOutline size={16} />
                <span>المطعم مغلق</span>
              </>
            )}
          </button>
        </div>
      </div>

      <CustomerNav />
    </div>
  );
}
