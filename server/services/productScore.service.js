import { round } from './margin.service.js';

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function levelFromScore(score, labels = ['baixo', 'medio', 'alto']) {
  if (score >= 70) return labels[2];
  if (score >= 40) return labels[1];
  return labels[0];
}

function buildRecommendation({ finalScore, riskLevel, competitionLevel }) {
  if (riskLevel === 'alto') {
    return 'Margem interessante, mas risco alto. Testar com baixo investimento e anunciar apenas se conseguir frete rapido.';
  }

  if (finalScore >= 85) {
    return 'Excelente oportunidade: forte demanda, lucro e entrega equilibrados. Investir em anuncio e liderar preco.';
  }

  if (finalScore >= 70) {
    return 'Produto com bom potencial. Destaque entrega rapida e proposta de valor no anuncio.';
  }

  return 'Razoavel, mas merece validacao adicional de concorrencia e prazo antes de publicar.';
}

export function calculateProductScore(product = {}) {
  const sold = Number(product.sold || 0);
  const roi = Number(product.roi || 0);
  const shippingCost = Number(product.shippingCost || 0);
  const deliveryDays = Number(product.deliveryDays || 0);
  const price = Number(product.suggestedPrice || product.supplierPrice || 0);
  const rating = Number(product.rating || 4);

  const trendScore = clamp(Math.round(Math.min(100, sold / 3 + rating * 8 + 10)));
  const profitScore = clamp(Math.round(Math.min(100, roi * 0.95 + 10)));
  const deliveryScore = clamp(Math.round(100 - deliveryDays * 4 - shippingCost * 1.5 + (shippingCost === 0 ? 12 : 0)));
  const competitionScore = clamp(Math.round(100 - Math.min(80, sold / 3 + (price < 80 ? 12 : 6))));

  let riskPoints = 0;
  if (price > 0 && price < 30) riskPoints += 20;
  if (sold === 0) riskPoints += 35;
  if (deliveryDays > 14) riskPoints += 18;
  if (roi < 15) riskPoints += 15;
  if (shippingCost > 15) riskPoints += 10;

  const riskScore = clamp(round(riskPoints));
  const finalScore = clamp(Math.round(trendScore * 0.4 + profitScore * 0.3 + deliveryScore * 0.15 + competitionScore * 0.15));
  const competitionLevel = levelFromScore(competitionScore, ['baixa', 'media', 'alta']);
  const riskLevel = levelFromScore(riskScore, ['baixo', 'medio', 'alto']);
  const recommendation = buildRecommendation({ finalScore, riskLevel, competitionLevel });

  return {
    trendScore,
    profitScore,
    deliveryScore,
    competitionScore,
    riskScore,
    finalScore,
    competitionLevel,
    riskLevel,
    recommendation
  };
}
