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
