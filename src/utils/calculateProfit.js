// حساب الفائدة لطلب واحد
// profit = totalPrice - totalCost
export function calculateOrderProfit(order) {
  const totalCost = (order.items || []).reduce((sum, item) => {
    return sum + ((item.costPrice || 0) * (item.quantity || 1));
  }, 0);
  const totalPrice = order.totalPrice || 0;
  return {
    totalCost,
    totalPrice,
    profit: totalPrice - totalCost
  };
}

// حساب الفائدة لمنتج واحد
// productProfit = price - costPrice
export function calculateProductProfit(product) {
  return (product.price || 0) - (product.costPrice || 0);
}

// حساب إجمالي الفائدة لمجموعة طلبات
export function calculateTotalProfit(orders) {
  return orders.reduce((total, order) => {
    const { profit } = calculateOrderProfit(order);
    return total + profit;
  }, 0);
}

export function isOrderPaid(order) {
  if (!order) return false;
  if (order.paymentStatus === 'unpaid') return false;
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') return true;
  if (order.isPaid === true || order.paid === true) return true;
  return (order.paymentMethod === 'ccp' || order.paymentMethod === 'card') && order.paymentStatus !== 'unpaid';
}

export function isFinancialOrder(order) {
  return isOrderPaid(order) && order.status !== 'cancelled';
}

export function getOrderFinancialDate(order) {
  return order?.paidAt || order?.paymentCompletedAt || order?.createdAt;
}

export function isFinancialOrderInDate(order, dateFilter = () => true) {
  return isFinancialOrder(order) && dateFilter(getOrderFinancialDate(order));
}

export function calculateIngredientPurchasesCost(purchases = [], dateFilter = () => true) {
  return purchases.reduce((total, purchase) => {
    if (!dateFilter(purchase.createdAt)) return total;
    const totalCost = Number(purchase.totalCost);
    if (Number.isFinite(totalCost)) return total + totalCost;
    return total + ((Number(purchase.quantity) || 0) * (Number(purchase.unitPrice) || 0));
  }, 0);
}

export function calculateStoreExpensesCost(expenses = [], dateFilter = () => true) {
  return expenses.reduce((total, expense) => {
    if (!dateFilter(expense.createdAt)) return total;
    return total + (Number(expense.amount) || 0);
  }, 0);
}

export function calculateOperatingCosts({ ingredientPurchases = [], expenses = [] } = {}, dateFilter = () => true) {
  const ingredientsCost = calculateIngredientPurchasesCost(ingredientPurchases, dateFilter);
  const expensesCost = calculateStoreExpensesCost(expenses, dateFilter);
  return {
    ingredientsCost,
    expensesCost,
    total: ingredientsCost + expensesCost,
  };
}
