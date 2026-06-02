import { useEffect, useMemo, useState } from 'react';
import {
  IoBagHandleOutline,
  IoCashOutline,
  IoReceiptOutline,
  IoRestaurantOutline,
  IoSearchOutline,
  IoTrendingDownOutline,
  IoTrendingUpOutline,
} from 'react-icons/io5';
import AdminHeader from '../components/AdminHeader';
import AdminNav from '../components/AdminNav';
import { getAllOrders } from '../services/orderService';
import { getAllIngredients, getAllIngredientPurchases, getAllStoreExpenses } from '../services/inventoryService';
import { formatCurrency, formatNumber } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import { calculateOrderProfit, isOrderPaid } from '../utils/calculateProfit';

function timestampMs(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function orderTypeLabel(order) {
  if (order.orderType === 'delivery') return 'توصيل';
  if (order.orderType === 'takeout') return 'يأخذه معه';
  return 'داخل المطعم';
}

function orderNumberLabel(order) {
  return order.orderNumber != null ? String(order.orderNumber).padStart(3, '0') : `#${order.id?.slice(-6) || '---'}`;
}

export default function AdminHistory() {
  const [orders, setOrders] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [ordersData, ingredientsData, purchasesData, expensesData] = await Promise.all([
          getAllOrders(),
          getAllIngredients(),
          getAllIngredientPurchases(),
          getAllStoreExpenses(),
        ]);
        if (!alive) return;
        setOrders(ordersData);
        setIngredients(ingredientsData);
        setPurchases(purchasesData);
        setExpenses(expensesData);
      } catch (error) {
        console.error(error);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    const salesRows = orders
      .filter(order => order.status !== 'cancelled')
      .map(order => {
        const paid = isOrderPaid(order);
        const paidAmount = Number(order.paidAmount ?? (paid ? order.totalPrice : 0)) || 0;
        const total = Number(order.totalPrice) || 0;
        return {
          id: `sale-${order.id}`,
          kind: 'sale',
          date: order.createdAt,
          amount: total,
          paidAmount,
          remainingAmount: Math.max(0, total - paidAmount),
          title: `طلب ${orderNumberLabel(order)} - ${orderTypeLabel(order)}`,
          note: (order.items || []).map(item => `${item.name} x${item.quantity || 1}`).join('، '),
          status: paid ? 'خالصة' : 'غير خالصة',
          tone: paid ? 'green' : 'red',
        };
      });

    const ingredientNames = new Map(ingredients.map(item => [item.id, item.name]));
    const purchaseRows = purchases.map(purchase => {
      const ingredientName = purchase.ingredientName || ingredientNames.get(purchase.ingredientId);
      return {
        id: `purchase-${purchase.id}`,
        kind: 'purchase',
        date: purchase.createdAt,
        amount: Number(purchase.totalCost) || ((Number(purchase.quantity) || 0) * (Number(purchase.unitPrice) || 0)),
        paidAmount: 0,
        remainingAmount: 0,
        title: ingredientName ? `شراء ${ingredientName}` : 'شراء مواد خام',
        note: [
          purchase.quantity ? `${formatNumber(purchase.quantity)} كمية` : '',
          purchase.note,
        ].filter(Boolean).join(' - '),
        status: 'مادة خام',
        tone: 'amber',
      };
    });

    const expenseRows = expenses.map(expense => ({
      id: `expense-${expense.id}`,
      kind: 'expense',
      date: expense.createdAt,
      amount: Number(expense.amount) || 0,
      paidAmount: 0,
      remainingAmount: 0,
      title: 'مصروف محل',
      note: expense.note || 'بدون ملاحظة',
      status: 'مصروف',
      tone: 'red',
    }));

    return [...salesRows, ...purchaseRows, ...expenseRows]
      .sort((a, b) => timestampMs(b.date) - timestampMs(a.date));
  }, [orders, ingredients, purchases, expenses]);

  const filteredRows = rows.filter(row => {
    if (filter !== 'all' && row.kind !== filter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${row.title} ${row.note} ${row.status}`.toLowerCase().includes(term);
  });

  const paidSales = orders.filter(order => order.status !== 'cancelled' && isOrderPaid(order));
  const totalSales = paidSales.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
  const totalProfit = paidSales.reduce((sum, order) => sum + calculateOrderProfit(order).profit, 0);
  const totalPurchases = purchases.reduce((sum, purchase) => {
    const value = Number(purchase.totalCost);
    return sum + (Number.isFinite(value) ? value : ((Number(purchase.quantity) || 0) * (Number(purchase.unitPrice) || 0)));
  }, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const unpaidDebt = orders
    .filter(order => order.status !== 'cancelled' && !isOrderPaid(order))
    .reduce((sum, order) => sum + Math.max(0, (Number(order.totalPrice) || 0) - (Number(order.paidAmount) || 0)), 0);
  const net = totalProfit - totalPurchases - totalExpenses;

  const summary = [
    { label: 'المبيعات الخالصة', value: formatCurrency(totalSales), icon: IoTrendingUpOutline, tone: 'green' },
    { label: 'فائدة بعد المصاريف', value: formatCurrency(net), icon: IoCashOutline, tone: net >= 0 ? 'green' : 'red' },
    { label: 'مواد خام', value: formatCurrency(totalPurchases), icon: IoRestaurantOutline, tone: 'amber' },
    { label: 'مصاريف المحل', value: formatCurrency(totalExpenses), icon: IoTrendingDownOutline, tone: 'red' },
    { label: 'ديون غير خالصة', value: formatCurrency(unpaidDebt), icon: IoReceiptOutline, tone: 'red' },
  ];

  return (
    <div className="admin-page">
      <AdminNav />
      <main className="admin-container">
        <AdminHeader title="التاريخي" accent="السجل" subtitle="كل المبيعات والمصاريف منذ بداية التطبيق" />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(item => <div key={item} className="skeleton h-24" />)}
          </div>
        ) : (
          <>
            <section className="history-summary-grid">
              {summary.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className={`history-summary-card ${tone}`}>
                  <Icon size={24} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>

            <section className="history-toolbar">
              <div className="history-search">
                <IoSearchOutline size={20} />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="ابحث في السجل"
                />
              </div>
              <div className="history-filters">
                {[
                  ['all', 'الكل'],
                  ['sale', 'المبيعات'],
                  ['purchase', 'المواد الخام'],
                  ['expense', 'المصاريف'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={filter === key ? 'active' : ''}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="history-list">
              {filteredRows.length === 0 ? (
                <div className="omega-empty-state">
                  <strong>لا توجد بيانات في السجل</strong>
                  <p>ستظهر هنا المبيعات والمصاريف والمواد الخام بعد تسجيلها.</p>
                </div>
              ) : filteredRows.map(row => (
                <article key={row.id} className={`history-row ${row.tone}`}>
                  <div className="history-row-icon">
                    {row.kind === 'sale' ? <IoBagHandleOutline /> : row.kind === 'purchase' ? <IoRestaurantOutline /> : <IoReceiptOutline />}
                  </div>
                  <div className="history-row-main">
                    <div>
                      <strong>{row.title}</strong>
                      <span>{formatDateTime(row.date)}</span>
                    </div>
                    <p>{row.note}</p>
                    {row.kind === 'sale' ? (
                      <small>
                        مدفوع {formatCurrency(row.paidAmount)} - متبقي {formatCurrency(row.remainingAmount)}
                      </small>
                    ) : null}
                  </div>
                  <div className="history-row-amount">
                    <span>{row.status}</span>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
