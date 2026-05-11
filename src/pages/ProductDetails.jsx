import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import CustomerNav from '../components/CustomerNav';
import { IoArrowForward, IoAdd, IoRemove, IoCart } from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [id]);

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
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        productId: product.id, name: product.name, price: product.price,
        costPrice: product.costPrice || 0, image: product.image || '', quantity,
      });
    }
    saveCart(cart);
    toast.success(`تمت إضافة ${product.name} إلى السلة`);
    navigate('/cart');
  };

  if (loading) return (
    <div className="min-h-screen bg-omega-dark flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-omega-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-omega-dark flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">😢</div>
        <p className="text-omega-text-muted mb-4">المنتج غير موجود</p>
        <button onClick={() => navigate('/')} className="text-omega-orange">العودة</button>
      </div>
    </div>
  );

  const emoji = product.category === 'burger' ? '🍔' : product.category === 'pizza' ? '🍕' : product.category === 'tacos' ? '🌮' : '🥤';

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      {/* صورة المنتج */}
      <div className="relative h-72 bg-omega-gray overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-b from-omega-gray to-omega-dark">{emoji}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-omega-dark via-transparent to-transparent" />
        <button onClick={() => navigate(-1)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-white">
          <IoArrowForward size={20} />
        </button>
      </div>

      {/* التفاصيل */}
      <div className="max-w-lg mx-auto px-4 -mt-8 relative z-10">
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-omega-orange text-xs font-medium px-2 py-1 rounded-lg bg-omega-orange/10 mb-2 inline-block">
                {product.category === 'burger' ? 'برجر' : product.category === 'pizza' ? 'بيتزا' : product.category === 'tacos' ? 'تاكوس' : 'مشروبات'}
              </span>
              <h1 className="text-2xl font-black text-white mt-2">{product.name}</h1>
            </div>
            <div className="text-2xl font-black text-omega-orange">{formatCurrency(product.price)}</div>
          </div>

          {product.description && (
            <p className="text-omega-text-muted text-sm leading-relaxed mb-4">{product.description}</p>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded-lg ${product.stock > 0 ? 'bg-omega-success/10 text-omega-success' : 'bg-omega-red/10 text-omega-red'}`}>
              {product.stock > 0 ? `متوفر (${product.stock})` : 'غير متوفر'}
            </span>
          </div>

          {/* الكمية */}
          <div className="flex items-center justify-between bg-omega-dark/50 rounded-xl p-3 mb-4">
            <span className="text-omega-text-muted text-sm">الكمية</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-omega-gray flex items-center justify-center text-white hover:bg-omega-orange/20 transition-colors">
                <IoRemove size={16} />
              </button>
              <span className="text-white font-bold text-lg w-6 text-center">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="w-8 h-8 rounded-lg bg-omega-gray flex items-center justify-center text-white hover:bg-omega-orange/20 transition-colors">
                <IoAdd size={16} />
              </button>
            </div>
          </div>

          {/* الإجمالي وزر الإضافة */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-omega-text-muted text-xs">الإجمالي</p>
              <p className="text-white font-black text-xl">{formatCurrency(product.price * quantity)}</p>
            </div>
            <button
              onClick={addToCart}
              disabled={product.stock <= 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold hover:shadow-lg hover:shadow-omega-orange/25 transition-all disabled:opacity-50 active:scale-95"
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
