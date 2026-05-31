import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoAdd,
  IoArrowDown,
  IoArrowForward,
  IoBagHandleOutline,
  IoCardOutline,
  IoCartOutline,
  IoCashOutline,
  IoCheckmarkOutline,
  IoFastFoodOutline,
  IoFlashOutline,
  IoHeadsetOutline,
  IoHomeOutline,
  IoLockClosedOutline,
  IoPizzaOutline,
  IoPrintOutline,
  IoReceiptOutline,
  IoReloadOutline,
  IoRemove,
  IoRestaurantOutline,
  IoShieldCheckmarkOutline,
  IoStarOutline,
  IoStorefrontOutline,
  IoTimeOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { getAllProducts } from '../services/productService';
import TransparentImg from '../components/TransparentImg';
import TapTransition from '../components/TapTransition';
import { createOrder, createAdminOrder, getOrder } from '../services/orderService';
import { chargeTpePayment } from '../services/tpePaymentService';

const CAT_META = {
  all: { label: 'الكل', icon: IoFastFoodOutline },
  pizza: { label: 'بيتزا', icon: IoPizzaOutline },
  burger: { label: 'برغر', icon: IoFastFoodOutline },
  tacos: { label: 'تاكوس', icon: IoFastFoodOutline },
  drinks: { label: 'مشروبات', icon: IoFastFoodOutline },
  desserts: { label: 'حلويات', icon: IoStarOutline },
  appetizers: { label: 'مقبلات', icon: IoFastFoodOutline },
  sofli: { label: 'سوفلي', icon: IoFastFoodOutline },
  box: { label: 'بوكس', icon: IoBagHandleOutline },
};

function fallbackImg(cat) {
  return {
    burger: '/burger-classic.png',
    pizza: '/pizza-pepperoni.png',
    tacos: '/tacos-wrap.png',
    drinks: '/drink-cola.png',
    appetizers: '/fried-chicken.png',
    desserts: '/appetizer-gratin.png',
    sofli: '/sofli.png',
    box: '/burger-classic.png',
  }[cat] || '/pizza-pepperoni.png';
}

function money(amount) {
  return `${Number(amount || 0).toLocaleString('ar-DZ')} دج`;
}

function getStepLabel(phase) {
  if (phase === 2) return 'خطوة 1 من 4';
  if (phase === 3) return 'اختيار الوجبة';
  if (phase === 3.25) return 'خطوة 3 من 4';
  if (phase === 3.5) return 'خطوة 2 من 4';
  if (phase === 4) return 'خطوة 4 من 4';
  if (phase === 5) return 'تم الطلب';
  return '';
}

function KioskLogo({ large = false }) {
  return (
    <div className={`kiosk-logo ${large ? 'kiosk-logo-large' : ''}`}>
      <img src="/logo.png?v=2" alt="OMEGA Pizza" />
    </div>
  );
}

function StatusBar() {
  return (
    <div className="kiosk-statusbar" aria-hidden="true">
      <span>9:41</span>
      <span className="kiosk-status-icons">▮▮▮  Wi-Fi  ▱</span>
    </div>
  );
}

function KioskDecor() {
  return (
    <div className="kiosk-decor" aria-hidden="true">
      <span className="kiosk-tomato kiosk-tomato-a" />
      <span className="kiosk-tomato kiosk-tomato-b" />
      <span className="kiosk-tomato kiosk-tomato-c" />
      <span className="kiosk-leaf kiosk-leaf-a" />
      <span className="kiosk-leaf kiosk-leaf-b" />
      <span className="kiosk-leaf kiosk-leaf-c" />
      <span className="kiosk-bokeh kiosk-bokeh-a" />
      <span className="kiosk-bokeh kiosk-bokeh-b" />
      <span className="kiosk-bokeh kiosk-bokeh-c" />
    </div>
  );
}

function KioskShell({ children, phase, onBack, showStatus = false, wide = false, className = '' }) {
  const showTopBar = phase !== 1;

  return (
    <div className={`kiosk-v2 ${className}`} dir="rtl">
      <KioskDecor />
      <main className="kiosk-stage">
        <section className={`kiosk-phone ${wide ? 'kiosk-phone-wide' : ''}`}>
          {showStatus && <StatusBar />}
          {showTopBar && (
            <div className="kiosk-topbar">
              <button type="button" className="kiosk-back-btn" onClick={onBack}>
                <IoArrowForward aria-hidden="true" />
                <span>رجوع</span>
              </button>
              <span className="kiosk-step-pill">{getStepLabel(phase)}</span>
            </div>
          )}
          {children}
        </section>
      </main>
    </div>
  );
}

function ScreenHeader({ title, redWord, subtitle, icon, compact = false }) {
  const Icon = icon;

  return (
    <header className={`kiosk-screen-head ${compact ? 'compact' : ''}`}>
      <KioskLogo />
      <h1 className="kiosk-screen-title">
        {title}
        {redWord && <strong>{redWord}</strong>}
      </h1>
      {subtitle && <p className="kiosk-screen-subtitle">{subtitle}</p>}
      {Icon && (
        <span className="kiosk-title-icon" aria-hidden="true">
          <Icon />
        </span>
      )}
    </header>
  );
}

function PrimaryButton({ children, onClick, disabled = false, variant = 'red', icon, type = 'button', className = '' }) {
  const Icon = icon;

  return (
    <button
      type={type}
      className={`kiosk-main-btn ${variant === 'gold' ? 'gold' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function TrustFooter({ text = 'شاشة دفع آمنة بالكامل' }) {
  return (
    <div className="kiosk-trust-line">
      <IoShieldCheckmarkOutline aria-hidden="true" />
      <span><strong>100%</strong> {text}</span>
    </div>
  );
}

function FeatureStrip() {
  return (
    <div className="kiosk-feature-strip">
      <div>
        <IoHeadsetOutline aria-hidden="true" />
        <strong>دعم دائم</strong>
        <span>نحن معك</span>
      </div>
      <div>
        <IoFlashOutline aria-hidden="true" />
        <strong>تحضير سريع</strong>
        <span>جاهز لك</span>
      </div>
      <div>
        <IoStarOutline aria-hidden="true" />
        <strong>جودة عالية</strong>
        <span>مضمونة</span>
      </div>
    </div>
  );
}

function OptionCard({ icon, title, description, button, onClick, tone = 'red', disabled = false }) {
  const Icon = icon;

  return (
    <article className="kiosk-option-card">
      <div className="kiosk-icon-orb">
        <Icon aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <PrimaryButton onClick={onClick} disabled={disabled} variant={tone}>
        {button}
      </PrimaryButton>
    </article>
  );
}

function ProductImage({ product }) {
  const src = product.image || fallbackImg(product.category);
  const fallback = <img src={fallbackImg(product.category)} alt="" className="kiosk-product-img" />;

  return (
    <TransparentImg
      src={src}
      fallback={fallback}
      alt={product.name}
      className="kiosk-product-img"
    />
  );
}

function ReceiptForPrint({ orderNumber, currentDateTime, orderType, note, cartEntries, cartTotal, serviceFee, finalTotal, paymentMethod, paymentReceipt }) {
  return (
    <div id="print-receipt-section" className="kiosk-print-receipt" dir="rtl">
      <div className="receipt-head">
        <h1>OMEGA PIZZA</h1>
        <p>تذكرة طلب ذاتي</p>
        <strong>رقم الطلب: {orderNumber}</strong>
        <span>{currentDateTime}</span>
      </div>

      <div className="receipt-row">
        <span>نوع الطلب</span>
        <strong>{orderType === 'dine-in' ? 'أكل في المطعم' : 'سفري / للمنزل'}</strong>
      </div>

      {note && (
        <div className="receipt-note">
          <strong>ملاحظة الزبون</strong>
          <p>{note}</p>
        </div>
      )}

      <div className="receipt-items">
        {cartEntries.map((item) => (
          <div className="receipt-row" key={item.key}>
            <span>{item.name} x{item.quantity}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
      </div>

      <div className="receipt-total">
        <div className="receipt-row">
          <span>المجموع الفرعي</span>
          <strong>{money(cartTotal)}</strong>
        </div>
        <div className="receipt-row">
          <span>رسوم التحضير والخدمة</span>
          <strong>{money(serviceFee)}</strong>
        </div>
        <div className="receipt-row grand">
          <span>الإجمالي</span>
          <strong>{money(finalTotal)}</strong>
        </div>
      </div>

      <div className="receipt-pay">
        <span>طريقة الدفع: {paymentMethod === 'ccp' ? 'بطاقة / TPE' : 'نقداً'}</span>
        {paymentMethod === 'ccp' && (
          <span>المرجع: {paymentReceipt?.authorizationCode || paymentReceipt?.transactionId || paymentReceipt?.reference || 'TPE-OK'}</span>
        )}
      </div>

      <p className="receipt-thanks">شكراً لاختياركم OMEGA</p>
    </div>
  );
}

export default function Kiosk() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(1);
  const [orderType, setOrderType] = useState(null);
  const [note, setNote] = useState('');
  const [tpeStep, setTpeStep] = useState(1);
  const [orderNumber, setOrderNumber] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isReceiptReady, setIsReceiptReady] = useState(false);
  const [insertingCard, setInsertingCard] = useState(false);
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [pinError, setPinError] = useState('');
  const [shakeActive, setShakeActive] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState({});
  const [activeCat, setActiveCat] = useState('all');
  const [activeSize, setActiveSize] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [showStartTransition, setShowStartTransition] = useState(false);

  useEffect(() => {
    getAllProducts()
      .then((firebaseProducts) => setAllProducts(firebaseProducts))
      .catch((err) => {
        console.error('فشل تحميل المنتجات في الكيوسك:', err);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (phase !== 5) return undefined;

    const now = new Date();
    setCurrentDateTime(now.toLocaleString('ar-DZ', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
    }));

    if (!orderNumber) {
      setOrderNumber(`OM-${Math.floor(100 + Math.random() * 900)}`);
    }

    const timer = setTimeout(() => {
      setIsReceiptReady(true);
      setTimeout(() => window.print(), 300);
    }, 1400);

    return () => clearTimeout(timer);
  }, [phase, orderNumber]);

  useEffect(() => {
    if (phase === 4) {
      setTpeStep(1);
      setPinError('');
      setInsertingCard(false);
      setTerminalBusy(false);
      setPaymentReceipt(null);
    }
  }, [phase]);

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );

  const existingCats = useMemo(() => {
    const cats = Object.keys(CAT_META).filter((cat) => (
      cat === 'all' || availableProducts.some((product) => product.category === cat)
    ));
    return cats.length ? cats : ['all'];
  }, [availableProducts]);

  const availableSizes = useMemo(() => {
    const sizes = new Set();
    availableProducts.forEach((product) => {
      if (product.hasSizes && Array.isArray(product.sizes)) {
        product.sizes.forEach((size) => {
          if (size?.label) sizes.add(size.label);
        });
      }
    });
    return ['all', ...sizes];
  }, [availableProducts]);

  const filteredProducts = useMemo(() => availableProducts.filter((product) => {
    if (activeCat !== 'all' && product.category !== activeCat) return false;
    if (activeSize === 'all') return true;
    return product.hasSizes && product.sizes?.some((size) => size.label === activeSize);
  }), [availableProducts, activeCat, activeSize]);

  const cartEntries = useMemo(() => Object.entries(cart).map(([key, entry]) => {
    const product = allProducts.find((item) => item.id === entry.productId);
    if (!product) return null;
    const price = entry.sizePrice !== undefined ? Number(entry.sizePrice) : Number(product.price || 0);
    const label = entry.sizeLabel ? ` (${entry.sizeLabel})` : '';

    return {
      key,
      product,
      quantity: entry.qty,
      price,
      label,
      name: `${product.name}${label}`,
      selectedSize: entry.sizeLabel || null,
    };
  }).filter(Boolean), [allProducts, cart]);

  const cartTotal = cartEntries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
  const cartItemCount = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const serviceFee = 50;
  const finalTotal = cartTotal + serviceFee;

  const addItem = (id, sizeLabel, sizePrice) => {
    if (sizeLabel !== undefined) {
      const key = `${id}__${sizeLabel}`;
      setCart((current) => ({
        ...current,
        [key]: {
          qty: (current[key]?.qty || 0) + 1,
          productId: id,
          sizeLabel,
          sizePrice,
        },
      }));
      return;
    }

    setCart((current) => ({
      ...current,
      [id]: {
        qty: (current[id]?.qty || 0) + 1,
        productId: id,
      },
    }));
  };

  const addCartEntry = (entry) => {
    if (entry.selectedSize) {
      addItem(entry.product.id, entry.selectedSize, entry.price);
    } else {
      addItem(entry.product.id);
    }
  };

  const removeItem = (key) => {
    setCart((current) => {
      const next = { ...current };
      if (next[key]?.qty > 1) {
        next[key] = { ...next[key], qty: next[key].qty - 1 };
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const clearOrder = () => {
    setCart({});
    setNote('');
    setPaymentMethod(null);
    setPaymentReceipt(null);
    setPinError('');
  };

  const resetKiosk = () => {
    setCart({});
    setOrderType(null);
    setActiveCat('all');
    setActiveSize('all');
    setNote('');
    setIsReceiptReady(false);
    setPaymentMethod(null);
    setPaymentReceipt(null);
    setTerminalBusy(false);
    setPinError('');
    setOrderNumber('');
    setCurrentDateTime('');
    setTpeStep(1);
    setPhase(1);
  };

  const goBack = () => {
    if (terminalBusy || submittingOrder) return;
    if (phase === 2) setPhase(1);
    else if (phase === 3) setPhase(2);
    else if (phase === 3.25) setPhase(3);
    else if (phase === 3.5) setPhase(3.25);
    else if (phase === 4) setPhase(3.5);
    else if (phase === 5) resetKiosk();
    else navigate('/');
  };

  const startWelcomeTransition = () => {
    if (showStartTransition) return;
    setShowStartTransition(true);
  };

  const completeWelcomeTransition = () => {
    setShowStartTransition(false);
    setPhase(2);
  };

  const startService = (type) => {
    setOrderType(type);
    setPhase(3);
  };

  const goToSummary = () => {
    if (!cartItemCount) return;
    setPhase(3.25);
  };

  const createOrderItems = () => cartEntries.map((entry) => {
    const item = {
      productId: entry.product.id,
      name: entry.product.name,
      price: Number(entry.price),
      quantity: entry.quantity,
      costPrice: Number(entry.product.costPrice || 0),
      image: entry.product.image || '',
      category: entry.product.category || '',
    };

    if (entry.selectedSize) {
      item.selectedSize = entry.selectedSize;
    }

    return item;
  });

  const handleCcpSuccess = async (payment = paymentReceipt) => {
    if (!cartEntries.length) return;
    setSubmittingOrder(true);

    try {
      const orderData = {
        items: createOrderItems(),
        orderType: orderType === 'dine-in' ? 'table' : 'delivery',
        tableNumber: orderType === 'dine-in' ? 'كشك الطلب الذاتي' : '',
        paymentMethod: 'ccp',
        paymentStatus: 'paid',
        paymentReference: payment?.transactionId || payment?.reference || '',
        authorizationCode: payment?.authorizationCode || '',
        paymentProvider: payment?.provider || 'tpe',
        note: note || '',
        customerName: 'زبون الكشك',
        deliveryFee: 0,
        serviceFee,
        status: 'preparing',
      };

      const orderId = await createAdminOrder(orderData);
      const createdDoc = await getOrder(orderId);
      setOrderNumber(createdDoc ? String(createdDoc.orderNumber) : 'OM-00');
      setIsReceiptReady(false);
      setPhase(5);
    } catch (err) {
      console.error('فشل إرسال طلب البطاقة للمطبخ:', err);
      alert('حدث خطأ أثناء معالجة الدفع، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCashSuccess = async () => {
    if (!cartEntries.length) return;
    setSubmittingOrder(true);
    setPaymentMethod('cash');

    try {
      const orderData = {
        items: createOrderItems(),
        orderType: orderType === 'dine-in' ? 'table' : 'delivery',
        tableNumber: orderType === 'dine-in' ? 'كشك الطلب الذاتي' : '',
        paymentMethod: 'cash',
        note: note || '',
        customerName: 'زبون الكشك',
        deliveryFee: 0,
        serviceFee,
        status: 'pending',
      };

      const orderId = await createOrder(orderData);
      const createdDoc = await getOrder(orderId);
      setOrderNumber(createdDoc ? String(createdDoc.orderNumber) : 'OM-00');
      setIsReceiptReady(false);
      setPhase(5);
    } catch (err) {
      console.error('فشل إرسال طلب الكاش للإدارة:', err);
      alert('حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const startTpeCharge = async () => {
    if (terminalBusy || submittingOrder || !cartEntries.length) return;

    setTerminalBusy(true);
    setPinError('');
    setTpeStep(3);

    try {
      const payment = await chargeTpePayment({
        amount: finalTotal,
        currency: 'DZD',
        reference: `omega-kiosk-${Date.now()}`,
        items: cartEntries.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          amount: item.price * item.quantity,
        })),
        metadata: {
          orderType,
          cartItemCount,
        },
      });

      setPaymentReceipt(payment);
      setPaymentMethod('ccp');
      setTpeStep(4);
      setTimeout(() => handleCcpSuccess(payment), 1000);
    } catch (err) {
      setPinError(err.message || 'رفض جهاز الدفع العملية أو تعذر الاتصال به.');
      setTpeStep(2);
      setShakeActive(true);
      setTimeout(() => setShakeActive(false), 500);
    } finally {
      setTerminalBusy(false);
    }
  };

  const handleCardInsert = () => {
    if (terminalBusy || submittingOrder) return;
    setInsertingCard(true);
    setPinError('');
    setTimeout(() => {
      setTpeStep(2);
      setInsertingCard(false);
    }, 850);
  };

  const renderWelcome = () => (
    <>
      <KioskShell phase={1} showStatus className="kiosk-welcome-shell">
        <div className="kiosk-welcome">
          <KioskLogo large />
          <div className="kiosk-welcome-copy">
            <h1>مرحباً بك في <span>OMEGA</span></h1>
            <p>الطعام اللذيذ، الخدمة المميزة، والوجبات الساخنة لاستمتاعك بوجبتك!</p>
          </div>
          <button type="button" className="kiosk-start-btn" onClick={startWelcomeTransition}>
            <span className="kiosk-start-icon"><IoArrowDown aria-hidden="true" /></span>
            <span className="kiosk-start-text">
              <strong>اضغط للبدء</strong>
              <small>ابدأ طلبك الآن</small>
            </span>
          </button>
          <TrustFooter text="شاشة ذكية، آمنة، وموثوقة" />
        </div>
      </KioskShell>
      <TapTransition
        active={showStartTransition}
        durationMs={2000}
        finishOnEnded={false}
        onDone={completeWelcomeTransition}
      />
    </>
  );

  const renderOrderType = () => (
    <KioskShell phase={2} onBack={goBack} showStatus>
      <ScreenHeader
        title="أين ترغب في تناول "
        redWord="وجبتك؟"
        subtitle="اختر طريقة الاستلام التي تناسبك"
      />
      <div className="kiosk-option-grid">
        <OptionCard
          icon={IoBagHandleOutline}
          title="سفري / للمنزل"
          description="استلم طلبك بسهولة وسرعة للاستمتاع بمذاقه أينما كنت."
          button="اختر الخدمة"
          onClick={() => startService('takeaway')}
        />
        <OptionCard
          icon={IoRestaurantOutline}
          title="أكل في المطعم"
          description="استمتع بوجبتك داخل المطعم في أجواء مريحة ولذيذة."
          button="اختر الخدمة"
          onClick={() => startService('dine-in')}
        />
      </div>
      <TrustFooter />
    </KioskShell>
  );

  const renderMenu = () => (
    <KioskShell phase={3} onBack={goBack} wide>
      <ScreenHeader
        compact
        title="اختر "
        redWord="وجبتك"
        subtitle="أضف المنتجات إلى السلة ثم راجع ملخص الطلب"
        icon={IoCartOutline}
      />

      <div className="kiosk-menu-layout">
        <section className="kiosk-products-zone">
          <div className="kiosk-chip-row">
            {existingCats.map((cat) => {
              const Icon = CAT_META[cat]?.icon || IoFastFoodOutline;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`kiosk-chip ${activeCat === cat ? 'active' : ''}`}
                  onClick={() => setActiveCat(cat)}
                >
                  <Icon aria-hidden="true" />
                  <span>{CAT_META[cat]?.label || cat}</span>
                </button>
              );
            })}
          </div>

          {availableSizes.length > 1 && (
            <div className="kiosk-chip-row small">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`kiosk-chip ${activeSize === size ? 'active' : ''}`}
                  onClick={() => setActiveSize(size)}
                >
                  <span>{size === 'all' ? 'كل الأحجام' : size}</span>
                </button>
              ))}
            </div>
          )}

          {loadingProducts ? (
            <div className="kiosk-loading-card">
              <span className="kiosk-spinner" />
              <strong>جاري تحميل المنتجات...</strong>
            </div>
          ) : filteredProducts.length ? (
            <div className="kiosk-product-grid">
              {filteredProducts.map((product) => {
                const sizes = product.hasSizes && Array.isArray(product.sizes) ? product.sizes : [];
                const minSizePrice = sizes.length ? Math.min(...sizes.map((size) => Number(size.price || 0))) : Number(product.price || 0);

                return (
                  <article className="kiosk-product-card" key={product.id}>
                    <div className="kiosk-product-image-wrap">
                      <ProductImage product={product} />
                    </div>
                    <div className="kiosk-product-body">
                      <h2>{product.name}</h2>
                      <p>{product.description || CAT_META[product.category]?.label || 'وجبة لذيذة من OMEGA'}</p>
                      <strong>{sizes.length ? `ابتداءً من ${money(minSizePrice)}` : money(product.price)}</strong>
                    </div>
                    <div className="kiosk-product-actions">
                      {sizes.length ? sizes.map((size) => (
                        <button
                          key={size.label}
                          type="button"
                          onClick={() => addItem(product.id, size.label, Number(size.price || 0))}
                        >
                          <IoAdd aria-hidden="true" />
                          <span>{size.label}</span>
                          <small>{money(size.price)}</small>
                        </button>
                      )) : (
                        <button type="button" onClick={() => addItem(product.id)}>
                          <IoAdd aria-hidden="true" />
                          <span>إضافة</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="kiosk-loading-card">
              <strong>لا توجد منتجات متاحة حالياً</strong>
              <span>يمكنك الرجوع أو تحديث المنتجات من لوحة الإدارة.</span>
            </div>
          )}
        </section>

        <aside className="kiosk-cart-panel">
          <div className="kiosk-cart-head">
            <IoReceiptOutline aria-hidden="true" />
            <div>
              <h2>سلتك الحالية</h2>
              <span>{cartItemCount} منتج</span>
            </div>
          </div>

          <div className="kiosk-cart-items">
            {cartEntries.length ? cartEntries.map((item) => (
              <div className="kiosk-cart-item" key={item.key}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{money(item.price * item.quantity)}</span>
                </div>
                <div className="kiosk-qty">
                  <button type="button" onClick={() => removeItem(item.key)} aria-label="إنقاص الكمية">
                    {item.quantity > 1 ? <IoRemove aria-hidden="true" /> : <IoTrashOutline aria-hidden="true" />}
                  </button>
                  <b>{item.quantity}</b>
                  <button type="button" onClick={() => addCartEntry(item)} aria-label="زيادة الكمية">
                    <IoAdd aria-hidden="true" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="kiosk-empty-cart">
                <IoCartOutline aria-hidden="true" />
                <span>اختر منتجاً لبدء الطلب</span>
              </div>
            )}
          </div>

          <label className="kiosk-note">
            <span>ملاحظة للطلب</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثلاً: بدون صلصة، أكثر جبن..."
              rows={3}
            />
          </label>

          <div className="kiosk-cart-total">
            <div><span>المجموع</span><strong>{money(cartTotal)}</strong></div>
            <div><span>رسوم الخدمة</span><strong>{money(serviceFee)}</strong></div>
            <div className="grand"><span>الإجمالي</span><strong>{money(finalTotal)}</strong></div>
          </div>

          <PrimaryButton onClick={goToSummary} disabled={!cartItemCount} icon={IoReceiptOutline}>
            مراجعة الطلب
          </PrimaryButton>
          {cartItemCount > 0 && (
            <button type="button" className="kiosk-link-btn" onClick={clearOrder}>
              إفراغ السلة
            </button>
          )}
        </aside>
      </div>
    </KioskShell>
  );

  const renderSummary = () => (
    <KioskShell phase={3.25} onBack={goBack}>
      <ScreenHeader
        title="ملخص طلبك"
        subtitle="راجع المنتجات والمجموع قبل اختيار طريقة الدفع"
        icon={IoBagHandleOutline}
      />

      <div className="kiosk-summary-list">
        {cartEntries.map((item) => (
          <article className="kiosk-summary-item" key={item.key}>
            <img src={item.product.image || fallbackImg(item.product.category)} alt="" />
            <div>
              <h2>{item.name}</h2>
              <span>{CAT_META[item.product.category]?.label || 'OMEGA'}</span>
            </div>
            <b>{item.quantity}x</b>
            <strong>{money(item.price * item.quantity)}</strong>
          </article>
        ))}
      </div>

      <div className="kiosk-summary-box">
        <div>
          <span>نوع الطلب</span>
          <strong>{orderType === 'dine-in' ? 'أكل في المطعم' : 'طلب للتوصيل / سفري'}</strong>
        </div>
        <div>
          <span>رسوم التحضير والخدمة</span>
          <strong>{money(serviceFee)}</strong>
        </div>
        <div>
          <span>المجموع</span>
          <strong>{money(finalTotal)}</strong>
        </div>
      </div>

      <div className="kiosk-total-card">
        <span>الإجمالي</span>
        <strong>{money(finalTotal)}</strong>
      </div>

      <div className="kiosk-action-row">
        <button type="button" className="kiosk-white-action" onClick={() => setPhase(3)}>
          تعديل الطلب
        </button>
        <PrimaryButton onClick={() => setPhase(3.5)}>
          متابعة للدفع
        </PrimaryButton>
      </div>
      <TrustFooter text="نشاطك محمي داخل أمانة" />
    </KioskShell>
  );

  const renderPaymentMethod = () => (
    <KioskShell phase={3.5} onBack={goBack}>
      <ScreenHeader
        title="اختر طريقة "
        redWord="الدفع المناسبة"
        subtitle="يمكنك الدفع بطريقة آمنة وسهلة في كل خطوة"
      />

      <div className="kiosk-option-grid payment">
        <OptionCard
          icon={IoCashOutline}
          title="الدفع نقداً (كاش)"
          description="ادفع عند الاستلام في الفرع أو للصندوق بسهولة وراحة."
          button={submittingOrder ? 'جاري تسجيل الطلب...' : 'اختر هذا الخيار'}
          tone="gold"
          disabled={submittingOrder}
          onClick={handleCashSuccess}
        />
        <OptionCard
          icon={IoCardOutline}
          title="الدفع بالبطاقة"
          description="ادفع إلكترونياً عبر البطاقة من جهاز الدفع الحقيقي."
          button="اختر هذا الخيار"
          onClick={() => {
            setPaymentMethod('ccp');
            setPhase(4);
          }}
        />
      </div>

      <div className="kiosk-secure-note">
        <IoLockClosedOutline aria-hidden="true" />
        <span>جميع معاملاتك آمنة ومشفرة</span>
      </div>
    </KioskShell>
  );

  const renderCardPayment = () => {
    const statusText = {
      1: 'أدخل البطاقة في جهاز الدفع ثم تابع.',
      2: 'اكتب الرقم السري على لوحة مفاتيح جهاز الدفع، ثم اضغط تأكيد.',
      3: 'جاري تأكيد عملية السحب من البطاقة...',
      4: 'تم قبول العملية وإرسال الطلب للمطبخ.',
    }[tpeStep];

    return (
      <KioskShell phase={4} onBack={goBack}>
        <ScreenHeader
          title="الدفع / البطاقة"
          subtitle="استخدم بطاقتك الائتمانية لإتمام الطلب"
          icon={IoCardOutline}
        />

        <section className={`kiosk-payment-card ${shakeActive ? 'shake-effect' : ''}`}>
          <div className="kiosk-lock-shield">
            {tpeStep === 4 ? <IoCheckmarkOutline aria-hidden="true" /> : <IoLockClosedOutline aria-hidden="true" />}
          </div>
          <h2>{tpeStep === 4 ? 'تم تأكيد الدفع' : 'أدخل الرقم السري للبطاقة'}</h2>
          <p>{statusText}</p>

          <div className="kiosk-pin-boxes" aria-hidden="true">
            {[0, 1, 2, 3].map((box) => (
              <span className={tpeStep >= 2 ? 'filled' : ''} key={box} />
            ))}
          </div>

          {tpeStep === 1 && (
            <PrimaryButton onClick={handleCardInsert} disabled={insertingCard} icon={IoCardOutline}>
              {insertingCard ? 'جاري قراءة البطاقة...' : 'أدخلت البطاقة'}
            </PrimaryButton>
          )}

          {tpeStep === 2 && (
            <PrimaryButton onClick={startTpeCharge} disabled={terminalBusy || submittingOrder} icon={IoLockClosedOutline}>
              تأكيد الدفع
            </PrimaryButton>
          )}

          {tpeStep === 3 && (
            <div className="kiosk-terminal-busy">
              <span className="kiosk-spinner" />
              <strong>جاري التواصل مع جهاز الدفع...</strong>
            </div>
          )}

          {tpeStep === 4 && (
            <div className="kiosk-terminal-ok">
              <IoShieldCheckmarkOutline aria-hidden="true" />
              <span>تمت العملية بنجاح</span>
            </div>
          )}

          {pinError && (
            <div className="kiosk-payment-error">
              {pinError}
            </div>
          )}

          <div className="kiosk-payment-small">
            <IoShieldCheckmarkOutline aria-hidden="true" />
            <span>جميع المدفوعات تتم بشكل مباشر وآمن عبر جهاز الدفع المرتبط.</span>
          </div>
        </section>

        <FeatureStrip />
        <footer className="kiosk-brand-foot">
          <strong>OMEGA PIZZA</strong>
          <span>طعم يستحق الثقة</span>
        </footer>
      </KioskShell>
    );
  };

  const renderSuccess = () => (
    <KioskShell phase={5} onBack={goBack}>
      <div className="kiosk-success">
        <div className="kiosk-success-check">
          <IoCheckmarkOutline aria-hidden="true" />
        </div>
        <h1>تم استلام طلبك بنجاح!</h1>
        <p><strong>OMEGA</strong> شكراً لاختيارك</p>
        <span>سيتم تجهيز طلبك وتوصيله في أقرب وقت ممكن إن شاء الله.</span>

        <div className="kiosk-order-number">
          <span>رقم طلبك</span>
          <strong>{orderNumber || '...'}</strong>
        </div>

        <FeatureStrip />

        <PrimaryButton onClick={resetKiosk} icon={IoHomeOutline} className="kiosk-home-btn">
          العودة إلى القائمة الرئيسية
        </PrimaryButton>

        <div className="kiosk-print-actions">
          <button type="button" onClick={() => window.print()}>
            <IoPrintOutline aria-hidden="true" />
            <span>إعادة طباعة التذكرة</span>
          </button>
          {!isReceiptReady && (
            <span>
              <IoTimeOutline aria-hidden="true" />
              جاري تجهيز التذكرة...
            </span>
          )}
          {isReceiptReady && (
            <span>
              <IoCheckmarkOutline aria-hidden="true" />
              التذكرة جاهزة
            </span>
          )}
        </div>

        <small>نتمنى لك وجبة شهية!</small>
      </div>

      <ReceiptForPrint
        orderNumber={orderNumber}
        currentDateTime={currentDateTime}
        orderType={orderType}
        note={note}
        cartEntries={cartEntries}
        cartTotal={cartTotal}
        serviceFee={serviceFee}
        finalTotal={finalTotal}
        paymentMethod={paymentMethod}
        paymentReceipt={paymentReceipt}
      />
    </KioskShell>
  );

  if (phase === 1) return renderWelcome();
  if (phase === 2) return renderOrderType();
  if (phase === 3) return renderMenu();
  if (phase === 3.25) return renderSummary();
  if (phase === 3.5) return renderPaymentMethod();
  if (phase === 4) return renderCardPayment();
  if (phase === 5) return renderSuccess();

  return (
    <KioskShell phase={1}>
      <div className="kiosk-success">
        <IoReloadOutline aria-hidden="true" />
        <PrimaryButton onClick={resetKiosk}>إعادة تشغيل الكيوسك</PrimaryButton>
      </div>
    </KioskShell>
  );
}
