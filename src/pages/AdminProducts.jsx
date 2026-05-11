import { useState, useEffect } from 'react';
import { getAllProducts, addProduct, updateProduct, deleteProduct, uploadProductImage } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import AdminNav from '../components/AdminNav';
import { IoAdd, IoCreate, IoTrash, IoClose, IoCloudUpload, IoImage } from 'react-icons/io5';
import toast from 'react-hot-toast';

const categoryLabels = { burger: '🍔 برجر', pizza: '🍕 بيتزا', tacos: '🌮 تاكوس', drinks: '🥤 مشروبات' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-4xl mx-auto px-4 pt-16 lg:pt-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black text-white">إدارة المنتجات</h1>
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-omega-orange text-white text-sm font-medium hover:bg-omega-orange-light transition-colors">
              <IoAdd size={18} /> إضافة
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-3">
              {products.map((p, idx) => (
                <div key={p.id} className="glass rounded-xl p-3 flex gap-3 animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className="w-16 h-16 rounded-xl bg-omega-gray overflow-hidden flex-shrink-0">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-2xl">{categoryLabels[p.category]?.split(' ')[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white text-sm font-bold truncate">{p.name}</h4>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-orange hover:bg-omega-orange/10 transition-all"><IoCreate size={16} /></button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg text-omega-text-muted hover:text-omega-red hover:bg-omega-red/10 transition-all"><IoTrash size={16} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-omega-orange text-xs font-bold">{formatCurrency(p.price)}</span>
                      <span className="text-omega-text-muted text-[10px]">تكلفة: {formatCurrency(p.costPrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.isAvailable ? 'bg-omega-success/15 text-omega-success' : 'bg-omega-red/15 text-omega-red'}`}>
                        {p.isAvailable ? 'متوفر' : 'غير متوفر'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.stock <= 5 ? 'bg-yellow-500/15 text-yellow-500' : 'bg-omega-gray text-omega-text-muted'}`}>
                        مخزون: {p.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* نموذج إضافة/تعديل */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative glass rounded-t-2xl lg:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">{editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
              <button onClick={resetForm} className="text-omega-text-muted hover:text-white"><IoClose size={22} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input type="text" placeholder="اسم المنتج *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50" />
              
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm focus:outline-none focus:border-omega-orange/50">
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="السعر *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50" />
                <input type="number" placeholder="التكلفة" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50" />
              </div>

              <input type="number" placeholder="المخزون" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50" />

              <textarea placeholder="الوصف" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2"
                className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50 resize-none" />

              {/* صورة */}
              <div className="space-y-2">
                <input type="url" placeholder="رابط الصورة" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} dir="ltr"
                  className="w-full px-4 py-3 rounded-xl bg-omega-dark/50 border border-white/10 text-white text-sm placeholder-omega-text-muted focus:outline-none focus:border-omega-orange/50" />
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-omega-dark/50 border border-white/10 text-omega-text-muted text-sm cursor-pointer hover:border-omega-orange/30">
                  <IoCloudUpload size={18} /> <span>أو ارفع صورة</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {form.image && <img src={form.image} alt="preview" className="w-20 h-20 rounded-xl object-cover" />}
              </div>

              {/* التوفر */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-colors ${form.isAvailable ? 'bg-omega-success' : 'bg-omega-gray'}`}
                  onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}>
                  <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${form.isAvailable ? 'mr-0.5' : 'mr-[18px]'}`} />
                </div>
                <span className="text-omega-text text-sm">متوفر</span>
              </label>

              <button type="submit" disabled={saving}
                className="w-full py-3.5 rounded-xl bg-gradient-to-l from-omega-orange to-omega-orange-dark text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>{editing ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
