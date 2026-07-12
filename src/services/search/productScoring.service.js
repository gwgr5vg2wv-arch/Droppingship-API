const DEFAULT_MARKUP_PERCENT = envNumber('DEFAULT_MARKUP_PERCENT', 70);
const MARKETPLACE_FEE_PERCENT = envNumber('MARKETPLACE_FEE_PERCENT', envNumber('DEFAULT_MARKETPLACE_FEE_PERCENT', 16));
const ADS_RESERVE_PERCENT = envNumber('ADS_RESERVE_PERCENT', 5);
const MINIMUM_PROFIT = envNumber('MINIMUM_PROFIT', 20);

export function calculateTotalCost(supplierPrice = 0, shippingPrice = 0) {
  return money(Math.max(0, Number(supplierPrice) || 0) + Math.max(0, Number(shippingPrice) || 0));
}

export function calculateSuggestedPrice({ supplierPrice = 0, shippingPrice = 0, markupPercent = DEFAULT_MARKUP_PERCENT, marketplaceFeePercent = MARKETPLACE_FEE_PERCENT, adsReservePercent = ADS_RESERVE_PERCENT, minimumProfit = MINIMUM_PROFIT } = {}) {
  const totalCost = calculateTotalCost(supplierPrice, shippingPrice);
  const markupPrice = totalCost * (1 + (Number(markupPercent) || 0) / 100);
  const minimumPrice = totalCost + Math.max(0, Number(minimumProfit) || 0);
  const feeMultiplier = 1 - ((Number(marketplaceFeePercent) || 0) + (Number(adsReservePercent) || 0)) / 100;
  const priceBeforeFees = Math.max(markupPrice, minimumPrice);
  const suggested = feeMultiplier > 0 ? priceBeforeFees / feeMultiplier : priceBeforeFees;
  return money(Math.max(suggested, totalCost));
}

export function calculateProfit({ supplierPrice = 0, shippingPrice = 0, suggestedPrice = 0, marketplaceFeePercent = MARKETPLACE_FEE_PERCENT, adsReservePercent = ADS_RESERVE_PERCENT } = {}) {
  const totalCost = calculateTotalCost(supplierPrice, shippingPrice);
  const salePrice = Math.max(Number(suggestedPrice) || 0, totalCost);
  const fees = salePrice * (((Number(marketplaceFeePercent) || 0) + (Number(adsReservePercent) || 0)) / 100);
  return money(Math.max(0, salePrice - totalCost - fees));
}

export function calculateRoi(estimatedProfit = 0, totalCost = 0) {
  const cost = Number(totalCost) || 0;
  if (cost <= 0) return 0;
  return money((Math.max(0, Number(estimatedProfit) || 0) / cost) * 100);
}

export function calculateTrendScore(product = {}) {
  const sold = Number(product.soldCount ?? product.soldQuantity ?? product.sold ?? 0) || 0;
  const rating = Number(product.rating ?? 0) || 0;
  const reviews = Number(product.reviewCount ?? 0) || 0;
  return clamp(Math.round(Math.min(100, sold / 8 + rating * 9 + reviews / 12 + 18)));
}

export function calculateOpportunityScore(product = {}) {
  const roi = Number(product.roi || 0);
  const trend = Number(product.trendScore || 0);
  const riskPenalty = { baixo: 4, medio: 16, alto: 32 }[product.riskLevel] || 14;
  const competitionPenalty = { baixa: 4, media: 14, alta: 28 }[product.competitionLevel] || 12;
  return clamp(Math.round(trend * 0.45 + Math.min(100, roi) * 0.45 - riskPenalty - competitionPenalty + 20));
}

export function calculateCompetitionLevel(product = {}) {
  const sold = Number(product.soldCount ?? product.soldQuantity ?? product.sold ?? 0) || 0;
  if (sold > 600) return 'alta';
  if (sold > 120) return 'media';
  return 'baixa';
}

export function calculateRiskLevel(product = {}) {
  const roi = Number(product.roi || 0);
  const deliveryDays = Number(product.deliveryDays || 0);
  const image = product.image || '';
  let risk = 0;
  if (roi < 20) risk += 35;
  if (deliveryDays > 14) risk += 25;
  if (!image) risk += 20;
  if (!product.url) risk += 10;
  if (risk >= 45) return 'alto';
  if (risk >= 20) return 'medio';
  return 'baixo';
}

export function scoreProduct(product = {}) {
  const hasCost = product.supplierPrice !== null && product.supplierPrice !== undefined;
  const shippingPrice = product.shippingPrice ?? 0;
  const totalCost = hasCost ? calculateTotalCost(product.supplierPrice, shippingPrice) : null;
  const suggestedPrice = hasCost
    ? (product.suggestedPrice && product.suggestedPrice >= totalCost
      ? money(product.suggestedPrice)
      : calculateSuggestedPrice({ supplierPrice: product.supplierPrice, shippingPrice }))
    : null;
  const estimatedProfit = hasCost ? calculateProfit({ supplierPrice: product.supplierPrice, shippingPrice, suggestedPrice }) : null;
  const roi = hasCost ? calculateRoi(estimatedProfit, totalCost) : null;
  const trendScore = product.trendScore ?? null;
  const competitionLevel = product.competitionLevel ?? null;
  const riskLevel = product.riskLevel ?? null;
  const opportunityScore = product.opportunityScore ?? null;

  return {
    totalCost,
    suggestedPrice,
    estimatedProfit,
    roi,
    trendScore,
    opportunityScore,
    competitionLevel,
    riskLevel,
    calculated: {
      suggestedPrice: hasCost && product.suggestedPrice == null,
      estimatedProfit: hasCost,
      roi: hasCost
    }
  };
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}
