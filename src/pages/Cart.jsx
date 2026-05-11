import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerNav from '../components/CustomerNav';
import { formatCurrency } from '../utils/formatCurrency';
import { IoTrash, IoAdd, IoRemove, IoArrowForward, IoCart } from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }

export default function Cart() {
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { setCart(getCart()); }, []);

  const updateQuantity = (productId, delta) => {
    const updated = cart.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    setCart(updated);
    saveCart(updated);
  };

  const removeItem = (productId) => {
    const updated = cart.filter(item => item.productId !== productId);
    setCart(updated);
    saveCart(updated);
    toast.success('تمت الإزالة من السلة');
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
    toast.success('تم تفريغ السلة');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-omega-dark pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-omega-text-muted hover:text-white transition-colors">
              <IoArrowForward size={22} />
            </button>
            <h1 className="text-lg font-bold text-white">سلة التسوق</h1>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-omega-red text-xs hover:text-omega-red-light transition-colors">تفريغ السلة</button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {cart.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-white font-bold text-lg mb-2">السلة فارغة</h3>
            <p className="text-omega-text-muted text-sm mb-6">أضف بعض الوجبات اللذيذة!</p>
            <button onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-omega-orange text-white font-medium hover:bg-omega-orange-light transition-colors">
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            {/* عناصر السلة */}
            <div className="space-y-3 mb-4">
              {cart.map((item, idx) => (
                <div key={item.productId} className="glass rounded-xl p-3 flex gap-3 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="w-16 h-16 rounded-xl bg-omega-gray overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-bold truncate">{item.name}</h4>
                    <p className="text-omega-orange text-sm font-bold">{formatCurrency(item.price)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.productId, -1)}
                          className="w-7 h-7 rounded-lg bg-omega-dark/50 flex items-center justify-center text-white text-xs hover:bg-omega-orange/20 transition-colors">
                          <IoRemove size={14} />
                        </button>
                        <span className="text-white font-bold text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)}
                          className="w-7 h-7 rounded-lg bg-omega-dark/50 flex items-center justify-center text-white text-xs hover:bg-omega-orange/20 transition-colors">
                          <IoAdd size={14} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="text-omega-red hover:text-omega-red-light transition-colors">
                        <IoTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* الملخص */}
            <div className="glass rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-omega-text-muted text-sm">عدد المنتجات</span>
                <span className="text-white font-bold">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="text-white font-bold">الإجمالي</span>
                <span className="text-omega-orange font-black text-xl">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* زر الطلب */}
            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold text-base hover:shadow-lg hover:shadow-omega-orange/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <IoCart size={20} />
              <span>إتمام الطلب • {formatCurrency(total)}</span>
            </button>
          </>
        )}
      </div>
      <CustomerNav />
    </div>
  );
}
