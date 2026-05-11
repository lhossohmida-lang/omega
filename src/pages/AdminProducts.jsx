import { useState, useEffect } from 'react';
import { getAllProducts, addProduct, updateProduct, deleteProduct, uploadProductImage } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import AdminNav from '../components/AdminNav';
import {
  IoAdd, IoCreate, IoTrash, IoClose, IoCloudUpload,
  IoFastFood, IoSearch, IoPricetag, IoCube
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const categoryLabels = {
  burger: { label: 'برجر', emoji: '🍔' },
  pizza: { label: 'بيتزا', emoji: '🍕' },
  tacos: { label: 'تاكوس', emoji: '🌮' },
  drinks: { label: 'مشروبات', emoji: '🥤' },
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({
    name: '', category: 'burger', price: '', costPrice: '', stock: '', description: '', image: '', isAvailable: true,
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try { setProducts(await getAllProducts()); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', category: 'burger', price: '', costPrice: '', stock: '', description: '', image: '', isAvailable: true });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (product) => {
    setForm({
      name: product.name, category: product.category, price: product.price, costPrice: product.costPrice || '',
      stock: product.stock, description: product.description || '', image: product.image || '', isAvailable: product.isAvailable,
    });
    setEditing(product.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name, category: form.category, price: Number(form.price), costPrice: Number(form.costPrice) || 0,
        stock: Number(form.stock) || 0, description: form.description, image: form.image, isAvailable: form.isAvailable,
      };
      if (editing) {
        await updateProduct(editing, data);
        toast.success('تم تعديل المنتج');
      } else {
        await addProduct(data);
        toast.success('تم إضافة المنتج');
      }
      resetForm();
      loadProducts();
    } catch (err) { toast.error('حدث خطأ'); console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    try { await deleteProduct(id); toast.success('تم الحذف'); loadProducts(); }
    catch (err) { toast.error('خطأ في الحذف'); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast.loading('جاري رفع الصورة...');
      const url = await uploadProductImage(file, editing || 'new');
      setForm({ ...form, image: url });
      toast.dismiss();
      toast.success('تم رفع الصورة');
    } catch (err) { toast.dismiss(); toast.error('خطأ في رفع الصورة'); }
  };

  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="page-header-icon">
                <IoFastFood size={22} />
              </div>
              <div>
                <h1 className="page-title">إدارة المنتجات</h1>
                <p className="page-subtitle">{filtered.length} منتج</p>
              </div>
            </div>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
              <IoAdd size={18} /> <span className="hidden sm:inline">إضافة منتج</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4 animate-fade-in">
            <IoSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-omega-text-dim" size={18} />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-modern pr-11"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
            <button onClick={() => setCatFilter('all')} className={`chip ${catFilter === 'all' ? 'chip-active' : ''}`}>الكل</button>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <button key={k} onClick={() => setCatFilter(k)} className={`chip ${catFilter === k ? 'chip-active' : ''}`}>
                <span>{v.emoji}</span> {v.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="card-premium p-10 text-center">
              <IoFastFood className="text-omega-text-dim mx-auto mb-3" size={48} />
              <p className="text-omega-text-muted">لا توجد منتجات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 stagger">
              {filtered.map(p => {
                const cat = categoryLabels[p.category];
                return (
                  <div key={p.id} className="card-premium p-3 flex gap-3 group">
                    <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-omega-gray to-omega-dark-2 overflow-hidden flex-shrink-0 border border-white/5">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">{cat?.emoji}</div>
                      )}
                      {!p.isAvailable && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-omega-red text-[10px] font-bold">غير متوفر</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0">
                          <h4 className="text-white text-sm font-bold truncate">{p.name}</h4>
                          <p className="text-omega-text-dim text-[10px]">{cat?.label}</p>
                        </div>
                        <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-orange hover:bg-omega-orange/10 transition-all">
                            <IoCreate size={15} />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-red hover:bg-omega-red/10 transition-all">
                            <IoTrash size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-omega-orange text-xs font-black">
                          <IoPricetag size={11} /> {formatCurrency(p.price)}
                        </span>
                        <span className="text-omega-text-dim text-[10px]">تكلفة: {formatCurrency(p.costPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`badge ${p.isAvailable ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25' : 'bg-omega-red/12 text-omega-red border-omega-red/25'}`}>
                          {p.isAvailable ? 'متوفر' : 'غير متوفر'}
                        </span>
                        <span className={`badge ${
                          p.stock === 0 ? 'bg-omega-red/12 text-omega-red border-omega-red/25' :
                          p.stock <= 5 ? 'bg-yellow-500/12 text-yellow-400 border-yellow-500/25' :
                          'bg-white/5 text-omega-text-muted border-white/10'
                        }`}>
                          <IoCube size={9} /> {p.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={resetForm} />
          <div className="relative card-premium rounded-t-3xl lg:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black text-lg">{editing ? 'تعديل المنتج' : 'منتج جديد'}</h3>
              <button onClick={resetForm} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-omega-text-muted hover:text-white flex items-center justify-center transition-colors">
                <IoClose size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">اسم المنتج *</label>
                <input type="text" placeholder="مثلاً: برجر كلاسيكي" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-modern" />
              </div>

              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">الفئة</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setForm({ ...form, category: k })}
                      className={`py-2.5 rounded-xl border transition-all flex flex-col items-center gap-1
                        ${form.category === k ? 'bg-omega-orange/15 border-omega-orange/40 text-white' : 'bg-white/3 border-white/8 text-omega-text-muted hover:text-white'}`}>
                      <span className="text-xl">{v.emoji}</span>
                      <span className="text-[10px] font-bold">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">السعر *</label>
                  <input type="number" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    className="input-modern" />
                </div>
                <div>
                  <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">التكلفة</label>
                  <input type="number" placeholder="0" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })}
                    className="input-modern" />
                </div>
              </div>

              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">المخزون</label>
                <input type="number" placeholder="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                  className="input-modern" />
              </div>

              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">الوصف</label>
                <textarea placeholder="وصف مختصر..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2"
                  className="input-modern resize-none" />
              </div>

              <div>
                <label className="text-omega-text-muted text-[11px] block mb-1.5 mr-1">الصورة</label>
                <div className="space-y-2">
                  <input type="url" placeholder="https://..." value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} dir="ltr"
                    className="input-modern" />
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/3 border border-dashed border-white/15 text-omega-text-muted text-sm cursor-pointer hover:border-omega-orange/40 hover:text-omega-orange transition-all">
                    <IoCloudUpload size={18} /> <span>أو ارفع صورة</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {form.image && (
                    <div className="flex items-center gap-2">
                      <img src={form.image} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                      <button type="button" onClick={() => setForm({ ...form, image: '' })} className="text-omega-red text-xs">إزالة</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <span className="text-white text-sm font-medium">متوفر للبيع</span>
                <div className={`toggle ${form.isAvailable ? 'on' : ''}`} onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })} />
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {saving
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span>{editing ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
