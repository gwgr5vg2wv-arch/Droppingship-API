import { getTrendsMode } from './integrationMode.service.js';
import { categoryImage, normalizeProduct } from './productNormalization.service.js';

const categories = [
  'Mais buscados agora',
  'Produtos virais',
  'Baixa concorrencia',
  'Alta margem',
  'Entrega rapida BR'
];

export async function getTrendingProducts() {
  const mode = getTrendsMode();
  const products = categories.flatMap((category, index) => makeTrendItems(category, index));
  const strong = products.filter((item) => item.trendScore >= 82 && item.roi >= 45);
  const averageRoi = average(products.map((item) => item.roi));
  const estimatedProfit = products.reduce((sum, item) => sum + Number(item.estimatedProfit || 0), 0);
  return {
    source: mode === 'mock' ? 'mock' : 'hybrid',
    fallbackUsed: mode !== 'mock',
    fallbackReason: mode !== 'mock' ? 'auth_required' : null,
    mode,
    summary: {
      analyzed: products.length,
      strongOpportunities: strong.length,
      averageRoi: Math.round(averageRoi * 100) / 100,
      estimatedProfit: Math.round(estimatedProfit * 100) / 100,
      risingTrends: products.filter((item) => item.trendScore >= 80).length
    },
    products,
    categories: categories.map((category, index) => ({
      category,
      image: categoryImage(category),
      items: makeTrendItems(category, index)
    }))
  };
}

function makeTrendItems(category, categoryIndex) {
  const titles = [
    ['Fone bluetooth compacto', 'Mini camera Wi-Fi', 'Garrafa termica premium'],
    ['Luminaria por sensor', 'Bolsa organizadora viral', 'Massageador portatil'],
    ['Kit cozinha dobravel', 'Suporte notebook slim', 'Organizador de cabos'],
    ['Smartwatch fitness', 'Escova secadora compacta', 'Projetor mini LED'],
    ['Copo termico inox', 'Capinha anti-impacto', 'Carregador veicular rapido']
  ][categoryIndex];

  return titles.map((title, index) => normalizeProduct({
    id: `TREND-${categoryIndex}-${index}`,
    title,
    category,
    source: 'mock',
    mode: 'mock',
    image: categoryImage(title),
    demandScore: 82 + categoryIndex * 2 + index,
    trendScore: 74 + categoryIndex * 4 + index * 3,
    supplierPrice: 31.9 + categoryIndex * 11 + index * 7,
    shippingPrice: index % 2 === 0 ? 0 : 12.9,
    salePrice: 59.9 + categoryIndex * 22 + index * 13,
    estimatedProfit: 24.5 + categoryIndex * 7 + index * 4.2,
    roi: 38 + categoryIndex * 8 + index * 5,
    rating: 4.2 + index * 0.18,
    soldQuantity: 120 + categoryIndex * 80 + index * 46,
    deliveryDays: 4 + index * 2 + categoryIndex,
    competitionLevel: ['baixa', 'media', 'alta'][(categoryIndex + index) % 3],
    riskLevel: ['baixo', 'medio', 'alto'][index % 3],
    reason: trendReason(category),
    generatedDescription: trendReason(category),
    searchVolumeLabel: ['alto', 'medio', 'em crescimento'][(categoryIndex + index) % 3],
    tags: ['tendencia', 'margem', category.toLowerCase().replace(/\s+/g, '-')],
    isFallback: true
  }, 'mock'));
}

function trendReason(category) {
  return {
    'Mais buscados agora': 'Procura simulada alta e boa aderencia para testes rapidos.',
    'Produtos virais': 'Produto com apelo visual forte para conteudo curto.',
    'Baixa concorrencia': 'Menos ofertas simuladas disputando o mesmo publico.',
    'Alta margem': 'Diferenca saudavel entre custo estimado e preco medio.',
    'Entrega rapida BR': 'Promessa operacional mais simples para cliente final.'
  }[category];
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}
