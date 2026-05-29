import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import TransparentImg from '../components/TransparentImg';
import { formatCurrency } from '../utils/formatCurrency';
import CategoryIcon from '../components/CategoryIcon';
import { createOrder, createAdminOrder, getOrder } from '../services/orderService';

// صورة بديلة حسب الفئة (نفس المنطق المستخدم في واجهة الإدارة)
function fallbackImg(cat) {
  return {
    burger: './burger-classic.png',
    pizza:  './pizza-pepperoni.png',
    tacos:  './tacos-wrap.png',
    drinks: './drink-cola.png',
    appetizers: './fried-chicken.png',
    desserts: './dessert.png',
    sofli: './sofli.png',
    box: './burger-classic.png',
  }[cat] || './burger-classic.png';
}

// بيانات الفئات (نفس AdminOrders)
const CAT_META = {
  all:        { label: 'الكل',    emoji: '🍽️' },
  pizza:      { label: 'بيتزا',   emoji: '🍕' },
  burger:     { label: 'برغر',    emoji: '🍔' },
  tacos:      { label: 'تاكوس',   emoji: '🌮' },
  drinks:     { label: 'مشروبات', emoji: '🥤' },
  desserts:   { label: 'حلويات',  emoji: '🍰' },
  appetizers: { label: 'مقبلات',  emoji: '🍟' },
  sofli:      { label: 'سوفلي',   emoji: '🥟', iconUrl: '/sofli-icon.png' },
};

export default function Kiosk() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(1);
  const [orderType, setOrderType] = useState(null); // 'dine-in' or 'takeaway'
  const [note, setNote] = useState('');
  
  // TPE Payment Simulation State
  const [tpeStep, setTpeStep] = useState(1);
  const [pinDigits, setPinDigits] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isReceiptReady, setIsReceiptReady] = useState(false);

  // بيانات المنتجات من Firebase (نفس getAllProducts المستخدم في الإدارة)
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // حالة الكيوسك للطلب (نفس بنية NewOrderModal في AdminOrders)
  const [cart, setCart] = useState({});           // { [key]: { qty, productId, sizeLabel?, sizePrice? } }
  const [activeCat, setActiveCat] = useState('all');
  const [activeSize, setActiveSize] = useState('all');

  // خيار طريقة الدفع المختار وحالة المعالجة
  const [paymentMethod, setPaymentMethod] = useState(null); // 'ccp' or 'cash'
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // تحميل المنتجات من Firebase (نفس مصدر البيانات المستخدم في واجهة الإدارة)
  useEffect(() => {
    getAllProducts()
      .then(firebaseProducts => {
        setAllProducts(firebaseProducts);
      })
      .catch(err => {
        console.error('فشل تحميل المنتجات في الكيوسك:', err);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  // تحديث تاريخ ووقت ورقم الطلب
  useEffect(() => {
    if (phase === 5) {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString('ar-DZ', {
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false
      }));
      if (!orderNumber) {
        const randNum = Math.floor(100 + Math.random() * 900);
        setOrderNumber(`OM-${randNum}`);
      }

      // محاكاة الطباعة بعد ثانيتين
      const timer = setTimeout(() => {
        setIsReceiptReady(true);
        setTimeout(() => {
          window.print();
        }, 300);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [phase, orderNumber]);

  // محاكاة الدفع عبر TPE
  useEffect(() => {
    if (phase === 4) {
      setTpeStep(1);
      setPinDigits('');
      
      // الانتقال التلقائي من شاشة إدخال البطاقة إلى طلب الرقم السري بعد 2.5 ثانية
      const cardTimer = setTimeout(() => {
        setTpeStep(2);
      }, 2500);

      return () => clearTimeout(cardTimer);
    }
  }, [phase]);

  const handlePinSubmit = () => {
    if (pinDigits.length === 4) {
      setTpeStep(3); // التحقق
      setTimeout(() => {
        setTpeStep(4); // تم القبول
        setTimeout(() => {
          handleCcpSuccess(); // حفظ وإرسال للمطبخ مباشرة!
        }, 1500);
      }, 2000);
    }
  };

  const handleKeypadPress = (num) => {
    if (pinDigits.length < 4) {
      const newPin = pinDigits + num;
      setPinDigits(newPin);
      if (newPin.length === 4) {
        // Submit automatically when 4 digits are entered
        setTimeout(() => {
          setTpeStep(3); // التحقق
          setTimeout(() => {
            setTpeStep(4); // تم القبول
            setTimeout(() => {
              handleCcpSuccess(); // حفظ وإرسال للمطبخ مباشرة!
            }, 1500);
          }, 2000);
        }, 500);
      }
    }
  };

  const handleClearPin = () => {
    setPinDigits('');
  };

  // إضافة منتج (نفس بنية AdminOrders)
  const addItem = (id, sizeLabel, sizePrice) => {
    if (sizeLabel !== undefined) {
      const key = `${id}__${sizeLabel}`;
      setCart(c => ({ ...c, [key]: { qty: (c[key]?.qty || 0) + 1, productId: id, sizeLabel, sizePrice } }));
    } else {
      setCart(c => ({ ...c, [id]: { qty: (c[id]?.qty || 0) + 1, productId: id } }));
    }
  };

  // إزالة منتج
  const removeItem = (key) => setCart(c => {
    const n = { ...c };
    if (n[key]?.qty > 1) n[key] = { ...n[key], qty: n[key].qty - 1 };
    else delete n[key];
    return n;
  });

  // المنتجات المتاحة (نفس المنطق في الإدارة)
  const availableProducts = allProducts.filter(p => p.isAvailable !== false);

  // الفئات الموجودة
  const existingCats = ['all',
    ...Object.keys(CAT_META).filter(k =>
      k !== 'all' && availableProducts.some(p => p.category === k)
    )
  ];

  // تصفية المنتجات (نفس AdminOrders)
  const filteredProducts = availableProducts.filter(p => {
    if (activeCat !== 'all' && p.category !== activeCat) return false;
    if (activeSize === 'all') return true;
    return p.hasSizes && p.sizes?.some(sz => sz.label === activeSize);
  });

  // حساب محتويات السلة (نفس AdminOrders)
  const cartEntries = Object.entries(cart).map(([key, entry]) => {
    const p = allProducts.find(x => x.id === entry.productId);
    if (!p) return null;
    const price = entry.sizePrice !== undefined ? entry.sizePrice : (p.price || 0);
    const label = entry.sizeLabel ? ` (${entry.sizeLabel})` : '';
    return { key, product: p, quantity: entry.qty, price, label, name: p.name + label, selectedSize: entry.sizeLabel || null };
  }).filter(Boolean);

  const cartTotal = cartEntries.reduce((s, e) => s + e.price * e.quantity, 0);
  const cartItemCount = cartEntries.reduce((s, e) => s + e.quantity, 0);
  const serviceFee = 50;
  const finalTotal = cartTotal + serviceFee;

  const resetKiosk = () => {
    setCart({});
    setOrderType(null);
    setActiveCat('all');
    setActiveSize('all');
    setNote('');
    setIsReceiptReady(false);
    setPaymentMethod(null);
    setPhase(1);
  };

  // دالة نجاح الدفع لـ CCP وإرسال الطلب مباشرة للمطبخ (status: 'preparing')
  const handleCcpSuccess = async () => {
    setSubmittingOrder(true);
    try {
      const items = cartEntries.map(entry => {
        const baseItem = {
          productId: entry.product.id,
          name: entry.product.name,
          price: Number(entry.price),
          quantity: entry.quantity,
          costPrice: Number(entry.product.costPrice || 0),
          image: entry.product.image || '',
          category: entry.product.category || '',
        };
        if (entry.selectedSize) {
          baseItem.selectedSize = entry.selectedSize;
        }
        return baseItem;
      });

      const orderData = {
        items,
        orderType: orderType === 'dine-in' ? 'table' : 'delivery',
        tableNumber: orderType === 'dine-in' ? 'كشك الطلب الذاتي' : '',
        paymentMethod: 'ccp',
        note: note || '',
        customerName: 'زبون الكشك',
        deliveryFee: 0,
        serviceFee: 50,
        status: 'preparing', // للمطبخ مباشرة!
      };

      const orderId = await createAdminOrder(orderData);
      const createdDoc = await getOrder(orderId);
      const finalNum = createdDoc ? String(createdDoc.orderNumber) : 'OM-00';
      setOrderNumber(finalNum);
      setPhase(5); // الانتقال للطباعة مباشرة
    } catch (err) {
      console.error('فشل إرسال طلب الـ CCP للمطبخ:', err);
      alert('حدث خطأ أثناء معالجة الدفع، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // دالة إرسال الطلب نقداً (status: 'pending') بانتظار موافقة الإدارة
  const handleCashSuccess = async () => {
    setSubmittingOrder(true);
    try {
      const items = cartEntries.map(entry => {
        const baseItem = {
          productId: entry.product.id,
          name: entry.product.name,
          price: Number(entry.price),
          quantity: entry.quantity,
          costPrice: Number(entry.product.costPrice || 0),
          image: entry.product.image || '',
          category: entry.product.category || '',
        };
        if (entry.selectedSize) {
          baseItem.selectedSize = entry.selectedSize;
        }
        return baseItem;
      });

      const orderData = {
        items,
        orderType: orderType === 'dine-in' ? 'table' : 'delivery',
        tableNumber: orderType === 'dine-in' ? 'كشك الطلب الذاتي' : '',
        paymentMethod: 'cash',
        note: note || '',
        customerName: 'زبون الكشك',
        deliveryFee: 0,
        serviceFee: 50,
        status: 'pending', // ينتظر التأكيد من لوحة الإدارة!
      };

      const orderId = await createOrder(orderData);
      const createdDoc = await getOrder(orderId);
      const finalNum = createdDoc ? String(createdDoc.orderNumber) : 'OM-00';
      setOrderNumber(finalNum);
      setPhase(5); // الانتقال للطباعة مباشرة
    } catch (err) {
      console.error('فشل إرسال طلب الكاش للإدارة:', err);
      alert('حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmittingOrder(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#141414] text-white font-['Cairo'] relative overflow-x-hidden selection:bg-red-600 selection:text-white" dir="rtl">
      {/* ستايل مخصص للتأثيرات البصرية وطباعة التذكرة */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
        
        .cairo-font {
          font-family: 'Cairo', sans-serif;
        }

        /* أنيميشن النبض للزر الترحيبي */
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 25px rgba(220, 38, 38, 0.5);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 50px rgba(234, 179, 8, 0.9);
          }
        }
        .pulse-btn {
          animation: pulse-glow 2s infinite ease-in-out;
        }

        /* خلفية جزيئات تدريجية متحركة باللون الأحمر والأصفر */
        .bg-particles {
          background: radial-gradient(circle at 50% 50%, #7f1d1d 0%, #1c0202 100%);
          overflow: hidden;
        }
        .bg-particles::before {
          content: '';
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background-image: 
            radial-gradient(circle, #eab308 1.5px, transparent 1.5px),
            radial-gradient(circle, #dc2626 1px, transparent 1px);
          background-size: 80px 80px, 40px 40px;
          background-position: 0 0, 40px 40px;
          opacity: 0.12;
          animation: particlesRotate 80s linear infinite;
        }
        @keyframes particlesRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ستايلات الطباعة */
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt-section, #print-receipt-section * {
            visibility: visible;
          }
          #print-receipt-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            color: #000 !important;
            background: #fff !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }

        /* تصميم تذكرة حرارية حقيقية */
        .thermal-receipt {
          font-family: 'Courier New', Courier, monospace, 'Cairo';
          color: #000;
          background: #fff;
          border: 1px dashed #ccc;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* =======================================================
          المرحلة 1: شاشة الترحيب (WelcomeScreen)
          ======================================================= */}
      {phase === 1 && (
        <div className="absolute inset-0 bg-[#faf9f6] flex flex-col justify-between items-center py-10 px-6 z-10 animate-fadeIn animate-duration-300 overflow-hidden font-['Cairo'] text-gray-900 select-none">
          {/* خلفيات المنحنيات المموجة طبق الأصل من الصورة */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-red-600 to-red-700 rounded-full opacity-95 pointer-events-none z-0"></div>
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full opacity-90 pointer-events-none z-0"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full opacity-95 pointer-events-none z-0"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-br from-red-650 to-red-700 rounded-full opacity-95 pointer-events-none z-0"></div>

          {/* زينة الأطعمة الجانبية */}
          <div className="absolute left-[-80px] bottom-[15%] w-72 h-72 opacity-90 pointer-events-none z-0 hover:rotate-3 transition-transform duration-700">
            <img src="/pizza-pepperoni.png" alt="Pizza Tray" className="w-full h-full object-contain filter drop-shadow-2xl" />
          </div>
          <div className="absolute right-[-100px] top-[25%] w-80 h-80 opacity-90 pointer-events-none z-0 rotate-12 hover:rotate-6 transition-transform duration-700">
            <img src="/pizza-pepperoni.png" alt="Pizza Slice" className="w-full h-full object-contain filter drop-shadow-2xl" />
          </div>

          {/* المحتوى الرئيسي */}
          <div className="flex flex-col items-center mt-6 text-center z-10">
            {/* اللوغو الدائري المذهل */}
            <div className="w-52 h-52 md:w-60 h-60 bg-white rounded-full p-4 shadow-2xl flex items-center justify-center mb-6 border-[8px] border-yellow-450 relative hover:scale-[1.03] hover:rotate-3 transition-all duration-500">
              <img src="/logo.png" alt="OMEGA Logo" className="w-full h-full object-contain" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight text-gray-900">
              مرحباً بك في <span className="text-red-600">OMEGA</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-extrabold max-w-lg mb-1 leading-relaxed">
              الطعم الذي تعشقه بلمسة <span className="text-red-600 border-b-2 border-red-500/20">واحدة</span>.
            </p>
            <p className="text-lg md:text-xl text-gray-600 font-extrabold max-w-lg leading-relaxed">
              اختر ادفع، واستمتع بوجبتك <span className="text-yellow-500 border-b-2 border-yellow-450/20">الساخنة</span>!
            </p>
          </div>

          {/* زر الترحيب التفاعلي الضخم */}
          <div className="flex flex-col items-center gap-4 z-10 my-4">
            <button
              onClick={() => setPhase(2)}
              className="flex items-center gap-4 px-12 py-5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-3xl shadow-2xl hover:scale-[1.04] active:scale-95 transition-all duration-300 border-[5px] border-yellow-400 cursor-pointer shadow-red-600/30"
            >
              <div className="w-12 h-12 rounded-full bg-white text-red-600 flex items-center justify-center shadow-inner font-black text-2xl">
                ↓
              </div>
              <span>اضغط للبدء</span>
            </button>

            {/* خطوط ذهبية مميزة */}
            <div className="flex items-center gap-4 text-gray-500 mt-1 font-bold">
              <div className="w-10 h-[2.5px] bg-yellow-400 rounded-full"></div>
              <span className="text-red-950 text-sm tracking-widest font-black">ابدأ طلبك الآن</span>
              <div className="w-10 h-[2.5px] bg-yellow-400 rounded-full"></div>
            </div>
          </div>

          {/* البانر السفلي للخصائص */}
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-150 py-4 px-8 flex justify-around items-center z-10">
            <div className="flex items-center gap-3 text-right">
              <span className="text-red-600 text-3xl">🍽️</span>
              <div>
                <p className="text-gray-900 font-black text-sm">طازجة دائماً</p>
              </div>
            </div>
            <div className="h-8 w-[1.5px] bg-gray-250"></div>
            <div className="flex items-center gap-3 text-right">
              <span className="text-red-600 text-3xl">🏍️</span>
              <div>
                <p className="text-gray-900 font-black text-sm">توصيل سريع</p>
              </div>
            </div>
            <div className="h-8 w-[1.5px] bg-gray-250"></div>
            <div className="flex items-center gap-3 text-right">
              <span className="text-yellow-500 text-3xl">🏅</span>
              <div>
                <p className="text-gray-900 font-black text-sm">جودة 100%</p>
              </div>
            </div>
          </div>

          <div className="mt-4 z-10 flex items-center gap-2 bg-red-950 text-yellow-400 text-xs font-black tracking-wide px-6 py-2 rounded-full border border-red-800 shadow-md">
            <span>🛡️</span>
            <span>شاشة طلب ذكية وآمنة 100%</span>
          </div>
        </div>
      )}

      {/* =======================================================
          المرحلة 2: اختيار طريقة الاستلام (OrderTypeScreen)
          ======================================================= */}
      {phase === 2 && (
        <div className="absolute inset-0 bg-[#faf9f6] flex flex-col justify-between p-6 z-10 animate-fadeIn animate-duration-300 overflow-hidden font-['Cairo'] text-gray-900 select-none">
          {/* منحنيات الخلفية من الصورة تماماً */}
          {/* المنحنى الأحمر الجانبي الأيمن */}
          <div className="absolute right-0 top-0 bottom-0 w-[140px] pointer-events-none z-0 overflow-hidden">
            <svg viewBox="0 0 100 200" className="h-full w-full object-cover" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 0 C 35 50, 45 150, 100 200 Z" fill="#dc2626" />
              <path d="M100 15 C 50 65, 55 135, 100 185 Z" fill="#b91c1c" opacity="0.3" />
            </svg>
          </div>
          {/* المنحنى الأصفر الجانبي الأيسر السفلي */}
          <div className="absolute left-0 bottom-0 w-[180px] h-[150px] pointer-events-none z-0 overflow-hidden">
            <svg viewBox="0 0 180 150" className="h-full w-full" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 150 Q 75 125, 45 45 T 0 0 Z" fill="#facc15" />
            </svg>
          </div>

          {/* شريط علوي بسيط للعودة */}
          <div className="w-full flex justify-between items-center z-10 pb-4">
            <button 
              onClick={() => setPhase(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-red-650 font-black text-sm shadow-sm transition-all cursor-pointer"
            >
              <span>←</span>
              <span>رجوع</span>
            </button>
            <span className="px-5 py-2 rounded-full bg-yellow-400 text-gray-950 font-black text-sm shadow-sm">
              خطوة 1 من 4
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center px-4 z-10">
            {/* عنوان الواجهة مع الشوكة والملعقة والزخارف الصفراء */}
            <div className="flex items-center gap-3 mb-12">
              <span className="text-yellow-500 text-2xl animate-pulse">⚡</span>
              <span className="text-3xl text-gray-500">🍽️</span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 text-center">
                أين ترغب في تناول وجبتك؟
              </h2>
              <span className="text-3xl text-gray-500">🍽️</span>
              <span className="text-yellow-500 text-2xl animate-pulse">⚡</span>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* خيار: أكل في المطعم */}
              <button
                onClick={() => {
                  setOrderType('dine-in');
                  setPhase(3);
                }}
                className="group rounded-3xl bg-white border border-gray-150 hover:border-yellow-450 hover:shadow-2xl flex flex-col justify-between items-center p-8 transition-all duration-350 cursor-pointer text-center relative shadow-md min-h-[360px]"
              >
                {/* الأيقونة داخل دائرة صفراء */}
                <div className="w-28 h-28 bg-yellow-400 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <span className="text-5xl">🍽️</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-2xl font-black text-red-950 mb-3">أكل في المطعم</h3>
                  <p className="text-gray-500 text-sm max-w-xs leading-relaxed font-bold">
                    استمتع بوجبتك الشهية طازجة داخل صالة المطعم المريحة لدينا.
                  </p>
                </div>
                
                {/* خط فاصل منقط وزر الاختيار */}
                <div className="w-full border-t border-dashed border-gray-250 my-6"></div>
                
                <span className="px-8 py-2.5 rounded-full bg-yellow-400 text-gray-950 font-black text-sm group-hover:bg-yellow-450 transition-colors shadow-md">
                  اختيار الخدمة
                </span>
              </button>

              {/* خيار: سفري / للمنازل */}
              <button
                onClick={() => {
                  setOrderType('takeaway');
                  setPhase(3);
                }}
                className="group rounded-3xl bg-white border border-gray-150 hover:border-yellow-450 hover:shadow-2xl flex flex-col justify-between items-center p-8 transition-all duration-350 cursor-pointer text-center relative shadow-md min-h-[360px]"
              >
                {/* الأيقونة داخل دائرة صفراء */}
                <div className="w-28 h-28 bg-yellow-400 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <span className="text-5xl">🥡</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-2xl font-black text-red-950 mb-3">سفري / للمنازل</h3>
                  <p className="text-gray-500 text-sm max-w-xs leading-relaxed font-bold">
                    سنقوم بتجهيز طلبك بشكل محكم ومثالي لتأخذه معك أينما تشاء.
                  </p>
                </div>
                
                {/* خط فاصل منقط وزر الاختيار */}
                <div className="w-full border-t border-dashed border-gray-250 my-6"></div>
                
                <span className="px-8 py-2.5 rounded-full bg-yellow-400 text-gray-950 font-black text-sm group-hover:bg-yellow-450 transition-colors shadow-md">
                  اختيار الخدمة
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* المرحلة 3: اختيار المنتجات - نفس واجهة الإدارة */}
      {phase === 3 && (
        <div className="min-h-screen flex flex-col bg-white text-black animate-fadeIn animate-duration-300" dir="rtl">
          {/* رأس */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b border-gray-100 bg-red-600 text-white">
            <button type="button" onClick={() => setPhase(2)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer">✕</button>
            <div className="flex items-center gap-2 text-right">
              <div>
                <h2 className="text-white text-lg font-black">طلب جديد الكشك</h2>
                <p className="text-xs font-black mt-0.5 text-yellow-300">{orderType === 'dine-in' ? 'أكل في المطعم 🍽️' : 'سفري 🥡'}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-yellow-350">🍴</div>
            </div>
          </div>
          {/* أزرار الأحجام */}
          <div className="px-5 pt-4 pb-4 shrink-0 bg-gray-50 border-b border-gray-200">
            <p className="text-right text-gray-700 text-sm font-black mb-3">فلترة بالحجم</p>
            <div className="grid grid-cols-4 gap-3">
              {[{ id: 'all', label: 'الكل' },{ id: 'L', label: 'L' },{ id: 'XL', label: 'XL' },{ id: 'XXL', label: 'XXL' }].map(sz => (
                <button key={sz.id} type="button" onClick={() => setActiveSize(sz.id)}
                  className={`rounded-2xl border-2 py-5 text-2xl font-black transition-all cursor-pointer ${activeSize === sz.id ? 'bg-yellow-400 text-red-950 border-yellow-400 shadow-xl shadow-yellow-400/20 scale-[1.02]' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-red-500/50'}`}>
                  {sz.label}
                </button>
              ))}
            </div>
          </div>


          <div className="flex-1 min-h-0 px-5 pb-3 overflow-hidden">
            <div className="h-full rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex">
              <div className="flex-1 min-w-0 overflow-y-auto p-3">
                {loadingProducts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border-2 border-gray-200 bg-white p-2.5 animate-pulse">
                        <div className="aspect-[4/3] rounded-xl bg-gray-200 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">لا توجد منتجات</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {filteredProducts.map(p => {
                      const hasSizes = p.hasSizes && p.sizes?.length > 0;
                      if (hasSizes) {
                        const sizesToShow = (activeSize === 'all' ? p.sizes : p.sizes.filter(sz => sz.label === activeSize)).filter(sz => sz.price && Number(sz.price) > 0);
                        if (sizesToShow.length === 0) return null;
                        if (sizesToShow.length === 1) {
                          const sz = sizesToShow[0]; const key = `${p.id}__${sz.label}`; const qty = cart[key]?.qty || 0;
                          return (<button key={p.id+sz.label} type="button" onClick={() => addItem(p.id, sz.label, sz.price)} className={`relative rounded-2xl border-2 p-2.5 text-right transition-all cursor-pointer ${qty > 0 ? 'border-yellow-400 bg-yellow-400/[0.04]' : 'border-gray-200 bg-white hover:border-red-500/40'}`}>
                            <div className="aspect-[4/3] rounded-xl bg-gray-50 mb-2 overflow-hidden flex items-center justify-center"><TransparentImg src={p.image || fallbackImg(p.category)} alt={p.name} className="w-full h-full object-cover" /></div>
                            <p className="text-gray-900 font-bold text-sm truncate leading-snug">{p.name}</p>
                            <p className="text-gray-500 text-[11px] font-black mt-0.5">{sz.label}</p>
                            <p className="text-red-650 text-sm font-black mt-1">{formatCurrency(sz.price)}</p>
                            {qty > 0 && (<div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white rounded-full px-1.5 py-0.5">
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeItem(key); }} className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full cursor-pointer">−</button>
                              <span className="font-black text-xs min-w-[1ch] text-center">{qty}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); addItem(p.id, sz.label, sz.price); }} className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full cursor-pointer">+</button>
                            </div>)}
                          </button>);
                        }
                        return (<div key={p.id} className="rounded-2xl border-2 border-gray-200 bg-white p-3 cursor-pointer hover:border-red-500/40 transition-all flex flex-col justify-between">
                          <div>
                            <div className="aspect-[4/3] rounded-xl bg-gray-50 mb-2 overflow-hidden flex items-center justify-center"><TransparentImg src={p.image || fallbackImg(p.category)} alt={p.name} className="w-full h-full object-cover" /></div>
                            <p className="text-gray-900 font-bold text-sm truncate leading-snug text-right mb-3">{p.name}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {sizesToShow.map(sz => { const key = `${p.id}__${sz.label}`; const qty = cart[key]?.qty || 0; return (
                              <button key={sz.label} type="button" onClick={() => addItem(p.id, sz.label, sz.price)} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all active:scale-[0.98] cursor-pointer ${qty > 0 ? 'border-red-600 bg-red-600/5 font-bold text-red-600' : 'border-gray-200 bg-gray-50 hover:bg-white text-gray-700'}`}>
                                <span className="text-red-600 text-sm font-black">{formatCurrency(sz.price)}</span>
                                <span className="flex items-center gap-1.5">
                                  {qty > 0 && (<><span className="text-gray-700 font-black text-sm">{qty}×</span><span role="button" onClick={(e) => { e.stopPropagation(); removeItem(key); }} className="w-5 h-5 rounded bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer">−</span></>)}
                                  <span className="text-gray-900 text-xs font-black">{sz.label}</span>
                                </span>
                              </button>); })}
                          </div>
                        </div>);
                      }
                      const qty = cart[p.id]?.qty || 0;
                      return (<button key={p.id} type="button" onClick={() => addItem(p.id)} className={`relative rounded-2xl border-2 p-2.5 text-right transition-all cursor-pointer ${qty > 0 ? 'border-yellow-400 bg-yellow-400/[0.04]' : 'border-gray-200 bg-white hover:border-red-500/40'}`}>
                        <div className="aspect-[4/3] rounded-xl bg-gray-50 mb-2 overflow-hidden flex items-center justify-center"><TransparentImg src={p.image || fallbackImg(p.category)} alt={p.name} className="w-full h-full object-cover" /></div>
                        <p className="text-gray-900 font-bold text-sm truncate leading-snug">{p.name}</p>
                        <p className="text-red-650 text-sm font-black mt-1">{formatCurrency(p.price)}</p>
                        {qty > 0 && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white rounded-full px-1.5 py-0.5">
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeItem(p.id); }} className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full cursor-pointer">−</button>
                            <span className="font-black text-xs min-w-[1ch] text-center">{qty}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); addItem(p.id); }} className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full cursor-pointer">+</button>
                          </div>
                        )}
                      </button>);
                    })}
                  </div>
                )}
              </div>

              {/* الفئات (نفس AdminOrders) */}
              <div className="w-28 sm:w-36 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
                <div className="flex flex-col p-2 gap-1.5">
                  {existingCats.map(catKey => {
                    const m = CAT_META[catKey] || { label: catKey, emoji: '🍽️' };
                    const active = activeCat === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setActiveCat(catKey)}
                        className={`flex flex-col items-center gap-1 rounded-xl px-1 py-3 text-xs font-black border-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-red-650 text-white border-red-650 shadow-md shadow-red-650/25'
                            : 'bg-gray-50 text-gray-700 border-transparent hover:bg-red-50 hover:border-red-200'
                        }`}
                      >
                        <CategoryIcon
                          iconUrl={m.iconUrl}
                          emoji={m.emoji}
                          className={m.iconUrl ? 'h-6 w-6 object-contain' : 'text-2xl'}
                        />
                        <span className="text-center leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* قاع: ملاحظة + الإجمالي + الإرسال */}
          <div className="px-5 pt-3 pb-5 shrink-0 border-t border-gray-200 bg-gray-50/50 space-y-2">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ملاحظة (اختياري)"
              rows={1}
              className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-gray-900 text-sm outline-none placeholder:text-gray-400 text-right resize-none focus:border-red-500/50"
            />
            {cartItemCount > 0 && (
              <div className="flex items-center justify-between rounded-2xl bg-yellow-400/10 border border-yellow-400/35 px-4 py-2.5">
                <span className="text-red-600 font-black text-xl">{formatCurrency(cartTotal)}</span>
                <span className="text-gray-700 text-sm font-bold">{cartItemCount} صنف</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => { if (cartItemCount > 0) setPhase(3.5); }}
              disabled={cartItemCount === 0}
              className="w-full rounded-2xl bg-gradient-to-l from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white font-black text-xl shadow-lg shadow-red-600/20 disabled:opacity-40 active:scale-[0.98] transition-transform cursor-pointer"
            >
              تأكيد الطلب وإنشائه ✓
            </button>
          </div>
        </div>
      )}

      {/* =======================================================
          المرحلة 3.5: اختيار طريقة الدفع (PaymentMethodSelectionScreen)
          ======================================================= */}
      {phase === 3.5 && (
        <div className="absolute inset-0 bg-[#141414] flex flex-col z-10 animate-fadeIn animate-duration-300">
          {/* شريط علوي بسيط للعودة */}
          <div className="p-6 flex justify-between items-center border-b border-white/5 bg-[#1c0202]">
            <button 
              onClick={() => setPhase(3)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <span>رجوع لتعديل الطلب</span>
            </button>
            <span className="text-xl font-bold text-yellow-400 font-sans">خطوة 2 من 4</span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
            <h2 className="text-4xl md:text-5xl font-black text-center mb-6 tracking-tight text-white">
              اختر طريقة الدفع المناسبة 💳
            </h2>
            <p className="text-gray-400 text-lg text-center mb-16 max-w-xl">
              يمكنك الدفع مباشرة بالبطاقة البنكية أو الدفع نقداً عند صندوق المحل
            </p>

            {submittingOrder ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl text-yellow-400 font-bold">جاري إرسال وتسجيل طلبك، يرجى الانتظار...</p>
              </div>
            ) : (
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 flex-1 max-h-[500px]">
                {/* خيار: الدفع الإلكتروني بالبطاقة / CCP */}
                <button
                  onClick={() => setPhase(4)} // Goes to simulated scan screen then sends order to kitchen
                  className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2a1212] to-[#140505] border-2 border-white/5 hover:border-yellow-400 hover:shadow-[0_0_50px_rgba(234,179,8,0.25)] flex flex-col justify-center items-center p-8 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer text-center"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-bl-full group-hover:bg-yellow-400/10 transition-colors"></div>
                  <div className="w-32 h-32 bg-yellow-450/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-7xl group-hover:animate-bounce">💳</span>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-3">الدفع CCP / البطاقة</h3>
                  <p className="text-gray-300 text-lg max-w-xs leading-relaxed">
                    الدفع الإلكتروني عبر البطاقة الذهبية أو البنكية. يرسل الطلب مباشرة إلى شاشة المطبخ للتجهيز الفوري.
                  </p>
                  <span className="mt-8 px-6 py-2.5 rounded-full bg-yellow-450/10 text-yellow-400 font-bold group-hover:bg-yellow-400 group-hover:text-red-950 transition-all duration-300">
                    ادفع بالبطاقة الآن
                  </span>
                </button>

                {/* خيار: الدفع نقداً عند الصندوق */}
                <button
                  onClick={() => handleCashSuccess()}
                  className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2a1212] to-[#140505] border-2 border-white/5 hover:border-red-500 hover:shadow-[0_0_50px_rgba(220,38,38,0.25)] flex flex-col justify-center items-center p-8 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer text-center"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-650/5 rounded-bl-full group-hover:bg-red-650/10 transition-colors"></div>
                  <div className="w-32 h-32 bg-red-650/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-7xl group-hover:animate-bounce">💵</span>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-3">الدفع نقداً (كاش)</h3>
                  <p className="text-gray-300 text-lg max-w-xs leading-relaxed">
                    اطبع التذكرة الآن، وادفع نقداً عند الصندوق لتأكيد طلبك وتجهيزه عبر لوحة تحكم الإدارة.
                  </p>
                  <span className="mt-8 px-6 py-2.5 rounded-full bg-red-600/10 text-red-400 font-bold group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                    اطبع التذكرة وادفع كاش
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* =======================================================
          المرحلة 4: شاشة الدفع (PaymentScreen) - الدفع عبر الـ TPE
          ======================================================= */}
      {phase === 4 && (
        <div className="min-h-screen bg-[#141414] py-12 px-6 flex flex-col items-center justify-center animate-fadeIn animate-duration-300">
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* جهة اليمين: ملخص الطلب والمنتجات الفعلي */}
            <div className="lg:col-span-5 bg-[#1e1e1e] border border-white/5 rounded-3xl p-6 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl font-black border-b border-white/5 pb-3">ملخص طلبك</h3>
                
                <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-none pr-1 mt-4">
                  {cartEntries.map((item) => (
                    <div key={item.key} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">{item.quantity}x</span>
                        <span className="text-gray-300 font-semibold">{item.name}</span>
                        {item.selectedSize && (
                          <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded uppercase">
                            {item.selectedSize}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-white">{item.price * item.quantity} د.ج</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3.5 mt-auto">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>نوع الاستلام</span>
                  <span className="font-bold text-white">{orderType === 'dine-in' ? 'أكل في الصالة 🍽️' : 'سفري للأخذ 🥡'}</span>
                </div>
                {note && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>الملاحظة:</span>
                    <span className="font-bold text-yellow-500 truncate max-w-[180px]">{note}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400">
                  <span>رسوم التحضير والخدمة</span>
                  <span className="font-bold text-white">{serviceFee} د.ج</span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-white/5 pt-3">
                  <span>المبلغ الإجمالي</span>
                  <span className="text-xl text-yellow-400">{finalTotal} د.ج</span>
                </div>
              </div>
            </div>

            {/* جهة اليسار: بطاقة وجهاز الدفع TPE الذكي والمطوّر */}
            <div className="lg:col-span-7 bg-[#1e1e1e] border-2 border-yellow-400/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-2xl font-black text-white flex items-center gap-2">
                      <span className="p-1 bg-yellow-400/10 rounded-lg text-lg">📟</span>
                      جهاز الدفع الإلكتروني TPE / CCP
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">الرجاء استخدام بطاقتك الذهبية أو CIB لتأكيد الطلب</p>
                  </div>
                  <div className="bg-red-650 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 shadow-md">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                    <span>TPE متصل</span>
                  </div>
                </div>

                {/* جهاز TPE المحاكي بالكامل */}
                <div className="flex flex-col md:flex-row items-center gap-6 bg-[#141414] p-6 rounded-2xl border border-white/5">
                  
                  {/* مجسم جهاز TPE بالـ CSS باللون الأحمر والمطعم بالذهبي */}
                  <div className="w-48 bg-red-700 rounded-3xl p-4 border-4 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.5)] relative flex flex-col gap-3 shrink-0 transform hover:scale-105 transition-transform duration-300">
                    {/* قارئ البطاقات من الأعلى */}
                    <div className="w-36 h-2 bg-gray-800 rounded mx-auto mb-1"></div>
                    
                    {/* شاشة الـ TPE المضيئة باللون الأصفر الكلاسيكي */}
                    <div className="w-full bg-yellow-350 text-red-950 font-mono p-3 rounded-lg border-2 border-red-900 h-24 flex flex-col justify-between text-[10px] font-bold leading-tight select-none shadow-inner">
                      {tpeStep === 1 && (
                        <>
                          <div className="text-center font-bold tracking-wider text-xs border-b border-red-900/25 pb-1">OMEGA PAY</div>
                          <div className="text-center mt-2 animate-pulse">أدخل البطاقة 💳</div>
                          <div className="text-right text-xs mt-1 text-red-950/80">{finalTotal}.00 DZD</div>
                        </>
                      )}
                      {tpeStep === 2 && (
                        <>
                          <div className="text-center border-b border-red-900/25 pb-1">أدخل الرمز السري</div>
                          <div className="text-center text-lg tracking-widest mt-1">
                            {pinDigits.split('').map(() => '*').join(' ') || '_ _ _ _'}
                          </div>
                          <div className="text-left text-[9px] text-red-950/70">اضغط OK للتأكيد</div>
                        </>
                      )}
                      {tpeStep === 3 && (
                        <>
                          <div className="text-center font-bold">جاري الاتصال...</div>
                          <div className="flex justify-center items-center mt-2">
                            <span className="w-5 h-5 border-2 border-t-red-900 border-r-transparent border-b-red-900 border-l-transparent rounded-full animate-spin"></span>
                          </div>
                          <div className="text-center text-[8px] text-red-950/70 mt-1">يرجى الانتظار</div>
                        </>
                      )}
                      {tpeStep === 4 && (
                        <>
                          <div className="text-center text-xs font-black text-green-950">عملية مقبولة ✓</div>
                          <div className="text-center text-[8px] mt-1">تم سحب {finalTotal} د.ج</div>
                          <div className="text-center font-bold mt-1 text-[9px] bg-green-950/10 rounded">شكراً لكم</div>
                        </>
                      )}
                    </div>

                    {/* أزرار الـ TPE */}
                    <div className="grid grid-cols-3 gap-1.5 mt-1 font-sans text-xs">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          onClick={() => tpeStep === 2 && handleKeypadPress(num.toString())}
                          className="py-1 bg-[#1e2022] hover:bg-[#343a40] text-gray-300 font-bold rounded shadow border-b-2 border-black active:bg-gray-700 cursor-pointer"
                        >
                          {num}
                        </button>
                      ))}
                      {/* الزر الأحمر: إلغاء */}
                      <button
                        onClick={handleClearPin}
                        className="py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow border-b-2 border-red-900 active:scale-95 cursor-pointer text-[10px]"
                      >
                        إلغاء
                      </button>
                      {/* الزر 0 */}
                      <button
                        onClick={() => tpeStep === 2 && handleKeypadPress('0')}
                        className="py-1 bg-[#1e2022] hover:bg-[#343a40] text-gray-300 font-bold rounded shadow border-b-2 border-black active:scale-95 cursor-pointer"
                      >
                        0
                      </button>
                      {/* الزر الأخضر: تأكيد */}
                      <button
                        onClick={handlePinSubmit}
                        className="py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow border-b-2 border-green-900 active:scale-95 cursor-pointer text-[10px]"
                      >
                        موافق
                      </button>
                    </div>
                  </div>

                  {/* التعليمات الجانبية للدفع الرقمي */}
                  <div className="flex-1 space-y-4">
                    {tpeStep === 1 && (
                      <div className="space-y-2">
                        <span className="text-gray-400 text-xs font-bold block">خطوة 1: البطاقة البنكية</span>
                        <h4 className="text-lg font-black text-white">الرجاء إدخال بطاقتك الذهبية</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          أدخل بطاقة بريد الجزائر أو البطاقة البنكية CIB في قارئ البطاقات لجهاز الـ TPE المرفق بالكشك للبدء بالعملية تلقائياً.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setTpeStep(2)}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-yellow-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all animate-bounce"
                          >
                            محاكاة إدخال البطاقة 💳
                          </button>
                        </div>
                      </div>
                    )}

                    {tpeStep === 2 && (
                      <div className="space-y-2">
                        <span className="text-gray-400 text-xs font-bold block">خطوة 2: تأكيد الهوية</span>
                        <h4 className="text-lg font-black text-white">أدخل الرقم السري للبطاقة</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          اكتب الرمز السري المتكون من 4 أرقام على لوحة مفاتيح الـ TPE لتفويض خصم مبلغ <span className="text-yellow-500 font-extrabold">{finalTotal} د.ج</span> من رصيدكم.
                        </p>
                        <div className="flex gap-2 justify-center py-1">
                          {[1, 2, 3, 4].map((slot, idx) => (
                            <div
                              key={slot}
                              className={`w-9 h-9 border-2 rounded-xl flex items-center justify-center font-extrabold text-lg transition-all ${
                                pinDigits.length > idx 
                                  ? 'border-yellow-450 bg-yellow-450/10 text-white' 
                                  : 'border-white/10 bg-white/5 text-gray-500'
                              }`}
                            >
                              {pinDigits.length > idx ? '●' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tpeStep === 3 && (
                      <div className="space-y-2 text-center md:text-right">
                        <span className="text-gray-400 text-xs font-bold block">خطوة 3: التحقق</span>
                        <h4 className="text-lg font-black text-white">جاري الاتصال بمركز معالجة البيانات...</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          الرجاء عدم نزع البطاقة البنكية أو فصل الجهاز حتى اكتمال المعاملة وطباعة التذكرة بنجاح.
                        </p>
                      </div>
                    )}

                    {tpeStep === 4 && (
                      <div className="space-y-2">
                        <span className="text-green-400 text-xs font-bold block">تم الدفع بنجاح ✓</span>
                        <h4 className="text-lg font-black text-white">تمت الموافقة على الدفع الإلكتروني</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          تم استلام قيمة الفاتورة بنجاح. سنقوم الآن بتجهيز تذكرة الاستلام الخاصة بك وطلبك في المطبخ مباشرة!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* أزرار الإجراءات للتحكم بالصفحات */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setPhase(3.5)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl transition-colors cursor-pointer border border-white/5"
                >
                  تعديل طريقة الدفع
                </button>
                <button
                  onClick={() => handleCcpSuccess()}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold rounded-2xl transition-colors cursor-pointer border border-white/5 text-xs"
                >
                  تخطي المحاكاة والقبول مباشرة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          المرحلة 5: شاشة طباعة التذكرة (ReceiptScreen)
          ======================================================= */}
      {phase === 5 && (
        <div className="min-h-screen bg-[#141414] py-12 px-6 flex flex-col items-center justify-center animate-fadeIn animate-duration-300 no-print">
          {!isReceiptReady ? (
            // شاشة التحميل والطباعة جارية
            <div className="text-center space-y-6">
              <div className="w-24 h-24 border-4 border-t-red-650 border-r-red-650/30 border-b-red-650/10 border-l-red-650/30 rounded-full animate-spin mx-auto shadow-lg animate-duration-1000"></div>
              <h2 className="text-3xl font-black tracking-wide text-white">شكراً لك! جاري طباعة تذكرتك... 🖨️</h2>
              <p className="text-gray-450 max-w-sm mx-auto leading-relaxed text-sm">
                يرجى الانتظار قليلاً بينما نقوم بتوليد التذكرة الحرارية الخاصة بك وإرسالها للطباعة التلقائية.
              </p>
            </div>
          ) : (
            // عرض التذكرة مع زر العودة للرئيسية
            <div className="w-full max-w-md flex flex-col gap-6 animate-scaleUp">
              <div className="text-center space-y-2 mb-2">
                <span className="text-5xl">🎉</span>
                <h2 className="text-3xl font-black text-white">تم تأكيد طلبك بنجاح!</h2>
                <p className="text-gray-400 text-sm">رقم طلبك المميز هو: <span className="text-yellow-400 font-black">{orderNumber}</span></p>
              </div>

              {/* بطاقة التذكرة الحرارية الظاهرة للمستخدم للتأكيد العيني */}
              <div className="thermal-receipt rounded-2xl p-6 text-black space-y-6 shadow-2xl relative overflow-hidden" id="print-receipt-section">
                {/* رأس التذكرة */}
                <div className="text-center border-b border-black/10 pb-4 space-y-1">
                  <h1 className="text-3xl font-black tracking-widest text-red-600 cairo-font">OMEGA</h1>
                  <p className="text-xs font-bold text-gray-700">تذكرة طلب ذاتي - Kiosk</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">{currentDateTime}</p>
                  <div className="bg-black text-white py-1 px-3 rounded-lg text-sm font-bold inline-block mt-2 tracking-wider">
                    الرقم: {orderNumber}
                  </div>
                </div>

                {/* تفاصيل طريقة التوصيل */}
                <div className="flex justify-between items-center text-xs font-bold bg-gray-100 p-2.5 rounded-lg">
                  <span>نوع الطلب والاستلام:</span>
                  <span>{orderType === 'dine-in' ? 'أكل في المطعم 🍽️' : 'سفري للخارج 🥡'}</span>
                </div>

                {note && (
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-dashed border-gray-300 text-xs">
                    <span className="font-bold block text-gray-600 mb-1">ملاحظة الزبون:</span>
                    <p className="font-medium text-gray-800">{note}</p>
                  </div>
                )}

                {/* قائمة المشتريات المحددة */}
                <div className="space-y-3 py-2 border-b border-black/10">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold border-b border-dashed border-black/10 pb-1.5">
                    <span>المنتج</span>
                    <div className="flex gap-10">
                      <span>الكمية</span>
                      <span>الإجمالي</span>
                    </div>
                  </div>

                  {cartEntries.map((item) => (
                    <div key={item.key} className="flex justify-between items-center text-xs font-bold font-mono">
                      <span className="cairo-font font-black">
                        {item.name}
                      </span>
                      <div className="flex gap-12 text-left">
                        <span>{item.quantity}</span>
                        <span>{item.price * item.quantity} د.ج</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* مجموع الحساب الفعلي */}
                <div className="space-y-2 border-b border-black/10 pb-4 text-xs font-bold font-mono">
                  <div className="flex justify-between">
                    <span className="cairo-font">المجموع الفرعي:</span>
                    <span>{cartTotal} د.ج</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="cairo-font">رسوم التحضير والخدمة:</span>
                    <span>{serviceFee} د.ج</span>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-dashed border-black/10 pt-2 text-red-650">
                    <span className="cairo-font font-black">الإجمالي الكلي:</span>
                    <span>{finalTotal} د.ج</span>
                  </div>
                </div>

                {/* تفاصيل معاملة TPE أو الكاش */}
                <div className="bg-gray-50 p-2.5 rounded-lg text-[9px] font-mono space-y-1 text-gray-600 border border-gray-150">
                  <div className="flex justify-between">
                    <span>طريقة الدفع:</span>
                    <span className="font-bold">{paymentMethod === 'ccp' ? 'بطاقة بنكية / CCP 💳' : 'نقداً عند الصندوق 💵'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>حالة الطلب:</span>
                    <span className={`font-bold ${paymentMethod === 'ccp' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {paymentMethod === 'ccp' ? 'مؤكد ومقبول (إلى المطبخ) ✓' : 'بانتظار الدفع والتأكيد'}
                    </span>
                  </div>
                  {paymentMethod === 'ccp' ? (
                    <div className="flex justify-between">
                      <span>رقم الترخيص:</span>
                      <span>AUTH-84920</span>
                    </div>
                  ) : (
                    <div className="bg-red-50 p-1.5 rounded text-red-700 font-bold text-center text-[8px] leading-snug mt-1 border border-red-200">
                      ⚠️ يرجى التوجه فوراً للكاشير ودفع الفاتورة لتأكيد وتجهيز الطلب.
                    </div>
                  )}
                </div>

                {/* تذييل التذكرة */}
                <div className="text-center space-y-1 pt-2">
                  <p className="text-[11px] font-bold cairo-font">نشكركم على اختياركم مطعم أوميغا ♥</p>
                  <p className="text-[9px] text-gray-500">حضر بكل حب ولذة.</p>
                </div>
              </div>

              {/* أزرار التحكم بالطباعة اليدوية والعودة */}
              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={() => window.print()}
                  className="w-full py-4 bg-[#222] hover:bg-[#2a2a2a] border border-white/10 text-white font-bold rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.82l2.9-2.9m0 0l2.9 2.9m-2.9-2.9v6m4-13.5V9a2.25 2.25 0 00-2.25-2.25h-5.25A2.25 2.25 0 003 9v1.875m9.656 2.244l3 3m0 0l3-3m-3 3V13.5m-3-6h5.25A2.25 2.25 0 0121 9.75v1.875" />
                  </svg>
                  <span>أعد طباعة التذكرة</span>
                </button>

                <button
                  onClick={resetKiosk}
                  className="w-full py-4.5 bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white font-black text-lg rounded-2xl transition-all duration-300 cursor-pointer shadow-lg shadow-red-600/10 flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>طلب جديد (رجوع للرئيسية)</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
