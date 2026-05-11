import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAllOrders } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import AdminNav from '../components/AdminNav';
import { IoCar, IoCheckmarkCircle } from 'react-icons/io5';

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'driver'));
      const snap = await getDocs(q);
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrders(await getAllOrders());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-omega-dark lg:flex">
      <AdminNav />
      <main className="flex-1 pb-safe">
        <div className="max-w-4xl mx-auto px-4 pt-16 lg:pt-6">
          <h1 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <IoCar className="text-omega-orange" /> إدارة السائقين
          </h1>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🚗</div>
              <p className="text-omega-text-muted">لا يوجد سائقون مسجلون</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver, idx) => {
                const driverOrders = orders.filter(o => o.driverId === driver.id);
                const delivered = driverOrders.filter(o => o.status === 'delivered');
                const totalValue = delivered.reduce((s, o) => s + (o.totalPrice || 0), 0);
                const active = driverOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));

                return (
                  <div key={driver.id} className="glass rounded-2xl p-4 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{driver.name?.[0]}</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{driver.name}</h3>
                        <p className="text-omega-text-muted text-xs" dir="ltr">{driver.phone} • {driver.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-omega-dark/30 rounded-xl p-3 text-center">
                        <p className="text-omega-success font-black text-lg">{delivered.length}</p>
                        <p className="text-omega-text-muted text-[10px]">تم التوصيل</p>
                      </div>
                      <div className="bg-omega-dark/30 rounded-xl p-3 text-center">
                        <p className="text-omega-orange font-black text-lg">{active.length}</p>
                        <p className="text-omega-text-muted text-[10px]">نشطة</p>
                      </div>
                      <div className="bg-omega-dark/30 rounded-xl p-3 text-center">
                        <p className="text-omega-info font-black text-sm">{formatCurrency(totalValue)}</p>
                        <p className="text-omega-text-muted text-[10px]">إجمالي القيمة</p>
                      </div>
                    </div>

                    {/* آخر طلبات */}
                    {delivered.slice(0, 3).length > 0 && (
                      <div className="mt-3">
                        <p className="text-omega-text-muted text-xs mb-2">آخر التوصيلات</p>
                        {delivered.slice(0, 3).map(o => (
                          <div key={o.id} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                            <span className="text-omega-text">#{o.id?.slice(-6)} - {o.customerName}</span>
                            <span className="text-omega-orange">{formatCurrency(o.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
