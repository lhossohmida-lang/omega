import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import CustomerNav from '../components/CustomerNav';
import { IoArrowForward, IoAdd, IoRemove, IoCart, IoCheckmarkCircle, IoFlame } from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => { loadProduct(); }, [id]);

  const loadProduct = async () => {
    try {
      const data = await getProduct(id);
      setProduct(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const addToCart = () => {
    if (!product) return;
    const cart = getCart();
    const existing = cart.find(item => item.productId === product.id);
    if (existing) existing.quantity += quantity;
    else cart.push({
      productId: product.id, name: product.name, price: product.price,
      costPrice: product.costPrice || 0, image: product.image || '', quantity,
    });
    saveCart(cart);
    toast.success(`تمت إضافة ${product.name}`);
    navigate('/cart');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-omega-orange/20 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-omega-orange rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4 animate-float">😢</div>
        <p className="text-white font-bold mb-1">المنتج غير موجود</p>
        <p className="text-omega-text-muted text-sm mb-6">قد يكون قد تم حذفه</p>
        <button onClick={() => navigate('/')} className="btn-primary">العودة للرئيسية</button>
      </div>
    </div>
  );

  const emoji = product.category === 'burger' ? '🍔' : product.category === 'pizza' ? '🍕' : product.category === 'tacos' ? '🌮' : '🥤';
  const catLabel = product.category === 'burger' ? 'برجر' : product.category === 'pizza' ? 'بيتزا' : product.category === 'tacos' ? 'تاكوس' : 'مشروبات';

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden">
      {/* Hero image */}
      <div className="relative h-80 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name}
            className="w-full h-full object-cover animate-fade-in" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-9xl bg-gradient-to-b from-omega-gray to-omega-dark">
            <span className="animate-float">{emoji}</span>
          </div>
        )}
        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-omega-dark via-omega-dark/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-omega-dark/40 via-transparent to-transparent" />

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-black/70 transition-all active:scale-95">
          <IoArrowForward size={20} />
        </button>

        {/* Category floating chip */}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-omega-orange/90 backdrop-blur text-white text-xs font-bold shadow-lg shadow-omega-orange/40">
          {catLabel}
        </div>
      </div>

      {/* Details card */}
      <div className="max-w-lg mx-auto px-4 -mt-10 relative z-10">
        <div className="rounded-3xl bg-gradient-to-b from-omega-gray/80 to-omega-dark-2/80 backdrop-blur-xl border border-white/10 p-6 animate-slide-up shadow-2xl shadow-black/40">
          {/* Name + price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${product.stock > 0 ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25' : 'bg-omega-red/12 text-omega-red border-omega-red/25'}`}>
                  {product.stock > 0 ? <><IoCheckmarkCircle size={10} /> متوفر ({product.stock})</> : 'غير متوفر'}
                </span>
                {product.stock > 0 && product.stock <= 5 && (
                  <span className="badge bg-yellow-500/12 text-yellow-400 border-yellow-500/25 animate-blink">
                    <IoFlame size={10} /> الكمية قليلة
                  </span>
                )}
              </div>
            </div>
            <div className="text-left flex-shrink-0">
              <p className="text-omega-text-dim text-[10px]">السعر</p>
              <span className="gradient-text font-black text-2xl">{formatCurrency(product.price)}</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-4 p-4 rounded-2xl bg-white/3 border border-white/5">
              <p className="text-omega-text-dim text-[10px] font-bold mb-1">الوصف</p>
              <p className="text-omega-text text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Quantity selector */}
          <div className="flex items-center justify-between bg-white/3 border border-white/5 rounded-2xl p-4 mt-4">
            <div>
              <p className="text-omega-text-dim text-[10px]">الكمية</p>
              <p className="text-white text-sm font-bold mt-0.5">اختر العدد</p>
            </div>
            <div className="flex items-center gap-2 bg-omega-dark/60 border border-white/8 rounded-2xl p-1">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-omega-red/20 hover:text-omega-red transition-all active:scale-90 disabled:opacity-40">
                <IoRemove size={16} />
              </button>
              <span className="text-white font-black text-lg min-w-[32px] text-center">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                className="w-9 h-9 rounded-xl bg-omega-orange/15 flex items-center justify-center text-omega-orange hover:bg-omega-orange/30 transition-all active:scale-90">
                <IoAdd size={16} />
              </button>
            </div>
          </div>

          {/* Total + CTA */}
          <div className="mt-5 pt-5 border-t border-white/8 flex items-center justify-between gap-3">
            <div>
              <p className="text-omega-text-dim text-[10px]">الإجمالي</p>
              <p className="text-white font-black text-2xl leading-tight">{formatCurrency(product.price * quantity)}</p>
            </div>
            <button
              onClick={addToCart}
              disabled={product.stock <= 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <IoCart size={20} />
              <span>أضف للسلة</span>
            </button>
          </div>
        </div>
      </div>
      <CustomerNav />
    </div>
  );
}
