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
      toast.success('تمت إزالة الوجبة');
    }, 250);
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
    toast.success('تم تفريغ السلة بنجاح');
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
    <div className="min-h-screen pb-36 relative bg-[#f7f7f7] text-[#1a1a2e] font-cairo">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-black/5 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-800 hover:bg-gray-200 transition-colors active:scale-95">
              <IoArrowForward size={20} />
            </button>
            <div className="text-right">
              <h1 className="text-lg font-black text-gray-900 leading-tight">سلة التسوق</h1>
              <p className="text-gray-500 text-[11px] font-bold mt-0.5">{itemCount} وجبات في السلة</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-black hover:bg-red-100 transition-colors active:scale-95">
              <IoTrash size={14} /> تفريغ السلة
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 relative">
        {cart.length === 0 ? (
          <div className="text-center py-20 animate-fade-in px-4">
            <div className="relative inline-block mb-6">
              <div className="text-8xl animate-float">🛒</div>
              <div className="absolute inset-0 bg-omega-orange/10 blur-3xl rounded-full" />
            </div>
            <h3 className="text-gray-900 font-black text-2xl mb-2">سلتك فارغة حالياً</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">يبدو أنك لم تختر أي وجبة شهية بعد. استكشف قائمتنا المميزة وأضف وجباتك المفضلة!</p>
            <button onClick={() => navigate('/')} className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 shadow-lg shadow-omega-orange/20">
              <IoBag size={18} /> تصفح الوجبات اللذيذة
            </button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div className="space-y-3 mb-4 stagger">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className={`relative overflow-hidden rounded-2xl bg-white border border-black/5 p-4 flex gap-4 shadow-sm transition-all duration-355 ${
                    removingId === item.productId ? 'opacity-0 translate-x-full scale-95' : 'hover:border-omega-orange/20 hover:shadow-md'
                  }`}
                >
                  {/* Image */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-black/5 bg-gray-50 relative flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">🍔</div>
                    )}
                    {item.type === 'offer' && (
                      <span className="absolute top-1 right-1 bg-omega-orange text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-sm">
                        عرض
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 text-right">
                          <h4 className="text-gray-900 text-sm font-black leading-snug">{item.name}</h4>
                          {item.type === 'offer' && (
                            <span className="mt-1 inline-flex rounded-full bg-omega-orange/10 px-2 py-0.5 text-[9px] font-black text-omega-orange">
                              عرض خاص من OMEGA
                            </span>
                          )}
                        </div>
                        <button onClick={() => removeItem(item.productId)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0"
                          aria-label="إزالة">
                          <IoTrash size={14} />
                        </button>
                      </div>

                      {/* Components of Offer */}
                      {item.type === 'offer' && item.components?.length > 0 && (
                        <div className="mt-2 rounded-xl bg-orange-50/50 border border-orange-100/50 p-2.5 text-right">
                          <p className="mb-1 text-[9px] font-black text-orange-600">مكونات العرض:</p>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {item.components.map(component => (
                              <span key={component.productId} className="rounded-lg bg-orange-100/80 px-2 py-0.5 text-[9px] font-bold text-orange-850">
                                {component.quantity}x {component.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price and Qty controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-black/5 rounded-xl p-1">
                        <button onClick={() => updateQuantity(item.productId, -1)}
                          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 border border-black/5">
                          <IoRemove size={14} />
                        </button>
                        <span className="text-gray-950 font-black text-xs min-w-[28px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)}
                          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-orange-50 hover:text-omega-orange transition-all active:scale-90 border border-black/5">
                          <IoAdd size={14} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold">المجموع</p>
                        <p className="text-gray-950 font-black text-sm">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl bg-white border border-black/5 p-5 mb-4 shadow-sm relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-gray-50 rounded-full opacity-60 pointer-events-none" />
              
              <h4 className="text-gray-900 font-black text-sm mb-4 flex items-center gap-2 relative z-10">
                <IoCart className="text-omega-orange" size={16} /> ملخص الحساب
              </h4>
              
              <div className="space-y-3 mb-4 relative z-10">
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>عدد الوجبات الكلي</span>
                  <span className="text-gray-900">{itemCount} وجبات</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>المجموع الفرعي</span>
                  <span className="text-gray-900">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>خدمة التوصيل</span>
                  <span className="text-green-600 font-black">مجاني بمناسبة الافتتاح 🛵</span>
                </div>
              </div>
              
              <div className="border-t border-dashed border-gray-200 my-4" />
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <span className="text-[10px] text-gray-400 font-black block">السعر الإجمالي النهائي</span>
                  <span className="text-gray-900 font-black text-xs">(شامل الرسوم والضرائب)</span>
                </div>
                <span className="gradient-text font-black text-2xl">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Business Status closed banner */}
            {!businessStatus.open && (
              <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-xs font-black text-red-600 animate-fade-in leading-relaxed text-right">
                <IoTimeOutline size={18} className="flex-shrink-0" />
                <span>{businessStatus.message}</span>
              </div>
            )}

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              disabled={!businessStatus.open}
              className="w-full py-4 rounded-2xl bg-gradient-to-l from-omega-orange via-omega-orange-dark to-omega-red text-white font-black text-sm shadow-xl shadow-omega-orange/15 hover:shadow-omega-orange/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-fade-in disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <IoCart size={20} />
              <span>{businessStatus.open ? `إتمام الطلب والدفع • ${formatCurrency(total)}` : 'المطعم مغلق حالياً'}</span>
            </button>
          </>
        )}
      </div>
      <CustomerNav cartCount={itemCount} />
    </div>
  );
}
