import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { getAllProducts } from '../services/productService';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { getStatusMessage } from '../utils/businessHours';
import CustomerNav from '../components/CustomerNav';
import {
  IoAdd,
  IoBagHandleOutline,
  IoGridOutline,
  IoHeart,
  IoHeartOutline,
  IoMenu,
  IoSearch,
  IoTimeOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('omega_cart') || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('omega_cart', JSON.stringify(cart));
}

function getFav() {
  try {
    return JSON.parse(localStorage.getItem('tarken_fav') || '[]');
  } catch {
    return [];
  }
}

function saveFav(favs) {
  localStorage.setItem('tarken_fav', JSON.stringify(favs));
}

const categories = [
  { id: 'all', label: 'الكل', icon: '🍔' },
  { id: 'burger', label: 'برغر', icon: '🍔' },
  { id: 'pizza', label: 'بيتزا', icon: '🍕' },
  { id: 'tacos', label: 'تاكوس', icon: '🌮' },
  { id: 'drinks', label: 'مشروبات', icon: '🥤' },
  { id: 'appetizers', label: 'مقبلات', icon: '🍟' },
  { id: 'desserts', label: 'حلويات', icon: '🍰' },
];

function categoryImage(category) {
  return {
    burger: '/burger-classic.png',
    pizza: '/pizza-pepperoni.png',
    tacos: '/tacos-wrap.png',
    drinks: '/drink-cola.png',
    appetizers: '/fried-chicken.png',
  }[category] || '/burger-classic.png';
}

function ProductCard({ product, favorite, onFavorite, onAdd, onOpen }) {
  return (
    <article className="omega-card omega-product-card">
      <button
        type="button"
        className="absolute left-3 top-3 z-10 omega-icon-button"
        style={{ width: '2.65rem', height: '2.65rem', borderRadius: '0.85rem' }}
        onClick={onFavorite}
        aria-label="المفضلة"
      >
        {favorite ? <IoHeart className="text-omega-red" size={20} /> : <IoHeartOutline size={20} />}
      </button>

      <button type="button" onClick={onOpen} className="block w-full text-right">
        <img src={product.image || categoryImage(product.category)} alt={product.name} />
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : <p>وجبة OMEGA طازجة وجاهزة للطلب</p>}
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="omega-primary-action"
          style={{ minHeight: '2.7rem', minWidth: '2.9rem', borderRadius: '0.9rem' }}
          aria-label="إضافة"
        >
          <IoAdd size={22} />
        </button>
        <strong className="omega-price">{formatCurrency(product.price)}</strong>
      </div>
    </article>
  );
}

export default function CustomerHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(getFav);
  const [cart, setCart] = useState(getCart);
  const [ordersCount, setOrdersCount] = useState(0);
  const { userData } = useAuth();
  const navigate = useNavigate();
  const businessStatus = getStatusMessage();

  useEffect(() => {
    getAllProducts()
      .then((data) => setProducts(data.filter((product) => product.isAvailable !== false)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userData?.uid) return;
    getCountFromServer(query(collection(db, 'orders'), where('customerId', '==', userData.uid)))
      .then((snapshot) => setOrdersCount(snapshot.data().count))
      .catch(() => {});
  }, [userData?.uid]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (activeCat !== 'all' && product.category !== activeCat) return false;
      return !q || product.name?.toLowerCase().includes(q) || product.description?.toLowerCase().includes(q);
    });
  }, [products, activeCat, searchQuery]);

  const featured = filteredProducts[0] || products[0];

  const updateCart = (nextCart) => {
    setCart(nextCart);
    saveCart(nextCart);
  };

  const handleAdd = (product) => {
    if (!businessStatus.open) {
      toast.error(businessStatus.message);
      return;
    }

    const nextCart = [...cart];
    const index = nextCart.findIndex((item) => item.productId === product.id);
    if (index >= 0) {
      nextCart[index].quantity += 1;
    } else {
      nextCart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice || 0,
        image: product.image || '',
        quantity: 1,
      });
    }
    updateCart(nextCart);
    toast.success(`تمت إضافة ${product.name}`);
  };

  const toggleFavorite = (productId) => {
    const next = favorites.includes(productId)
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId];
    setFavorites(next);
    saveFav(next);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="omega-app-shell">
      <main className="omega-app-main">
        <header className="omega-mobile-header">
          <button type="button" className="omega-icon-button red" aria-label="القائمة">
            <IoMenu size={26} />
          </button>
          <div className="omega-mobile-title">
            <div className="omega-mini-logo mx-auto mb-2">
              <img src="/logo.png" alt="OMEGA" />
            </div>
            <h1>OMEGA</h1>
            <p>اطلب وجبتك بسهولة</p>
          </div>
          <button type="button" className="omega-icon-button red relative" onClick={() => navigate('/cart')} aria-label="السلة">
            <IoBagHandleOutline size={25} />
            {cartCount > 0 ? <span className="absolute -mt-8 -mr-8 omega-status-badge red">{cartCount}</span> : null}
          </button>
        </header>

        {!businessStatus.open ? (
          <div className="omega-card mb-4 flex items-center justify-between gap-3 p-4 text-right">
            <IoTimeOutline className="text-omega-red" size={24} />
            <div>
              <strong className="block text-omega-red">المطعم مغلق حالياً</strong>
              <p className="text-sm font-bold text-omega-text-muted">{businessStatus.message}</p>
            </div>
          </div>
        ) : null}

        <section className="omega-search-row">
          <label className="omega-search-box">
            <IoSearch size={22} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث عن وجبتك المفضلة"
            />
          </label>
          <button type="button" className="omega-icon-button red" aria-label="الفئات">
            <IoGridOutline size={23} />
          </button>
        </section>

        <section className="omega-tabs mb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCat(category.id)}
              className={`omega-tab${activeCat === category.id ? ' active' : ''}`}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </section>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-56 rounded-[1.35rem]" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <section className="omega-card omega-empty-state">
            <div>
              <strong>لا توجد منتجات</strong>
              <p>جرّب البحث بكلمة أخرى أو اختر فئة مختلفة</p>
            </div>
          </section>
        ) : (
          <>
            {featured ? (
              <section className="omega-card omega-card-soft mb-4 overflow-hidden p-4">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="text-right">
                    <span className="omega-status-badge red">الأكثر طلباً</span>
                    <h2 className="mt-3 text-2xl font-black text-omega-text">{featured.name}</h2>
                    <p className="mt-1 text-sm font-bold text-omega-text-muted">
                      برغر، بطاطس، ومشروب بطابع OMEGA
                    </p>
                    <strong className="omega-price mt-3 block">{formatCurrency(featured.price)}</strong>
                    <button
                      type="button"
                      onClick={() => handleAdd(featured)}
                      className="omega-primary-action mt-3 px-5"
                    >
                      أضف
                      <IoAdd size={20} />
                    </button>
                  </div>
                  <img
                    src={featured.image || categoryImage(featured.category)}
                    alt={featured.name}
                    className="h-36 w-36 object-contain drop-shadow-xl"
                  />
                </div>
              </section>
            ) : null}

            <div className="omega-section-label">
              <span>الأكثر طلباً</span>
              <IoGridOutline />
            </div>

            <section className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  favorite={favorites.includes(product.id)}
                  onFavorite={() => toggleFavorite(product.id)}
                  onAdd={() => handleAdd(product)}
                  onOpen={() => navigate(`/product/${product.id}`)}
                />
              ))}
            </section>
          </>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => navigate('/my-orders')} className="omega-card p-4 text-right">
            <span className="text-sm font-bold text-omega-text-muted">طلباتي</span>
            <strong className="mt-1 block text-2xl font-black text-omega-text">{ordersCount}</strong>
          </button>
          <button type="button" onClick={() => navigate('/cart')} className="omega-card p-4 text-right">
            <span className="text-sm font-bold text-omega-text-muted">السلة</span>
            <strong className="mt-1 block text-2xl font-black text-omega-red">{cartCount}</strong>
          </button>
        </div>
      </main>
      <CustomerNav />
    </div>
  );
}
