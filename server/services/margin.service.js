export function calculateMargin({ supplierPrice, shippingCost, suggestedPrice, marketplaceFeePercent = 14 }) {
  const revenue = Number(suggestedPrice);
  const cost = Number(supplierPrice) + Number(shippingCost);
  const fee = revenue * (Number(marketplaceFeePercent) / 100);
  const profit = revenue - cost - fee;
  const roi = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    revenue: round(revenue),
    cost: round(cost),
    fee: round(fee),
    profit: round(profit),
    roi: round(roi)
  };
}

export function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
