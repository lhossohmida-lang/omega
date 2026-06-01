import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import CustomerNav from '../components/CustomerNav';
import TransparentImg from '../components/TransparentImg';
import TapTransition from '../components/TapTransition';
import {
  IoAdd,
  IoHeart,
  IoHeartOutline,
  IoChevronBackOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

function getCart() {
  try { return JSON.parse(localStorage.getItem('omega_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) { localStorage.setItem('omega_cart', JSON.stringify(cart)); }

function isSellableProduct(product) {
  if (product.hasSizes && product.sizes?.length > 0) return product.sizes.some(sz => Number(sz.price || 0) > 0);
  return Number(product.price || 0) > 0;
}
function getFav() {
  try { return JSON.parse(localStorage.getItem('tarken_fav') || '[]'); } catch { return []; }
}
function saveFav(f) { localStorage.setItem('tarken_fav', JSON.stringify(f)); }

function fallbackImg(cat) {
  return {
    burger: '/burger-classic.png',
    pizza:  '/pizza-pepperoni.png',
    tacos:  '/tacos-wrap.png',
    drinks: '/drink-cola.png',
    appetizers: '/fried-chicken.png',
    desserts: '/appetizer-gratin.png',
    sofli: '/sofli.png',
    box: '/burger-classic.png',
  }[cat] || '/burger-classic.png';
}

function GridCard({ product, fav, onFav, onAdd, onOpen }) {
  return (
    <article className="ch-gcard">
      <button type="button" className="ch-gcard-fav" onClick={onFav} aria-label="مفضلة">
        {fav ? <IoHeart className="ch-fav-on" size={16}/> : <IoHeartOutline size={16}/>}
      </button>
      <button type="button" onClick={onOpen} className="ch-gcard-inner">
        <div className="ch-gcard-img-wrap">
          <TransparentImg
            src={product.image || fallbackImg(product.category)}
            alt={product.name}
            className="ch-gcard-img"
          />
        </div>
        <div className="ch-gcard-info">
          <h3 className="ch-gcard-name">{product.name}</h3>
          <p className="ch-gcard-desc">{product.description || 'وجبة OMEGA طازجة'}</p>
          <div className="ch-gcard-footer">
            <strong className="ch-price">{formatCurrency(product.price)}</strong>
            <button type="button" className="ch-add-btn-sm" onClick={(e) => { e.stopPropagation(); onAdd(); }} aria-label="إضافة">
              <IoAdd size={18}/>
            </button>
          </div>
        </div>
      </button>
    </article>
  );
}

export default function Favorites() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [favorites, setFavorites] = useState(getFav);
  const [cart, setCart]           = useState(getCart);
  const [tapTarget, setTapTarget] = useState(null);
  const navigate                  = useNavigate();

  useEffect(() => {
    getAllProducts()
      .then(d => setProducts(d.filter(p => p.isAvailable !== false && isSellableProduct(p))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateCart = (next) => { setCart(next); saveCart(next); };
  const handleAdd = (product) => {
    const next = [...cart];
    const i    = next.findIndex(it => it.productId === product.id);
    if (i >= 0) next[i].quantity += 1;
    else next.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      costPrice: product.costPrice || 0,
      image: product.image || '',
      quantity: 1,
    });
    updateCart(next);
    toast.success(`تمت إضافة ${product.name} ✓`);
  };

  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); saveFav(next);
  };
  const openWithTapTransition = (path) => {
    if (tapTarget) return;
    setTapTarget(path);
  };

  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div className="ch-shell pb-safe">
      <header className="ch-header">
        <button type="button" className="ch-notif-btn" onClick={() => navigate(-1)} aria-label="الرجوع">
          <IoChevronBackOutline size={24}/>
        </button>
        <div className="ch-header-logo">
          <h1 className="text-xl font-black text-[#1a1a2e]" style={{ margin: 0 }}>المفضلة</h1>
        </div>
        <div style={{ width: 40 }} />
      </header>

      {loading ? (
        <div className="ch-skeleton-grid" style={{ padding: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ch-skeleton-card"/>
          ))}
        </div>
      ) : (
        <section className="ch-section" style={{ paddingTop: '1rem' }}>
          {favoriteProducts.length === 0 ? (
            <div className="ch-empty">
              <span style={{ fontSize: '3rem' }}>❤️</span>
              <strong>لا توجد مفضلة</strong>
              <p>قم بإضافة بعض الوجبات إلى مفضلتك</p>
            </div>
          ) : (
            <div className="ch-grid">
              {favoriteProducts.map(p => (
                <GridCard
                  key={p.id}
                  product={p}
                  fav={favorites.includes(p.id)}
                  onFav={() => toggleFav(p.id)}
                  onAdd={() => handleAdd(p)}
                  onOpen={() => openWithTapTransition(`/product/${p.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <CustomerNav cartCount={cartCount} onNavigate={openWithTapTransition}/>
      <TapTransition
        active={!!tapTarget}
        onDone={() => {
          const nextPath = tapTarget;
          setTapTarget(null);
          if (nextPath) navigate(nextPath);
        }}
      />
    </div>
  );
}
