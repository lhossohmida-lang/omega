import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAllOrders } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import {
  IoCar, IoCheckmarkCircle, IoCall, IoMail,
  IoStar, IoFlash, IoTrophy
} from 'react-icons/io5';

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

  // Top driver
  const topDriver = drivers
    .map(d => ({ ...d, deliveredCount: orders.filter(o => o.driverId === d.id && o.status === 'delivered').length }))
    .sort((a, b) => b.deliveredCount - a.deliveredCount)[0];

  return (
    <div className="admin-page">
      <AdminNav />
      <main className="admin-container">
          <AdminHeader title="السائقين" accent="إدارة" subtitle={`${drivers.length} سائق مسجل`} />

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-40" />)}</div>
          ) : drivers.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <div className="text-6xl mb-4">🚗</div>
              <p className="text-white font-bold mb-1">لا يوجد سائقون</p>
              <p className="text-omega-text-muted text-sm">لم يتم تسجيل أي سائق بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger">
              {drivers.map((driver) => {
                const driverOrders = orders.filter(o => o.driverId === driver.id);
                const delivered = driverOrders.filter(o => o.status === 'delivered');
                const driverRevenue = delivered.reduce((s, o) => s + (o.isDelivery ? (o.deliveryFee || 0) : 0), 0);
                const active = driverOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
                const isTop = topDriver?.id === driver.id && delivered.length > 0;

                return (
                  <div key={driver.id} className="card-premium p-5 relative overflow-hidden">
                    {isTop && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-bold shadow-lg">
                        <IoTrophy size={11} /> الأفضل
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-omega-orange to-omega-red flex items-center justify-center shadow-lg shadow-omega-orange/25">
                          <span className="text-white font-black text-xl">{driver.name?.[0] || 'S'}</span>
                        </div>
                        {active.length > 0 && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-omega-dark flex items-center justify-center animate-blink">
                            <span className="text-white text-[8px] font-bold">{active.length}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-black text-base truncate">{driver.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5 text-omega-text-muted text-[11px]">
                          <span className="flex items-center gap-1" dir="ltr"><IoCall size={10} /> {driver.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-omega-text-dim text-[10px] truncate" dir="ltr">
                          <IoMail size={10} /> {driver.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-center">
                        <IoCheckmarkCircle className="text-emerald-400 mx-auto mb-1" size={16} />
                        <p className="text-emerald-400 font-black text-base">{delivered.length}</p>
                        <p className="text-omega-text-dim text-[9px]">تم التوصيل</p>
                      </div>
                      <div className="bg-omega-orange/5 border border-omega-orange/15 rounded-xl p-3 text-center">
                        <IoFlash className="text-omega-orange mx-auto mb-1" size={16} />
                        <p className="text-omega-orange font-black text-base">{active.length}</p>
                        <p className="text-omega-text-dim text-[9px]">نشطة</p>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 text-center">
                        <IoStar className="text-blue-400 mx-auto mb-1" size={16} />
                        <p className="text-blue-400 font-black text-xs leading-tight pt-0.5">{formatCurrency(driverRevenue)}</p>
                        <p className="text-omega-text-dim text-[9px]">أرباح التوصيل</p>
                      </div>
                    </div>

                    {delivered.slice(0, 3).length > 0 && (
                      <div className="border-t border-white/5 pt-3">
                        <p className="text-omega-text-dim text-[10px] mb-2 font-bold">آخر التوصيلات</p>
                        {delivered.slice(0, 3).map(o => (
                          <div key={o.id} className="flex justify-between text-xs py-1">
                            <span className="text-omega-text">#{o.id?.slice(-6)} • {o.customerName}</span>
                            <span className="text-omega-orange font-bold">{formatCurrency(driverRevenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </main>
    </div>
  );
}
