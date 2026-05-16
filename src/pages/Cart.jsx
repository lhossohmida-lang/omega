import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerNav from '../components/CustomerNav';
import { formatCurrency } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import { IoTrash, IoAdd, IoRemove, IoArrowForward, IoCart, IoBag, IoTimeOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() { try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [removingId, setRemovingId] = useState(null);
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
    setRemovingId(productId);
    setTimeout(() => {
      const updated = cart.filter(item => item.productId !== productId);
      setCart(updated);
      saveCart(updated);
      setRemovingId(null);
      toast.success('تمت الإزالة');
    }, 250);
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
    toast.success('تم تفريغ السلة');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const businessStatus = getStatusMessage();

  const handleCheckout = () => {
    if (!businessStatus.open) {
      toast.error(businessStatus.message);
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden bg-omega-black">

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-omega-dark/70 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <IoArrowForward size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-white">سلة التسوق</h1>
              <p className="text-omega-text-dim text-[11px]">{itemCount} منتج</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1 text-omega-red text-xs font-bold hover:text-omega-red-light transition-colors">
              <IoTrash size={14} /> تفريغ
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-3 relative">
        {cart.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="text-7xl animate-float">🛒</div>
              <div className="absolute inset-0 bg-omega-orange/20 blur-3xl rounded-full" />
            </div>
            <h3 className="text-white font-black text-xl mb-2">السلة فارغة</h3>
            <p className="text-omega-text-muted text-sm mb-7">أضف بعض الوجبات اللذيذة!</p>
            <button onClick={() => navigate('/')} className="btn-primary inline-flex items-center gap-2">
              <IoBag size={18} /> تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div className="space-y-2.5 mb-3.5 stagger">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-l from-white/5 to-white/3 backdrop-blur-sm border border-white/8 p-3 flex gap-3 transition-all duration-300 ${
                    removingId === item.productId ? 'opacity-0 -translate-x-full scale-95' : 'hover:border-omega-orange/20'
                  }`}
                >
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/8 bg-omega-gray">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-omega-gray to-omega-dark">🍽️</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1 text-right">
                        <h4 className="text-white text-sm font-bold truncate">{item.name}</h4>
                        {item.type === 'offer' && (
                          <span className="mt-1 inline-flex rounded-full bg-omega-orange/10 px-2 py-0.5 text-[10px] font-black text-omega-orange">
                            عرض خاص
                          </span>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.productId)}
                        className="w-7 h-7 rounded-lg bg-omega-red/10 text-omega-red hover:bg-omega-red/20 flex items-center justify-center transition-colors flex-shrink-0">
                        <IoTrash size={14} />
                      </button>
                    </div>
                    <p className="gradient-text font-black text-base">{formatCurrency(item.price)}</p>
                    {item.type === 'offer' && item.components?.length > 0 && (
                      <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/8 px-2.5 py-2 text-right">
                        <p className="mb-1 text-[10px] font-black text-omega-text-muted">مكونات العرض</p>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {item.components.map(component => (
                            <span key={component.productId} className="rounded-full bg-omega-orange/10 px-2 py-0.5 text-[10px] font-bold text-omega-orange">
                              {component.quantity}x {component.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Qty controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-0.5">
                        <button onClick={() => updateQuantity(item.productId, -1)}
                          className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-omega-red/20 hover:text-omega-red transition-all active:scale-90">
                          <IoRemove size={14} />
                        </button>
                        <span className="text-white font-black text-sm min-w-[24px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)}
                          className="w-7 h-7 rounded-lg bg-omega-orange/15 flex items-center justify-center text-omega-orange hover:bg-omega-orange/30 transition-all active:scale-90">
                          <IoAdd size={14} />
                        </button>
                      </div>
                      <p className="text-white text-xs font-bold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-gradient-to-br from-omega-gray/40 to-omega-dark-2/40 backdrop-blur border border-white/8 p-4 mb-3.5 animate-fade-in">
              <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <IoCart className="text-omega-orange" size={16} /> ملخص الطلب
              </h4>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-omega-text-muted">عدد المنتجات</span>
                  <span className="text-white font-bold">{itemCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-omega-text-muted">المجموع الفرعي</span>
                  <span className="text-white">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="text-white font-black">الإجمالي</span>
                <span className="gradient-text font-black text-2xl">{formatCurrency(total)}</span>
              </div>
            </div>

            {!businessStatus.open && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-omega-red/30 bg-omega-red/10 px-4 py-3 text-sm font-bold text-omega-red animate-fade-in">
                <IoTimeOutline size={18} />
                <span>{businessStatus.message}</span>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCheckout}
              disabled={!businessStatus.open}
              className="w-full py-3.5 rounded-xl bg-gradient-to-l from-omega-orange via-omega-orange-dark to-omega-red text-white font-black text-sm shadow-2xl shadow-omega-orange/25 hover:shadow-omega-orange/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-fade-in disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <IoCart size={20} />
              <span>{businessStatus.open ? `إتمام الطلب • ${formatCurrency(total)}` : 'المطعم مغلق حالياً'}</span>
            </button>
          </>
        )}
      </div>
      <CustomerNav />
    </div>
  );
}
