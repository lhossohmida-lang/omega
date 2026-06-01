import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSpecialOffer } from '../services/offerService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import CustomerNav from '../components/CustomerNav';
import {
  IoAdd,
  IoArrowBack,
  IoBagHandleOutline,
  IoCheckmarkCircleOutline,
  IoPricetagOutline,
  IoSparklesOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem('omega_cart', JSON.stringify(cart));
}

function offerImage(offer) {
  return offer?.image || offer?.items?.find(item => item.image)?.image || '/burger-classic.png';
}

function componentName(item) {
  return item.productName || item.name || 'منتج';
}

function originalPrice(offer) {
  return Number(offer?.originalTotalPrice || offer?.oldPrice || 0);
}

function discountInfo(offer) {
  const original = originalPrice(offer);
  const offerPrice = Number(offer?.offerPrice || 0);
  const discountValue = Math.max(0, Number(offer?.discountValue ?? (original - offerPrice)));
  const discountPercent = Number(offer?.discountPercent ?? (original > 0 ? Math.round((discountValue / original) * 100) : 0));
  return { original, discountValue, discountPercent };
}

function cartItemFromOffer(offer) {
  const components = (offer.items || []).map(item => ({
    productId: item.productId,
    name: componentName(item),
    productName: componentName(item),
    quantity: Number(item.quantity || 1),
    price: Number(item.unitPrice ?? item.price ?? 0),
    unitPrice: Number(item.unitPrice ?? item.price ?? 0),
    costPrice: Number(item.costPrice || 0),
    image: item.image || '',
    category: item.category || '',
  }));
  const unitCost = components.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

  return {
    productId: `offer_${offer.id}`,
    type: 'offer',
    offerId: offer.id,
    name: offer.title,
    price: Number(offer.offerPrice || 0),
    oldPrice: originalPrice(offer) || null,
    costPrice: unitCost,
    image: offerImage(offer),
    quantity: 1,
    components,
    description: offer.description || components.map(item => `${item.quantity}x ${item.name}`).join(' + '),
  };
}

export default function OfferDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(getCart);
  const businessStatus = getStatusMessage();

  useEffect(() => {
    if (!id) return;
    getSpecialOffer(id)
      .then(setOffer)
      .catch(error => {
        console.error('getSpecialOffer failed:', error);
        toast.error('تعذر تحميل العرض');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const { original, discountValue, discountPercent } = useMemo(() => discountInfo(offer), [offer]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addOfferToCart = () => {
    if (!offer) return;
    if (offer.isActive === false) {
      toast.error('هذا العرض غير متاح حالياً');
      return;
    }
    if (!businessStatus.open) {
      toast.error(businessStatus.message);
      return;
    }

    const cartItem = cartItemFromOffer(offer);
    const next = [...cart];
    const index = next.findIndex(item => item.productId === cartItem.productId);
    if (index >= 0) next[index].quantity += 1;
    else next.push(cartItem);
    setCart(next);
    saveCart(next);
    toast.success(`تمت إضافة ${offer.title} ✓`);
  };

  if (loading) {
    return (
      <div className="omega-app-shell no-bottom-nav grid place-items-center">
        <div className="skeleton h-16 w-16 rounded-full" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="omega-app-shell">
        <main className="omega-app-main">
          <section className="omega-card p-8 text-center">
            <IoPricetagOutline className="mx-auto mb-3 text-omega-orange" size={44} />
            <h1 className="text-xl font-black text-omega-text">العرض غير موجود</h1>
            <button type="button" onClick={() => navigate('/')} className="omega-danger-action mt-5 w-full">
              العودة للرئيسية
            </button>
          </section>
        </main>
        <CustomerNav cartCount={cartCount} />
      </div>
    );
  }

  return (
    <div className="omega-app-shell offer-details-page">
      <main className="omega-app-main">
        <header className="omega-mobile-header">
          <button type="button" onClick={() => navigate(-1)} className="omega-icon-button red" aria-label="رجوع">
            <IoArrowBack size={25} />
          </button>
          <div className="omega-mobile-title">
            <h1>تفاصيل العرض</h1>
            <p>{offer.isFeatured ? 'عرض مميز في الرئيسية' : 'عرض وجبة مجمعة'}</p>
          </div>
          <button type="button" onClick={() => navigate('/cart')} className="omega-icon-button red" aria-label="السلة">
            <IoBagHandleOutline size={23} />
          </button>
        </header>

        <section className="offer-detail-hero omega-card">
          <img src={offerImage(offer)} alt={offer.title} />
          <div className="offer-detail-badges">
            {offer.isFeatured ? (
              <span><IoSparklesOutline size={14} /> عرض مميز</span>
            ) : null}
            {discountPercent > 0 ? (
              <span><IoPricetagOutline size={14} /> خصم {formatNumber(discountPercent)}%</span>
            ) : null}
          </div>
        </section>

        <section className="omega-card mt-3 p-4">
          <h2 className="text-right text-2xl font-black text-omega-text">{offer.title}</h2>
          <p className="mt-2 text-right text-sm font-bold leading-7 text-omega-text-muted">
            {offer.description || 'عرض خاص بسعر مخفّض من OMEGA'}
          </p>

          <div className="offer-detail-price-row">
            <div>
              <span>السعر الأصلي</span>
              <strong className="line-through">{formatCurrency(original)}</strong>
            </div>
            <div>
              <span>سعر العرض</span>
              <strong>{formatCurrency(offer.offerPrice)}</strong>
            </div>
            <div>
              <span>التوفير</span>
              <strong>{formatCurrency(discountValue)}</strong>
            </div>
          </div>
        </section>

        <section className="omega-card mt-3 p-4">
          <div className="omega-section-label mt-0">
            <span>مكونات العرض</span>
            <IoCheckmarkCircleOutline />
          </div>
          <div className="offer-detail-components">
            {(offer.items || []).map(item => (
              <div key={item.productId} className="offer-detail-component">
                <span>x{formatNumber(item.quantity || 1)}</span>
                <strong>{componentName(item)}</strong>
                {item.image ? <img src={item.image} alt={componentName(item)} /> : <i>🍽️</i>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 left-3 right-3 z-40 max-w-lg mx-auto">
        <div className="bg-omega-dark/95 backdrop-blur-2xl border border-white/10 rounded-xl p-2 flex items-center gap-2 shadow-2xl shadow-black/80">
          <div className="flex items-center gap-2 px-3">
            <IoPricetagOutline className="text-omega-orange" size={22} />
            <div>
              <p className="text-omega-text-dim text-[10px] leading-tight">سعر العرض</p>
              <p className="text-white font-black text-sm leading-tight">{formatCurrency(offer.offerPrice)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addOfferToCart}
            disabled={offer.isActive === false || !businessStatus.open}
            className="flex-1 bg-gradient-to-l from-omega-orange via-omega-orange-dark to-omega-red text-white font-black text-sm rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-omega-orange/35 active:scale-95 transition-transform disabled:opacity-60"
          >
            <IoAdd size={20} />
            أضف العرض إلى السلة
          </button>
        </div>
      </div>

      <CustomerNav cartCount={cartCount} />
    </div>
  );
}
