import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// صور افتراضية للمنتجات (تأثير جذاب)
const mockProducts = [
  // برجر
  {
    id: 'b1',
    name: 'أوميغا برجر كلاسيك',
    category: 'burgers',
    price: 550,
    description: 'لحم بقري مشوي مع جبنة شيدر، خس، طماطم وصلصة أوميغا الخاصة.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'b2',
    name: 'برجر دبل تشيز',
    category: 'burgers',
    price: 750,
    description: 'شريحتان من اللحم البقري الصافي، شريحتين جبن، بصل مكرمل وخيار مخلل.',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'b3',
    name: 'كريسبي تشيكن برجر',
    category: 'burgers',
    price: 650,
    description: 'صدر دجاج مقرمش ذهبي مع الملفوف، المايونيز والجبنة اللذيذة.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'b4',
    name: 'أوميغا سوبريم برجر',
    category: 'burgers',
    price: 950,
    description: 'برجر ضخم مع أصابع الجبن المقرمشة، لحم مدخن وصلصة الباربكيو.',
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  // بيتزا
  {
    id: 'p1',
    name: 'بيتزا مارغريتا',
    category: 'pizza',
    price: 600,
    description: 'عجينة نابولية مميزة مع صلصة طماطم إيطالية، جبنة موزاريلا وريحان طازج.',
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p2',
    name: 'بيتزا 4 أجبان',
    category: 'pizza',
    price: 850,
    description: 'مزيج فاخر من جبن الموزاريلا، شيدر، غودا، والجبن الأزرق.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p3',
    name: 'بيتزا دجاج باربكيو',
    category: 'pizza',
    price: 800,
    description: 'شرائح دجاج متبلة، بصل أحمر، فلفل حلو، جبنة موزاريلا وصلصة باربكيو.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p4',
    name: 'بيتزا أوميغا رويال',
    category: 'pizza',
    price: 1100,
    description: 'فواكه البحر المشكلة أو لحم مفروم فخم مع الفطر والزيتون الأسود وصلصة بيضاء.',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  // تاكوس
  {
    id: 't1',
    name: 'تاكوس دجاج كلاسيك',
    category: 'tacos',
    price: 500,
    description: 'خبز التورتيلا الطازج محشو بالدجاج المتبل، البطاطس المقلية وصلصة الجبن السرية.',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 't2',
    name: 'تاكوس لحم مفروم',
    category: 'tacos',
    price: 600,
    description: 'لحم مفروم مطهو مع البهارات المكسيكية، الجبن، والبطاطس المقرمشة.',
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 't3',
    name: 'تاكوس ميكس أوميغا',
    category: 'tacos',
    price: 750,
    description: 'توليفة من الدجاج المشوي، اللحم المفروم، صلصة الجزائرية والجبنة الذائبة.',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 't4',
    name: 'تاكوس جامبو كوردون بلو',
    category: 'tacos',
    price: 900,
    description: 'حجم عملاق محشو بالكوردون بلو، قطع الديك الرومي المدخن، وصلصة الجبن المضاعفة.',
    image: 'https://images.unsplash.com/photo-1624300627498-f027bc310bc3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  // مشروبات
  {
    id: 'd1',
    name: 'كوكا كولا بارد',
    category: 'drinks',
    price: 150,
    description: 'مشروب غازي منعش مع الثلج.',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'd2',
    name: 'عصير ليمون منعش',
    category: 'drinks',
    price: 250,
    description: 'عصير الليمون والنعناع الطازج المحضر يومياً.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'd3',
    name: 'مياه معدنية',
    category: 'drinks',
    price: 80,
    description: 'مياه طبيعية نقية باردة.',
    image: 'https://images.unsplash.com/photo-1608885898957-a599fb18ec3d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'd4',
    name: 'موهيتو أوميغا الخاص',
    category: 'drinks',
    price: 350,
    description: 'مزيج فاخر من الليمون، النعناع، ونكهة التوت البري المنعشة مع الصودا.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  }
];

const categories = [
  { id: 'burgers', name: 'برجر 🍔' },
  { id: 'pizza', name: 'بيتزا 🍕' },
  { id: 'tacos', name: 'تاكوس 🌮' },
  { id: 'drinks', name: 'مشروبات 🥤' }
];

export default function Kiosk() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(1);
  const [orderType, setOrderType] = useState(null); // 'dine-in' or 'takeaway'
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('burgers');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isReceiptReady, setIsReceiptReady] = useState(false);

  // تحديث التاريخ والوقت عند إنشاء الطلب
  useEffect(() => {
    if (phase === 5) {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString('ar-DZ', {
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false
      }));
      // رقم الطلب العشوائي
      const randNum = Math.floor(100 + Math.random() * 900);
      setOrderNumber(`OM-${randNum}`);

      // محاكاة الطباعة بعد ثانيتين
      const timer = setTimeout(() => {
        setIsReceiptReady(true);
        setTimeout(() => {
          window.print();
        }, 300);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [phase]);

  // إضافة للمنتج
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  // إنقاص أو إزالة منتج
  const removeFromCart = (productId) => {
    setCart((prevCart) => {
      const existing = prevCart.find(item => item.id === productId);
      if (existing.quantity === 1) {
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  // حذف نهائي
  const clearProduct = (productId) => {
    setCart((prevCart) => prevCart.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const serviceFee = 50; // رسوم خدمة رمزية بالدينار
  const finalTotal = cartTotal + serviceFee;

  const resetKiosk = () => {
    setCart([]);
    setOrderType(null);
    setSelectedCategory('burgers');
    setIsCartOpen(false);
    setIsReceiptReady(false);
    setPhase(1);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-['Cairo'] relative overflow-x-hidden selection:bg-[#ff6b00] selection:text-white" dir="rtl">
      {/* ستايل مخصص للتأثيرات البصرية وطباعة التذكرة */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');
        
        .cairo-font {
          font-family: 'Cairo', sans-serif;
        }

        /* أنيميشن النبض للزر الترحيبي */
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(255, 107, 0, 0.4);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 40px rgba(255, 107, 0, 0.8);
          }
        }
        .pulse-btn {
          animation: pulse-glow 2s infinite ease-in-out;
        }

        /* خلفية جزيئات تدريجية متحركة */
        .bg-particles {
          background: radial-gradient(circle at 50% 50%, #2c1a12 0%, #1a1a1a 80%);
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
            radial-gradient(circle, #ff6b00 1.5px, transparent 1.5px),
            radial-gradient(circle, #ff9e00 1px, transparent 1px);
          background-size: 80px 80px, 40px 40px;
          background-position: 0 0, 40px 40px;
          opacity: 0.08;
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
      `}</style>

      {/* =======================================================
          المرحلة 1: شاشة الترحيب (WelcomeScreen)
          ======================================================= */}
      {phase === 1 && (
        <div className="absolute inset-0 bg-particles flex flex-col justify-between items-center py-16 px-6 z-10 animate-fadeIn">
          <div className="flex flex-col items-center mt-12 text-center">
            {/* شعار OMEGA */}
            <div className="w-40 h-40 bg-gradient-to-tr from-[#ff6b00] to-[#ff9e00] rounded-full p-2 shadow-2xl flex items-center justify-center mb-8 border-4 border-white/10 hover:rotate-6 transition-transform duration-500">
              <div className="w-full h-full bg-[#1a1a1a] rounded-full flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-[#ff6b00] tracking-wider leading-none">OMEGA</span>
                <span className="text-xs text-gray-400 font-semibold mt-1 tracking-widest">KIOSK</span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
              مرحباً بك في <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b00] to-[#ff9e00]">OMEGA</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-light max-w-lg leading-relaxed">
              الطعم الذي تعشقه بلمسة زر واحدة. اختر، ادفع، واستمتع بوجبتك الساخنة!
            </p>
          </div>

          <button
            onClick={() => setPhase(2)}
            className="pulse-btn w-64 h-64 rounded-full bg-gradient-to-tr from-[#ff6b00] to-[#ff9e00] hover:from-[#ff7c1a] hover:to-[#ffaa1a] flex flex-col items-center justify-center text-white font-extrabold text-3xl shadow-[0_0_30px_rgba(255,107,0,0.5)] transition-all duration-300 transform active:scale-95 cursor-pointer select-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-14 h-14 mb-2 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-6-6m6 6V9a9 9 0 0118 0v12" />
            </svg>
            <span>اضغط للبدء</span>
            <span className="text-sm font-medium text-white/80 mt-1">ابدأ طلبك الآن</span>
          </button>

          <div className="text-gray-500 text-sm font-medium tracking-wide">
            شاشة طلب ذاتي ذكية وآمنة 100%
          </div>
        </div>
      )}

      {/* =======================================================
          المرحلة 2: اختيار طريقة الاستلام (OrderTypeScreen)
          ======================================================= */}
      {phase === 2 && (
        <div className="absolute inset-0 bg-[#141414] flex flex-col z-10 animate-fadeIn">
          {/* شريط علوي بسيط للعودة */}
          <div className="p-6 flex justify-between items-center border-b border-white/5 bg-[#1a1a1a]">
            <button 
              onClick={() => setPhase(1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <span>رجوع</span>
            </button>
            <span className="text-xl font-bold text-gray-200">خطوة 1 من 4</span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16 tracking-tight">
              أين ترغب في تناول وجبتك؟ 🍽️
            </h2>

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 flex-1 max-h-[500px]">
              {/* خيار: أكل هنا */}
              <button
                onClick={() => {
                  setOrderType('dine-in');
                  setPhase(3);
                }}
                className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] border-2 border-white/5 hover:border-[#ff6b00] hover:shadow-[0_0_50px_rgba(255,107,0,0.15)] flex flex-col justify-center items-center p-8 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer text-center"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6b00]/5 rounded-bl-full group-hover:bg-[#ff6b00]/10 transition-colors"></div>
                <div className="w-32 h-32 bg-[#ff6b00]/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <span className="text-7xl group-hover:animate-bounce">🍽️</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-3">أكل في المطعم</h3>
                <p className="text-gray-400 text-lg max-w-xs">
                  استمتع بوجبتك الساخنة طازجة داخل صالة الطعام المريحة لدينا.
                </p>
                <span className="mt-8 px-6 py-2.5 rounded-full bg-white/5 text-[#ff6b00] font-bold group-hover:bg-[#ff6b00] group-hover:text-white transition-all duration-300">
                  اختيار الخدمة
                </span>
              </button>

              {/* خيار: يـؤخذ معه */}
              <button
                onClick={() => {
                  setOrderType('takeaway');
                  setPhase(3);
                }}
                className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] border-2 border-white/5 hover:border-teal-500 hover:shadow-[0_0_50px_rgba(20,184,166,0.15)] flex flex-col justify-center items-center p-8 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer text-center"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-bl-full group-hover:bg-teal-500/10 transition-colors"></div>
                <div className="w-32 h-32 bg-teal-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <span className="text-7xl group-hover:animate-bounce">🥡</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-3">سفري / للمنزل</h3>
                <p className="text-gray-400 text-lg max-w-xs">
                  سنقوم بتغليف وجبتك بشكل محكم ومثالي لتأخذها معك أينما تشاء.
                </p>
                <span className="mt-8 px-6 py-2.5 rounded-full bg-white/5 text-teal-400 font-bold group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                  اختيار الخدمة
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          المرحلة 3: اختيار المنتجات (MenuScreen)
          ======================================================= */}
      {phase === 3 && (
        <div className="min-h-screen flex flex-col bg-[#141414] pb-32 animate-fadeIn">
          {/* الهيدر العلوي */}
          <header className="sticky top-0 z-20 bg-[#1a1a1a]/95 backdrop-blur border-b border-white/5 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPhase(2)}
                className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  قائمة المأكولات
                  <span className="px-3 py-1 bg-[#ff6b00]/10 text-[#ff6b00] rounded-full text-xs font-bold">
                    {orderType === 'dine-in' ? 'داخلي 🍽️' : 'سفري 🥡'}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">اختر وجبتك المفضلة وسنقوم بإعدادها فوراً</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* شعار المطعم صغير */}
              <div className="text-left hidden md:block">
                <span className="block text-lg font-black text-[#ff6b00] tracking-wider">OMEGA</span>
                <span className="block text-[10px] text-gray-500 font-semibold tracking-widest uppercase">Self-Service</span>
              </div>
              <div className="w-12 h-12 bg-gradient-to-tr from-[#ff6b00] to-[#ff9e00] rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">
                Ω
              </div>
            </div>
          </header>

          {/* تبويبات الفئات الأفقية */}
          <div className="sticky top-[81px] z-10 bg-[#161616] border-b border-white/5 py-4 px-6 overflow-x-auto scrollbar-none">
            <div className="max-w-5xl mx-auto flex gap-4 min-w-max">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-8 py-3.5 rounded-2xl text-lg font-bold transition-all duration-300 cursor-pointer flex items-center gap-3 ${
                      isActive 
                        ? 'bg-[#ff6b00] text-white shadow-[0_4px_20px_rgba(255,107,0,0.3)] scale-105' 
                        : 'bg-[#222] text-gray-300 hover:bg-[#2a2a2a] hover:text-white'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* شبكة المنتجات */}
          <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockProducts
                .filter(p => p.category === selectedCategory)
                .map((product) => {
                  const cartItem = cart.find(item => item.id === product.id);
                  const count = cartItem ? cartItem.quantity : 0;
                  
                  return (
                    <div 
                      key={product.id}
                      className="bg-[#1e1e1e] rounded-3xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col group shadow-lg hover:shadow-xl"
                    >
                      {/* صورة المنتج */}
                      <div className="relative h-44 overflow-hidden bg-zinc-900">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {count > 0 && (
                          <div className="absolute top-3 right-3 bg-[#ff6b00] text-white font-extrabold text-sm w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-[#1e1e1e] animate-pulse">
                            {count}
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-[#111]/90 backdrop-blur-md px-3 py-1.5 rounded-xl font-black text-sm text-[#ff6b00]">
                          {product.price} د.ج
                        </div>
                      </div>

                      {/* تفاصيل المنتج */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-[#ff6b00] transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        </div>

                        {/* أزرار الإضافة والتحكم بالكمية */}
                        <div className="mt-5 pt-4 border-t border-white/5">
                          {count === 0 ? (
                            <button
                              onClick={() => addToCart(product)}
                              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff9e00] hover:from-[#ff7c1a] hover:to-[#ffaa1a] text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              <span>إضافة للسلة</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between gap-2 bg-[#2a2a2a] p-1 rounded-xl">
                              <button
                                onClick={() => removeFromCart(product.id)}
                                className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center font-bold text-lg cursor-pointer text-gray-300 hover:text-white"
                              >
                                {count === 1 ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                ) : (
                                  <span>-</span>
                                )}
                              </button>
                              <span className="font-extrabold text-base text-white">{count}</span>
                              <button
                                onClick={() => addToCart(product)}
                                className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center font-bold text-lg cursor-pointer text-gray-300 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </main>

          {/* السلة العائمة بالأسفل */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#111] via-[#1a1a1a] to-transparent pt-8 pb-6 px-6 z-20">
              <div className="max-w-4xl mx-auto bg-[#222]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-15px_40px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#ff6b00]/10 border border-[#ff6b00]/20 rounded-2xl flex items-center justify-center text-2xl relative">
                    🛒
                    <span className="absolute -top-2 -left-2 bg-[#ff6b00] text-white font-extrabold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      {cartItemCount}
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm font-medium">سلة طلباتك الحالية</div>
                    <div className="text-2xl font-black text-[#ff6b00] mt-0.5">
                      المجموع: {cartTotal} د.ج
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  {/* عرض السلة كقائمة منبثقة */}
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex-1 md:flex-none px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border border-white/5"
                  >
                    <span>تفاصيل السلة</span>
                  </button>

                  {/* تأكيد الطلب */}
                  <button
                    onClick={() => setPhase(4)}
                    className="flex-[2] md:flex-none px-10 py-4 rounded-2xl bg-gradient-to-r from-[#ff6b00] to-[#ff9e00] hover:from-[#ff7c1a] hover:to-[#ffaa1a] text-white font-black text-lg tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shadow-[0_4px_25px_rgba(255,107,0,0.4)] active:scale-95"
                  >
                    <span>تأكيد الطلب والدفع</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* نافذة تفاصيل السلة المنبثقة (Modal) */}
          {isCartOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
                {/* رأس النافذة */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#222]">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <span>تفاصيل سلة المشتريات</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-xs text-[#ff6b00] font-bold rounded-md">{cartItemCount} عناصر</span>
                  </h3>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* قائمة العناصر */}
                <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-[#282828]/50 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl bg-zinc-900" />
                        <div>
                          <h4 className="font-bold text-white leading-tight">{item.name}</h4>
                          <span className="text-xs text-gray-400 mt-1 block">سعر الوحدة: {item.price} د.ج</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5 bg-zinc-800 p-1 rounded-lg">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 rounded bg-zinc-700 hover:bg-[#ff6b00]/10 hover:text-[#ff6b00] flex items-center justify-center font-bold text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => clearProduct(item.id)}
                          className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="حذف الكل"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ملخص السلة */}
                <div className="p-6 bg-[#222] border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-gray-400 text-sm font-semibold">
                    <span>مجموع المنتجات:</span>
                    <span className="text-white">{cartTotal} د.ج</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400 text-sm font-semibold">
                    <span>رسوم الخدمة والتحضير:</span>
                    <span className="text-white">{serviceFee} د.ج</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <span className="text-base font-black">المجموع النهائي:</span>
                    <span className="text-2xl font-black text-[#ff6b00]">{finalTotal} د.ج</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setPhase(4);
                    }}
                    className="w-full py-4 bg-[#ff6b00] hover:bg-[#ff7c1a] text-white font-black text-base rounded-2xl transition-all duration-300 cursor-pointer shadow-lg shadow-[#ff6b00]/20 flex items-center justify-center gap-2"
                  >
                    <span>متابعة الدفع</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =======================================================
          المرحلة 4: شاشة الدفع (PaymentScreen)
          ======================================================= */}
      {phase === 4 && (
        <div className="min-h-screen bg-[#141414] py-12 px-6 flex flex-col items-center justify-center animate-fadeIn">
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* جهة اليمين: ملخص الطلب والمنتجات */}
            <div className="lg:col-span-5 bg-[#1e1e1e] border border-white/5 rounded-3xl p-6 space-y-6">
              <h3 className="text-xl font-black border-b border-white/5 pb-3">ملخص طلبك</h3>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#ff6b00]">{item.quantity}x</span>
                      <span className="text-gray-300 font-semibold">{item.name}</span>
                    </div>
                    <span className="font-bold text-white">{item.price * item.quantity} د.ج</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>نوع الاستلام</span>
                  <span className="font-bold text-white">{orderType === 'dine-in' ? 'أكل في الصالة 🍽️' : 'سفري للأخذ 🥡'}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>رسوم الخدمة</span>
                  <span className="font-bold text-white">{serviceFee} د.ج</span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-white/5 pt-3">
                  <span>المبلغ الإجمالي</span>
                  <span className="text-xl text-[#ff6b00]">{finalTotal} د.ج</span>
                </div>
              </div>

              <button 
                onClick={() => setPhase(3)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl text-sm border border-white/5 transition-colors cursor-pointer"
              >
                تعديل الطلب السلة
              </button>
            </div>

            {/* جهة اليسار: بطاقة الدفع CCP */}
            <div className="lg:col-span-7 bg-[#1e1e1e] border-2 border-[#ff6b00]/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
              {/* شعار CCP بالخلفية كشكل جمالي */}
              <div className="absolute -top-10 -left-10 w-44 h-44 bg-[#ff6b00]/5 rounded-full pointer-events-none"></div>

              <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="p-1 bg-[#ff6b00]/10 rounded-lg text-lg">💳</span>
                    الدفع الإلكتروني عبر CCP
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">امسح رمز الاستجابة السريع للتحويل الفوري عبر بريد الجزائر</p>
                </div>
                {/* شعار CCP بريد الجزائر المرسوم */}
                <div className="bg-[#ff6b00] text-white font-extrabold px-4 py-2 rounded-xl text-xs flex flex-col items-center leading-none shadow-md">
                  <span className="tracking-widest font-black">ALGERIE</span>
                  <span className="text-[9px] mt-0.5 opacity-90">POSTE / CCP</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 bg-[#141414] p-6 rounded-2xl border border-white/5">
                {/* الرمز QR Code المرسوم يدوياً بـ SVG */}
                <div className="bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg w-40 h-40 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full text-black">
                    {/* الحدود الخارجية */}
                    <rect x="5" y="5" width="20" height="20" fill="currentColor" />
                    <rect x="8" y="8" width="14" height="14" fill="white" />
                    <rect x="11" y="11" width="8" height="8" fill="currentColor" />

                    <rect x="75" y="5" width="20" height="20" fill="currentColor" />
                    <rect x="78" y="8" width="14" height="14" fill="white" />
                    <rect x="81" y="11" width="8" height="8" fill="currentColor" />

                    <rect x="5" y="75" width="20" height="20" fill="currentColor" />
                    <rect x="8" y="78" width="14" height="14" fill="white" />
                    <rect x="11" y="81" width="8" height="8" fill="currentColor" />

                    {/* بيانات وهمية عشوائية QR */}
                    <rect x="35" y="5" width="6" height="12" fill="currentColor" />
                    <rect x="50" y="8" width="8" height="6" fill="currentColor" />
                    <rect x="62" y="5" width="4" height="15" fill="currentColor" />

                    <rect x="35" y="35" width="10" height="10" fill="currentColor" />
                    <rect x="55" y="30" width="12" height="6" fill="currentColor" />
                    <rect x="75" y="35" width="15" height="12" fill="currentColor" />

                    <rect x="35" y="60" width="8" height="14" fill="currentColor" />
                    <rect x="50" y="55" width="18" height="8" fill="currentColor" />
                    <rect x="75" y="60" width="8" height="20" fill="currentColor" />

                    <rect x="35" y="80" width="25" height="8" fill="currentColor" />
                    <rect x="65" y="85" width="6" height="8" fill="currentColor" />

                    <circle cx="50" cy="50" r="4" fill="#ff6b00" />
                  </svg>
                </div>

                <div className="flex-1 space-y-4 text-center md:text-right">
                  <div>
                    <span className="text-gray-400 text-xs font-semibold">رقم الحساب الجاري (CCP)</span>
                    <div className="text-2xl font-black text-white tracking-widest mt-1 bg-[#1e1e1e] border border-white/5 py-2 px-4 rounded-xl flex items-center justify-between">
                      <span className="text-[#ff6b00]">0079999902 / 38</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText('0079999902')}
                        className="text-xs font-bold text-gray-400 hover:text-white bg-white/5 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        نسخ
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 text-xs font-semibold">مفتاح الحساب (Clef)</span>
                    <div className="text-lg font-black text-gray-200 mt-0.5">38</div>
                  </div>

                  <div className="text-xs text-[#ff6b00] font-semibold bg-[#ff6b00]/5 p-3 rounded-xl border border-[#ff6b00]/10 leading-relaxed">
                    💡 يرجى مسح رمز الـ QR أو إرسال المبلغ الكلي المقدر بـ <span className="font-bold underline">{finalTotal} د.ج</span> للحساب المذكور أعلاه لتأكيد طلبك.
                  </div>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setPhase(3)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl transition-colors cursor-pointer border border-white/5"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPhase(5)}
                  className="flex-[2] py-4 bg-gradient-to-r from-[#ff6b00] to-[#ff9e00] hover:from-[#ff7c1a] hover:to-[#ffaa1a] text-white font-black text-lg rounded-2xl transition-all duration-300 cursor-pointer shadow-lg shadow-[#ff6b00]/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>تأكيد الدفع وطباعة التذكرة</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.82l2.9-2.9m0 0l2.9 2.9m-2.9-2.9v6m4-13.5V9a2.25 2.25 0 00-2.25-2.25h-5.25A2.25 2.25 0 003 9v1.875m9.656 2.244l3 3m0 0l3-3m-3 3V13.5m-3-6h5.25A2.25 2.25 0 0121 9.75v1.875" />
                  </svg>
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
        <div className="min-h-screen bg-[#141414] py-12 px-6 flex flex-col items-center justify-center animate-fadeIn no-print">
          {!isReceiptReady ? (
            // شاشة التحميل والطباعة جارية
            <div className="text-center space-y-6">
              <div className="w-24 h-24 border-4 border-t-[#ff6b00] border-r-[#ff6b00]/30 border-b-[#ff6b00]/10 border-l-[#ff6b00]/30 rounded-full animate-spin mx-auto shadow-lg"></div>
              <h2 className="text-3xl font-black tracking-wide">شكراً لك! جاري طباعة تذكرتك... 🖨️</h2>
              <p className="text-gray-400 max-w-sm mx-auto leading-relaxed text-sm">
                يرجى الانتظار قليلاً بينما نقوم بتوليد التذكرة الحرارية الخاصة بك وإرسالها للطباعة التلقائية.
              </p>
            </div>
          ) : (
            // عرض التذكرة مع زر العودة للرئيسية
            <div className="w-full max-w-md flex flex-col gap-6 animate-scaleUp">
              <div className="text-center space-y-2 mb-2">
                <span className="text-5xl">🎉</span>
                <h2 className="text-3xl font-black text-white">تم تأكيد طلبك بنجاح!</h2>
                <p className="text-gray-400 text-sm">رقم طلبك المميز هو: <span className="text-[#ff6b00] font-black">{orderNumber}</span></p>
              </div>

              {/* بطاقة التذكرة الحرارية الظاهرة للمستخدم للتأكيد العيني */}
              <div className="thermal-receipt rounded-2xl p-6 text-black space-y-6 shadow-2xl relative overflow-hidden" id="print-receipt-section">
                {/* رأس التذكرة */}
                <div className="text-center border-b border-black/10 pb-4 space-y-1">
                  <h1 className="text-3xl font-black tracking-widest text-[#ff6b00] cairo-font">OMEGA</h1>
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

                {/* قائمة المشتريات المحددة */}
                <div className="space-y-3 py-2 border-b border-black/10">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold border-b border-dashed border-black/10 pb-1.5">
                    <span>المنتج</span>
                    <div className="flex gap-10">
                      <span>الكمية</span>
                      <span>الإجمالي</span>
                    </div>
                  </div>

                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs font-bold font-mono">
                      <span className="cairo-font font-black">{item.name}</span>
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
                  <div className="flex justify-between text-base font-black border-t border-dashed border-black/10 pt-2 text-[#ff6b00]">
                    <span className="cairo-font font-black">الإجمالي الكلي:</span>
                    <span>{finalTotal} د.ج</span>
                  </div>
                </div>

                {/* تذييل التذكرة */}
                <div className="text-center space-y-1">
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
                  className="w-full py-4.5 bg-gradient-to-r from-[#ff6b00] to-[#ff9e00] hover:from-[#ff7c1a] hover:to-[#ffaa1a] text-white font-black text-lg rounded-2xl transition-all duration-300 cursor-pointer shadow-lg shadow-[#ff6b00]/10 flex items-center justify-center gap-2 active:scale-95"
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
