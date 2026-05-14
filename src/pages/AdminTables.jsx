import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToTables,
  createTable,
  updateTable,
  deleteTable,
} from '../services/tableService';
import { subscribeToWorkerOrders } from '../services/orderService';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import {
  IoAdd,
  IoClose,
  IoCreateOutline,
  IoTrashOutline,
  IoPeopleOutline,
  IoRestaurantOutline,
  IoCheckmarkCircleOutline,
  IoPauseCircleOutline,
  IoFlame,
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const emptyForm = { number: '', capacity: 4, name: '' };

export default function AdminTables() {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 6000);
    const unsubTables = subscribeToTables((data) => {
      clearTimeout(t);
      setTables(data);
      setLoading(false);
    });
    const unsubOrders = subscribeToWorkerOrders(setOrders);
    return () => {
      clearTimeout(t);
      unsubTables();
      unsubOrders();
    };
  }, []);

  const ordersByTable = useMemo(() => {
    const map = {};
    for (const o of orders) {
      const k = o.tableNumber ? Number(o.tableNumber) : null;
      if (k === null) continue;
      (map[k] ||= []).push(o);
    }
    return map;
  }, [orders]);

  const openCreate = () => {
    setEditingId(null);
    const nextNumber = (tables.reduce((m, t) => Math.max(m, t.number || 0), 0) || 0) + 1;
    setForm({ ...emptyForm, number: String(nextNumber) });
    setShowForm(true);
  };

  const openEdit = (table) => {
    setEditingId(table.id);
    setForm({
      number: String(table.number ?? ''),
      capacity: table.capacity ?? 4,
      name: table.name ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const number = Number(form.number);
    if (!number || number < 1) {
      toast.error('يرجى إدخال رقم طاولة صحيح');
      return;
    }
    const capacity = Number(form.capacity) || 4;
    const exists = tables.find(
      (t) => t.number === number && t.id !== editingId
    );
    if (exists) {
      toast.error('هذا الرقم مستعمل لطاولة أخرى');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateTable(editingId, {
          number,
          capacity,
          name: form.name || `طاولة ${number}`,
        });
        toast.success('تم تحديث الطاولة');
      } else {
        await createTable({
          number,
          capacity,
          name: form.name,
        });
        toast.success('تمت إضافة الطاولة');
      }
      closeForm();
    } catch (err) {
      console.error(err);
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table) => {
    const ok = confirm(`حذف ${table.name || `طاولة ${table.number}`}؟`);
    if (!ok) return;
    try {
      await deleteTable(table.id);
      toast.success('تم الحذف');
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const toggleActive = async (table) => {
    try {
      await updateTable(table.id, { active: !table.active });
    } catch {
      toast.error('فشل التحديث');
    }
  };

  return (
    <div className="admin-page">
      <AdminNav />
      <main className="admin-container">
        <AdminHeader
          title="الطاولات"
          accent="إدارة"
          subtitle={`${tables.length} طاولة مسجلة`}
        />

        <div className="mb-4 flex items-center justify-between">
          <span className="text-omega-text-muted text-sm">
            الطاولات النشطة:{' '}
            <strong className="text-white">
              {tables.filter((t) => t.active !== false).length}
            </strong>
          </span>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-omega-orange to-omega-red px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-omega-orange/25 active:scale-95"
          >
            <IoAdd size={20} />
            إضافة طاولة
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-44" />
            ))}
          </div>
        ) : tables.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <div className="text-6xl mb-4">🪑</div>
            <p className="text-white font-bold mb-1">لا توجد طاولات</p>
            <p className="text-omega-text-muted text-sm mb-4">
              أضف الطاولات لربط طلبات المطبخ بها
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-omega-orange/15 px-4 py-2 text-sm font-bold text-omega-orange"
            >
              <IoAdd size={18} />
              إضافة أول طاولة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger">
            {tables.map((table) => {
              const tOrders = ordersByTable[Number(table.number)] || [];
              const isOccupied = tOrders.length > 0;
              const inactive = table.active === false;

              return (
                <div
                  key={table.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                    inactive
                      ? 'border-white/5 bg-white/[0.02] opacity-70'
                      : isOccupied
                      ? 'border-omega-orange/40 bg-omega-orange/[0.08]'
                      : 'border-emerald-500/30 bg-emerald-500/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        inactive
                          ? 'bg-white/10 text-omega-text-muted'
                          : isOccupied
                          ? 'bg-omega-orange/20 text-omega-orange'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {inactive ? (
                        <>
                          <IoPauseCircleOutline size={11} /> موقوفة
                        </>
                      ) : isOccupied ? (
                        <>
                          <IoFlame size={11} /> مشغولة
                        </>
                      ) : (
                        <>
                          <IoCheckmarkCircleOutline size={11} /> متاحة
                        </>
                      )}
                    </span>
                    <div className="text-right">
                      <p className="text-omega-text-muted text-[10px] font-bold">رقم</p>
                      <strong className="text-white text-2xl font-black leading-none">
                        {table.number}
                      </strong>
                    </div>
                  </div>

                  <p className="text-white font-bold text-sm mb-1 truncate">
                    {table.name || `طاولة ${table.number}`}
                  </p>
                  <p className="text-omega-text-muted text-[11px] flex items-center gap-1 mb-3">
                    <IoPeopleOutline size={12} />
                    {table.capacity || 4} أشخاص
                  </p>

                  {tOrders.length > 0 && (
                    <p className="text-omega-orange text-[11px] font-bold mb-3 flex items-center gap-1">
                      <IoRestaurantOutline size={12} />
                      {tOrders.length} طلب نشط
                    </p>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(table)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-white/10"
                    >
                      <IoCreateOutline size={12} /> تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(table)}
                      className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${
                        inactive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-yellow-500/15 text-yellow-400'
                      }`}
                    >
                      {inactive ? 'تفعيل' : 'إيقاف'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(table)}
                      className="inline-flex items-center justify-center rounded-lg bg-red-500/10 px-2 py-1.5 text-red-400 hover:bg-red-500/20"
                      aria-label="حذف"
                    >
                      <IoTrashOutline size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-omega-dark border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-lg font-black">
                {editingId ? 'تعديل الطاولة' : 'طاولة جديدة'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full bg-white/5 p-2 text-white hover:bg-white/10"
                aria-label="إغلاق"
              >
                <IoClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-omega-text-muted text-xs font-bold mb-1.5 block">
                  رقم الطاولة *
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, number: e.target.value }))
                  }
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white font-bold outline-none focus:border-omega-orange/50"
                  required
                />
              </div>

              <div>
                <label className="text-omega-text-muted text-xs font-bold mb-1.5 block">
                  السعة (عدد الأشخاص)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, capacity: e.target.value }))
                  }
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white font-bold outline-none focus:border-omega-orange/50"
                />
              </div>

              <div>
                <label className="text-omega-text-muted text-xs font-bold mb-1.5 block">
                  اسم/تسمية (اختياري)
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder={`طاولة ${form.number || ''}`}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-omega-orange/50"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-l from-omega-orange to-omega-red py-3 text-white font-black text-sm shadow-lg shadow-omega-orange/25 disabled:opacity-60 active:scale-[0.98]"
              >
                {saving ? '...جاري الحفظ' : editingId ? 'حفظ التعديلات' : 'إضافة الطاولة'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
